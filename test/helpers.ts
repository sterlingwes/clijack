import { EventEmitter } from "events";
import * as os from "os";
import * as pty from "node-pty";

export class CLITestHarness extends EventEmitter {
  private output: string[] = [];
  private term: pty.IPty | null = null;

  constructor() {
    super();
  }

  async startCLI(entryPoint: string): Promise<void> {
    this.term = pty.spawn("node", [entryPoint], {
      cwd: process.cwd(),
    });

    this.output = [];
    let buffer = "";

    this.term.onData((data: string) => {
      buffer += data;

      const lines = buffer.split("\r\n");

      for (const line of lines) {
        if (line.trim()) {
          this.output.push(line.trim());
          this.emit("output", line.trim());
        }
      }
    });

    await this.waitForOutput(/Press a key to continue/);
  }

  async sendInput(input: string): Promise<void> {
    if (!this.term) {
      throw new Error("No terminal running");
    }
    this.term.write(input);
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

  async assertOutput(pattern: RegExp): Promise<void> {
    const found = this.output.some((line) => pattern.test(line));
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
    if (this.term) {
      this.term.kill();
    }
  }
}
