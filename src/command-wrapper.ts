import { IPty, spawn } from "node-pty";
import { CommandConfig, WrappedProcess } from "./types";
import { WrappedProcessImpl } from "./wrapped-process";

// ANSI escape codes for alternate screen buffer
const enterAltScreen = "\x1b[?1049h";
const exitAltScreen = "\x1b[?1049l";
const clearScreen = "\x1b[2J\x1b[0;0H";
const ctrlC = "\u0003";
const backspaceKey = "\b";
const deleteKey = "\u007f";
const carriageReturn = "\r";
const linebreak = "\n";

export class CommandWrapper {
  private processes: Map<string, WrappedProcessImpl> = new Map();
  private interactiveProcess: WrappedProcessImpl | null = null;
  private isTakingOver = false;
  private takeoverInputHandler: ((data: string) => void) | null = null;

  constructor() {
    // Set up raw mode for stdin to handle keypresses
    process.stdin.setRawMode?.(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();

    // Handle input from parent process
    process.stdin.on("data", (data: Buffer) => {
      const key = data.toString();

      // Handle Ctrl+C for process cleanup
      if (key === "\u0003") {
        this.killAll();
        process.exit();
      }

      if (this.isTakingOver && this.takeoverInputHandler) {
        this.takeoverInputHandler(key);
        return;
      }

      // Forward input to interactive process if exists
      if (this.interactiveProcess) {
        // Check if this is a registered shortcut
        const shortcut = this.interactiveProcess.getShortcut(key);
        if (shortcut) {
          shortcut.handler();
        } else {
          // If not a shortcut, forward to the process
          this.interactiveProcess.pty.write(key);
        }
      }
    });
  }

  spawn(config: CommandConfig): WrappedProcess {
    const ptyProcess = spawn(config.command, config.args ?? [], {
      name: "xterm-color",
      cols: process.stdout.columns,
      rows: process.stdout.rows,
      cwd: process.cwd(),
      env: process.env as { [key: string]: string },
    });

    const wrappedProcess = new WrappedProcessImpl(ptyProcess, config);
    this.processes.set(ptyProcess.pid.toString(), wrappedProcess);

    // Listen for interactive event
    wrappedProcess.on("interactive", () => {
      this.interactiveProcess = wrappedProcess;
    });

    // Handle process cleanup
    ptyProcess.onExit(() => {
      if (this.interactiveProcess === wrappedProcess) {
        // Find the most recently spawned process that is interactive
        this.interactiveProcess =
          Array.from(this.processes.values())
            .filter((p) => p !== wrappedProcess && p.isInteractiveProcess())
            .pop() ?? null;
      }
      this.processes.delete(ptyProcess.pid.toString());
    });

    return wrappedProcess;
  }

  killAll(): void {
    for (const process of this.processes.values()) {
      process.kill();
    }
    // Reset stdin handling
    process.stdin.setRawMode?.(false);
    process.stdin.pause();
  }

  async withFullscreenPrompt<T>(
    render: (api: {
      write: (data: string) => void;
      onInput: (
        handler: (data: string) => void,
        options?: { resolveOnEnter?: boolean }
      ) => void;
      promptInput: () => Promise<string>;
      resolve: (value: T) => void;
    }) => void
  ): Promise<T> {
    if (!this.interactiveProcess) {
      throw new Error(
        "Cannot take over output without an interactive process."
      );
    }

    this.isTakingOver = true;
    this.interactiveProcess.suspendOutput();

    return new Promise<T>((resolve) => {
      const cleanup = (value: T) => {
        process.stdout.write(exitAltScreen);
        this.takeoverInputHandler = null;
        this.interactiveProcess?.resumeOutput();
        this.isTakingOver = false;
        resolve(value);
      };

      process.stdout.write(enterAltScreen);
      process.stdout.write(clearScreen);

      let inputBuffer = "";

      const setInputHandler = (
        handler: (data: string) => void,
        options?: { resolveOnEnter?: boolean }
      ) => {
        if (!options?.resolveOnEnter) {
          this.takeoverInputHandler = (key: string) => handler(key);
        } else {
          this.takeoverInputHandler = (key: string) => {
            if (key === carriageReturn) {
              process.stdout.write(linebreak);
              handler(inputBuffer);
              inputBuffer = "";
              this.takeoverInputHandler = null;
            } else if (key === ctrlC) {
              cleanup(Promise.reject(new Error("Cancelled")) as any);
            } else if (key === deleteKey || key === backspaceKey) {
              // Handle backspaces by amending buffer
              if (inputBuffer.length > 0) {
                inputBuffer = inputBuffer.slice(0, -1);
                process.stdout.write("\b \b");
              }
            } else if (key.length === 1 && key >= " ") {
              inputBuffer += key;
              process.stdout.write(key);
            }
          };
        }
      };

      const awaitableInputHandler = () => {
        return new Promise<string>((resolve) => {
          setInputHandler((data: string) => {
            resolve(data);
            inputBuffer = "";
          });
        });
      };

      try {
        render({
          write: (data: string) => process.stdout.write(data),
          onInput: setInputHandler,
          promptInput: awaitableInputHandler,
          resolve: (value: T) => cleanup(value),
        });
      } catch (error) {
        cleanup(Promise.reject(error) as any);
      }
    });
  }
}
