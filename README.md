# CLI•jack

clijack is a tool for wrapping and enhancing other command-line tools with custom shortcuts, and handling their output.

## Features

- Register process-specific keyboard shortcuts for interactive commands
- Spawn and manage multiple concurrent command processes
- Match and react to command output with context
- Handle interactive command input
- Preserve terminal output and colors
- Graceful process management and cleanup

## Installation

```bash
npm install clijack
```

## Usage

The initial use case for this library was to wrap [Expo](https://expo.dev)'s start CLI, which has interactive elements, with extended use cases applicable to a team using it. Some of the examples noted here reference this.

### Basic Setup

```typescript
import { CommandWrapper } from "clijack";

const wrapper = new CommandWrapper();

// Spawn some concurrent build processes
const [iosBuild, androidBuild] = await Promise.all([
  wrapper.spawn({
    command: "eas",
    args: ["build:run", "--id", "ios-build-id"],
  }),
  wrapper.spawn({
    command: "eas",
    args: ["build:run", "--id", "android-build-id"],
  }),
]);

// Wait for builds to complete
await Promise.all([iosBuild.waitForExit(), androidBuild.waitForExit()]);

// Start the interactive bundler (don't await this)
const bundler = wrapper.spawn({
  command: "expo",
  args: ["start"],
  menuMatcher: {
    pattern: /Press .* to show more/,
    insertPosition: "after",
  },
});

// Register shortcuts specific to this interactive process
const removeShortcut = bundler.registerShortcut({
  key: "b",
  handler: () => {
    // Handle shortcut
  },
  description: "Build iOS simulator build",
});

// Register output matcher for this process
const removeMatcher = bundler.registerOutputMatcher({
  pattern: /Build completed successfully/,
  eventName: "buildComplete",
  context: {
    linesBefore: 5,
    linesAfter: 5,
  },
});

// Clean up on exit
process.on("SIGINT", () => {
  wrapper.killAll();
  process.exit(0);
});
```

### Interactive Command Handling

The library can handle interactive commands by forwarding unmatched keyboard input to the underlying process:

```typescript
const wrapper = new CommandWrapper();

// Start an interactive process
const process = wrapper.spawn({
  command: "expo",
  args: ["start"],
  menuMatcher: {
    pattern: /Press .* to show more/,
    insertPosition: "after", // Insert our shortcuts after the command's menu
  },
});

// Register shortcuts that will appear in the command's menu
const removeShortcut = process.registerShortcut({
  key: "i",
  handler: () => {
    // Handle shortcut
  },
  description: "Start interactive Expo development server",
});

// Any keyboard input not matching a registered shortcut will be forwarded to the process
```

### Output Matching with Context

You can match command output and receive context around the match:

```typescript
const wrapper = new CommandWrapper();

const process = wrapper.spawn({
  command: "expo",
  args: ["doctor"],
});

const removeMatcher = process.registerOutputMatcher({
  pattern: /Found (\d+) issues/,
  eventName: "issuesFound",
  context: {
    linesBefore: 10,
    linesAfter: 10,
  },
});

process.on("issuesFound", (data) => {
  const issueCount = data.match[1];
  console.log(`Found ${issueCount} issues:`);
  console.log("Context before:", data.context.before);
  console.log("Context after:", data.context.after);
});
```

### Full screen prompt takeover

You can temporarily take over the terminal for custom prompts:

```typescript
const wrapper = new CommandWrapper();

const process = wrapper.spawn({
  command: "expo",
  args: ["start"],
});

process.registerShortcut({
  key: "t",
  handler: async () => {
    // Enter takeover mode (alternate screen)
    const name = await wrapper.withFullscreenPrompt<string>((api) => {
      api.write("What is your name?\n");
      let input = "";
      api.onInput((key) => {
        if (key === "\r") {
          api.resolve(input); // Finish takeover and return value
        } else {
          input += key;
          api.write(key); // Echo input
        }
      });
    });
    console.log(`\nUser's name is: ${name}`);
  },
  description: "Take over output",
});
```

The `onInput` handler is called for each input in a sequence like for each key press. If you only care about the final result after a user hits Enter you can simplify:

```typescript
const nameAndFeelings = await wrapper.withFullscreenPrompt<string>(
  async (api) => {
    api.write("What is your name?\n");
    const name = await api.promptInput();
    api.write(`Hello ${name}, how are you today?\n`);
    const feelings = await api.promptInput();
    api.resolve({ name, feelings });
  }
);
```

**How it works:**

- When `withFullscreenPrompt` is called, clijack switches to the alternate screen buffer and captures all input.
- Your handler receives an `api` object with:
  - `write(text: string)`: Write output to the terminal.
  - `onInput(handler: (data: string) => void)`: Listen for input events (ie. individual key presses).
  - `resolve(value: T)`: Exit takeover mode and return a value.
- While in takeover mode, keyboard input and output are isolated from the underlying process.

See the API docs

## API Reference

### CommandWrapper

The main class for managing command processes.

#### Methods

- `spawn(config: CommandConfig): WrappedProcess`
  - Spawn a new command process
  - `config.command`: The command to execute
  - `config.args`: Command arguments
  - `config.menuMatcher`: Optional configuration for interactive menu integration
    - `pattern`: Regex to match when command shows its menu
    - `insertPosition`: Where to insert our shortcuts ('before' or 'after')

- `killAll(): void`
  - Kill all spawned processes

### WrappedProcess

Represents a spawned command process.

#### Methods

- `registerShortcut(config: ShortcutConfig): () => void`
  - Register a shortcut for this process
  - Returns a function to remove the shortcut
  - `config.key`: The key to trigger the shortcut
  - `config.shift`: Whether to require SHIFT key
  - `config.handler`: Function to execute when shortcut is triggered
  - `config.description`: Optional description for help/UI

- `registerOutputMatcher(config: OutputMatcher): () => void`
  - Register an output matcher
  - Returns a function to remove the matcher
  - `config.pattern`: Regex to match against output
  - `config.eventName`: Name of event to emit on match
  - `config.context`: Optional context configuration
  - `config.once`: Whether to remove matcher after first match

- `on(event: string, handler: (data: MatchData) => void): void`
  - Listen for events (including output matcher events)

- `kill(signal?: string): void`
  - Kill the process

- `waitForExit(): Promise<void>`
  - Wait for the process to complete
  - Returns a promise that resolves when the process exits

## Contributing

### Tests

The tests run against scenarios under the examples folder. You can run the scenarios manually for interactive testing and via the jest-based test harness.

## Requirements

- Node.js v20 or higher
- TypeScript 4.0 or higher

## License

MIT
