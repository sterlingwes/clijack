import { ChildProcess } from "child_process";
import { Readable, Writable } from "stream";
import { EventEmitter } from "events";
import {
  CommandConfig,
  WrappedProcess,
  ShortcutConfig,
  OutputMatcher,
  MatchData,
} from "./types";

export class WrappedProcessImpl extends EventEmitter implements WrappedProcess {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private outputMatchers: Map<RegExp, OutputMatcher> = new Map();
  private outputBuffer: string[] = [];
  private exitPromise: Promise<void> | null = null;
  private exitResolve: (() => void) | null = null;
  private childProcess: ChildProcess;
  protected config: CommandConfig;
  private isInteractive: boolean = false;

  constructor(childProcess: ChildProcess, config: CommandConfig) {
    super();
    this.childProcess = childProcess;
    this.config = config;

    this.exitPromise = new Promise((resolve) => {
      this.exitResolve = resolve;
    });

    this.childProcess.on("exit", () => {
      this.exitResolve?.();
    });

    this.childProcess.on("error", (error) => {
      super.emit("error", {
        match: [error.message] as RegExpMatchArray,
        context: { before: [], after: [], fullMatch: error.message },
      });
    });

    this.setupOutputHandling();
  }

  get stdout(): Readable {
    return this.childProcess.stdout as Readable;
  }

  get stderr(): Readable {
    return this.childProcess.stderr as Readable;
  }

  get stdin(): Writable {
    return this.childProcess.stdin as Writable;
  }

  kill(signal?: NodeJS.Signals): void {
    this.childProcess.kill(signal);
  }

  on(
    event: "error" | "exit" | string,
    handler: (data: MatchData) => void
  ): this {
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
    if (!this.childProcess.stdout || !this.childProcess.stderr) return;

    this.childProcess.stdout.pipe(process.stdout);
    this.childProcess.stderr.pipe(process.stderr);

    const handleOutput = (data: Buffer, isError: boolean) => {
      const output = data.toString();
      const lines = output.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        this.outputBuffer.push(line);
        if (this.outputBuffer.length > 100) {
          this.outputBuffer.shift();
        }

        if (this.config.menuMatcher?.pattern.test(line)) {
          this.isInteractive = true;
          this.emit("interactive", {
            match: [line] as RegExpMatchArray,
            context: { before: [], after: [], fullMatch: line },
          });
        }

        for (const [pattern, matcher] of this.outputMatchers.entries()) {
          const match = line.match(pattern);
          if (match) {
            const context = this.getContext(matcher.context);
            this.emit(matcher.eventName, { match, context });

            if (matcher.once) {
              this.outputMatchers.delete(pattern);
            }
          }
        }
      }
    };

    this.childProcess.stdout.on("data", (data) => handleOutput(data, false));
    this.childProcess.stderr.on("data", (data) => handleOutput(data, true));
  }

  private getContext(config?: OutputMatcher["context"]): MatchData["context"] {
    const before = config?.linesBefore ?? 0;
    const after = config?.linesAfter ?? 0;
    const maxSize = config?.maxBufferSize ?? 100;

    const currentIndex = this.outputBuffer.length - 1;
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
}
