import { IPty } from "node-pty";
import { EventEmitter } from "events";
import {
  CommandConfig,
  WrappedProcess,
  ShortcutConfig,
  OutputMatcher,
  MatchData,
} from "./types";

const maxBufferSize = 100;
const defaultShortcutMenuOptions = {
  title: "Available shortcuts:",
  optionPrefix: "  ",
};

export class WrappedProcessImpl extends EventEmitter implements WrappedProcess {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private outputMatchers: Map<RegExp, OutputMatcher> = new Map();
  private readonly outputBuffer: string[] = [];
  private readonly pendingMatches: {
    matcher: OutputMatcher;
    match: string;
    index: number;
  }[] = [];
  private exitPromise: Promise<void> | null = null;
  private exitResolve: (() => void) | null = null;
  readonly pty: IPty;
  protected config: CommandConfig;
  private isInteractive: boolean = false;

  constructor(ptyProcess: IPty, config: CommandConfig) {
    super();
    this.pty = ptyProcess;
    this.config = config;

    this.exitPromise = new Promise((resolve) => {
      this.exitResolve = resolve;
    });

    this.pty.onExit(() => {
      for (const pending of this.pendingMatches) {
        const context = this.getContext(pending.matcher.context, pending.index);
        this.emit(pending.matcher.eventName, {
          match: [pending.match],
          context,
        });
      }
      this.pendingMatches.length = 0;
      this.exitResolve?.();
    });

    this.setupOutputHandling();
  }

  kill(signal?: string): void {
    this.pty.kill(signal);
  }

  on(event: "exit" | string, handler: (data: MatchData) => void): this {
    super.on(event, handler);
    return this;
  }

  registerShortcut(config: ShortcutConfig): () => void {
    this.shortcuts.set(config.key, config);
    return () => this.shortcuts.delete(config.key);
  }

  getShortcut(key: string): ShortcutConfig | undefined {
    return this.shortcuts.get(key);
  }

  registerOutputMatcher(config: OutputMatcher): () => void {
    this.outputMatchers.set(config.pattern, config);
    return () => this.outputMatchers.delete(config.pattern);
  }

  waitForExit(): Promise<void> {
    return this.exitPromise ?? Promise.resolve();
  }

  private setupOutputHandling(): void {
    this.pty.onData((data) => {
      process.stdout.write(data);
      const output = data.toString();
      const lines = output.split(/\r?\n/);

      for (const line of lines) {
        if (!line.trim()) continue;

        this.outputBuffer.push(line);
        if (this.outputBuffer.length > maxBufferSize) {
          this.outputBuffer.shift();
          for (const pending of this.pendingMatches) {
            pending.index = Math.max(0, pending.index - 1);
          }
        }

        if (this.config.menuMatcher?.pattern.test(line)) {
          this.isInteractive = true;
          this.emit("interactive", {
            match: [line] as RegExpMatchArray,
            context: { before: [], after: [], fullMatch: line },
          });
          this.printShortcutsMenu();
        }

        for (const [pattern, matcher] of this.outputMatchers.entries()) {
          const match = line.match(pattern);
          if (match) {
            if (matcher.context?.linesAfter) {
              const linesAfter = matcher.context.linesAfter;
              if (this.outputBuffer.length + linesAfter <= maxBufferSize) {
                this.pendingMatches.push({
                  matcher,
                  match: match[0],
                  index: this.outputBuffer.length - 1,
                });
              } else {
                console.warn(
                  `Warning: Skipping match for ${matcher.eventName} - requested ${linesAfter} lines of after context but only ${maxBufferSize - this.outputBuffer.length} lines available in buffer`
                );
              }
            } else {
              const context = this.getContext(matcher.context);
              this.emit(matcher.eventName, { match, context });

              if (matcher.once) {
                this.outputMatchers.delete(pattern);
              }
            }
          }
        }
      }

      this.checkPendingMatches();
    });
  }

  private checkPendingMatches(): void {
    const currentIndex = this.outputBuffer.length - 1;
    for (let i = this.pendingMatches.length - 1; i >= 0; i--) {
      const pending = this.pendingMatches[i];
      const linesAfter = pending.matcher.context?.linesAfter ?? 0;
      const hasEnoughContext = currentIndex - pending.index >= linesAfter;

      if (hasEnoughContext) {
        const context = this.getContext(pending.matcher.context);
        this.emit(pending.matcher.eventName, {
          match: [pending.match],
          context,
        });
        this.pendingMatches.splice(i, 1);
      }
    }
  }

  private getContext(
    config?: OutputMatcher["context"],
    matchIndex?: number
  ): MatchData["context"] {
    const before = config?.linesBefore ?? 0;
    const after = config?.linesAfter ?? 0;
    const totalContext = before + after;

    if (totalContext > maxBufferSize) {
      console.warn(
        `Warning: Requested ${totalContext} total lines of context (${before} before, ${after} after) but buffer only retains ${maxBufferSize} lines`
      );
    }

    const currentIndex = matchIndex ?? this.outputBuffer.length - 1;
    const startIndex = Math.max(0, currentIndex - before);
    const endIndex = Math.min(
      this.outputBuffer.length,
      currentIndex + after + 1
    );

    return {
      before: this.outputBuffer.slice(startIndex, currentIndex),
      after: this.outputBuffer.slice(currentIndex + 1, endIndex),
      fullMatch: this.outputBuffer[currentIndex],
    };
  }

  emit(event: string, data: MatchData): boolean {
    return super.emit(event, data);
  }

  isInteractiveProcess(): boolean {
    return this.isInteractive;
  }

  private printShortcutsMenu(): void {
    if (this.shortcuts.size === 0 || !this.config.shortcutMenu) return;

    let format = this.config.shortcutMenu;
    if (format === true) {
      format = defaultShortcutMenuOptions;
    }

    const title = format.title ?? defaultShortcutMenuOptions.title;
    const optionPrefix =
      format.optionPrefix ?? defaultShortcutMenuOptions.optionPrefix;

    const menuText = [
      `\n${title}`,
      ...Array.from(this.shortcuts.entries()).map(
        ([key, config]) => `${optionPrefix}${key}: ${config.description}`
      ),
      "",
    ].join("\n");

    if (this.config.menuMatcher?.insertPosition === "before") {
      process.stdout.write(menuText);
    } else {
      console.log(menuText);
    }
  }
}
