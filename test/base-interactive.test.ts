import { CLITestHarness } from "./helpers";
import path from "path";

describe("base-interactive", () => {
  let harness: CLITestHarness;

  beforeEach(async () => {
    harness = new CLITestHarness();
    await harness.startCLI(
      path.join(
        __dirname,
        "..",
        "dist",
        "examples",
        "scenarios",
        "base-interactive",
        "run.js"
      ),
      /Press a key to continue/
    );
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  it("should show initial menu", async () => {
    await harness.assertOutput(/Available commands:/);
    await harness.assertOutput(/Press a key to continue/);
  });

  it("should handle custom shortcuts", async () => {
    await harness.sendInput("c");

    await harness.waitForOutput(/Checking status via shortcut/);
    await harness.waitForOutput(/Server is running/);
  });

  it("should forward non-shortcut input to process", async () => {
    await harness.sendInput("2");

    await harness.waitForOutput(/Server is running/);
  });

  it("should handle multiple commands in sequence", async () => {
    await harness.sendInput("s");
    await harness.waitForOutput(/Starting server via shortcut/);
    await harness.waitForOutput(/Server started successfully/);

    await harness.sendInput("c");
    await harness.waitForOutput(/Checking status via shortcut/);
    await harness.waitForOutput(/Server is running/);

    await harness.sendInput("l");
    await harness.waitForOutput(/Showing logs/);
    await harness.waitForOutput(/\[INFO\] Server started/);
  });

  it("should exit cleanly", async () => {
    await harness.sendInput("4");
    await harness.waitForOutput(/Exiting/);
  });

  it.only("should print registered shortcuts", () => {
    console.log(harness.debugOutput);
  });
});
