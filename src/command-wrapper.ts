import { spawn, ChildProcess } from "child_process";
import { CommandConfig, WrappedProcess } from "./types";
import { WrappedProcessImpl } from "./wrapped-process";

export class CommandWrapper {
  private processes: Map<string, WrappedProcessImpl> = new Map();
  private interactiveProcess: WrappedProcessImpl | null = null;

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

      // Forward input to interactive process if exists
      if (this.interactiveProcess) {
        // Check if this is a registered shortcut
        const shortcut = this.interactiveProcess.getShortcut(key);
        if (shortcut) {
          shortcut.handler();
        } else {
          // If not a shortcut, forward to the process
          this.interactiveProcess.stdin.write(key);
        }
      }
    });
  }

  spawn(config: CommandConfig): WrappedProcess {
    const process = spawn(config.command, config.args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const wrappedProcess = new WrappedProcessImpl(process, config);
    this.processes.set(process.pid?.toString() ?? "unknown", wrappedProcess);

    // Listen for interactive event
    wrappedProcess.on("interactive", () => {
      this.interactiveProcess = wrappedProcess;
    });

    // Handle process cleanup
    process.on("exit", () => {
      if (this.interactiveProcess === wrappedProcess) {
        // Find the most recently spawned process that is interactive
        this.interactiveProcess =
          Array.from(this.processes.values())
            .filter((p) => p !== wrappedProcess && p.isInteractiveProcess())
            .pop() ?? null;
      }
      this.processes.delete(process.pid?.toString() ?? "unknown");
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

  takeOverOutput(render: () => void): void {
    // TODO: Implement terminal output takeover
    render();
  }
}
