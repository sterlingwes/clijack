import { EventEmitter } from "events";
import { spawn } from "child_process";

export class CLITestHarness extends EventEmitter {
  private output: string[] = [];
  private childProcess: ReturnType<typeof spawn> | null = null;
  private isAltScreen = false;

  get debugOutput(): string[] {
    return this.output;
  }

  async startCLI(entryPoint: string, readyPattern?: RegExp): Promise<void> {
    this.childProcess = spawn("node", [entryPoint], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORCE_COLOR: "1",
      },
    });

    this.output = [];
    let buffer = "";

    if (!this.childProcess.stdout || !this.childProcess.stderr) {
      throw new Error("Failed to create child process streams");
    }

    const handleOutput = (data: Buffer) => {
      const dataStr = data.toString();
      if (dataStr.includes("\x1b[?1049h")) {
        this.isAltScreen = true;
        this.output = [];
        this.emit("alt-screen-enter");
      } else if (dataStr.includes("\x1b[?1049l")) {
        this.isAltScreen = false;
        this.output = [];
        this.emit("alt-screen-exit");
      }

      buffer += data.toString();

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        this.output.push(line);
        this.emit("output", line);
      }
    };

    this.childProcess.stdout.on("data", handleOutput);
    this.childProcess.stderr.on("data", handleOutput);

    if (readyPattern) {
      await this.waitForOutput(readyPattern);
    }
  }

  async sendInput(input: string): Promise<void> {
    if (!this.childProcess?.stdin) {
      throw new Error("No terminal running");
    }
    this.childProcess.stdin.write(input);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  async waitForOutput(pattern: RegExp, timeout = 2000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for output matching ${pattern}`));
      }, timeout);

      const handler = (line: string) => {
        if (pattern.test(line)) {
          clearTimeout(timer);
          this.removeListener("output", handler);
          resolve();
        }
      };

      this.on("output", handler);

      if (this.output.some((line) => pattern.test(line))) {
        clearTimeout(timer);
        resolve();
      }
    });
  }

  async assertOutput(pattern: RegExp | string): Promise<void> {
    const found = this.output.some((line) =>
      typeof pattern === "string" ? line.includes(pattern) : pattern.test(line)
    );
    if (!found) {
      throw new Error(`Expected output matching ${pattern} but found none`);
    }
  }

  async assertNoOutput(pattern: RegExp): Promise<void> {
    const found = this.output.some((line) => pattern.test(line));
    if (found) {
      throw new Error(`Expected no output matching ${pattern} but found some`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.childProcess) {
      this.childProcess.kill();
    }
  }
}
