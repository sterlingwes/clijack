import { EventEmitter } from "events";
import { CommandWrapper } from "../src";

export class CLITestHarness extends EventEmitter {
  private wrapper: CommandWrapper;
  private output: string[] = [];
  private process: any;

  constructor() {
    super();
    this.wrapper = new CommandWrapper();
  }

  async startCLI(entryPoint: string): Promise<void> {
    // Import and run the CLI entry point
    const cli = require(entryPoint);
    this.process = await cli.main();

    // Set up output capture
    this.output = [];
    let buffer = "";

    // Capture stdout
    this.process.stdout.on("data", (data: Buffer) => {
      // Append new data to buffer
      buffer += data.toString();

      // Split buffer into lines, keeping incomplete lines in buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last incomplete line

      // Process complete lines
      for (const line of lines) {
        if (line.trim()) {
          this.output.push(line.trim());
          this.emit("output", line.trim());
        }
      }
    });

    // Wait for initial menu
    await this.waitForOutput(/Press a key to continue/);
  }

  async sendInput(input: string): Promise<void> {
    this.process.stdin.write(input);
    // Add a small delay after sending input to allow for output processing
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

      // Check if we already have matching output
      if (this.output.some((line) => pattern.test(line))) {
        clearTimeout(timer);
        resolve();
      }
    });
  }

  async assertOutput(pattern: RegExp): Promise<void> {
    // Add a small delay before checking output
    await new Promise((resolve) => setTimeout(resolve, 100));
    const found = this.output.some((line) => pattern.test(line));
    if (!found) {
      console.log("Current output:", this.output);
      throw new Error(`Expected output matching ${pattern} but found none`);
    }
  }

  async assertNoOutput(pattern: RegExp): Promise<void> {
    // Add a small delay before checking output
    await new Promise((resolve) => setTimeout(resolve, 100));
    const found = this.output.some((line) => pattern.test(line));
    if (found) {
      throw new Error(`Expected no output matching ${pattern} but found some`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.process) {
      this.process.kill();
    }
    this.wrapper.killAll();
  }
}
