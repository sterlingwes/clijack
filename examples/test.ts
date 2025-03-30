import { CommandWrapper } from "../src";
import path from "path";

async function main() {
  const wrapper = new CommandWrapper();

  // Spawn our interactive CLI process
  const process = wrapper.spawn({
    command: path.join(__dirname, "cli.sh"),
    args: [],
    menuMatcher: {
      pattern: /Press a key to continue/,
      insertPosition: "after",
    },
  });

  // Register shortcuts for common actions
  const removeShortcuts = [
    process.registerShortcut({
      key: "s",
      handler: () => {
        console.log("\nStarting server...");
        process.stdin.write("1");
      },
      description: "Start server",
    }),
    process.registerShortcut({
      key: "c",
      handler: () => {
        console.log("\nChecking status as shortcut...");
        process.stdin.write("2");
      },
      description: "Check status",
    }),
    process.registerShortcut({
      key: "l",
      handler: () => {
        console.log("\nShowing logs...");
        process.stdin.write("3");
      },
      description: "Show logs",
    }),
  ];

  // Register an output matcher to detect server start
  const removeMatcher = process.registerOutputMatcher({
    pattern: /Server started successfully/,
    eventName: "serverStarted",
    context: {
      linesBefore: 2,
      linesAfter: 2,
    },
  });

  // Listen for server start event
  process.on("serverStarted", (data) => {
    console.log("\nServer started!");
    console.log("Context:", data.context);
  });

  // Wait for the process to exit
  await process.waitForExit();
}

main().catch(console.error);
