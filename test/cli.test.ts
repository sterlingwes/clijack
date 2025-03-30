import { CLITestHarness } from "./helpers";
import path from "path";

describe("CLI Tests", () => {
  let harness: CLITestHarness;

  beforeEach(async () => {
    harness = new CLITestHarness();
    await harness.startCLI(
      path.join(__dirname, "..", "dist", "examples", "test.js")
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
    // Send 'c' which should trigger the status check shortcut
    await harness.sendInput("c");

    // Verify the status output
    await harness.waitForOutput(/Checking status/);
    await harness.assertOutput(/Server is running/);
    await harness.assertOutput(/Uptime: 5 minutes/);
  });

  it("should forward non-shortcut input to process", async () => {
    // Send '2' directly which should trigger status check
    await harness.sendInput("2");

    // Verify the status output
    await harness.waitForOutput(/Checking status/);
    await harness.assertOutput(/Server is running/);
  });

  it("should handle multiple commands in sequence", async () => {
    // Start server
    await harness.sendInput("s");
    await harness.waitForOutput(/Starting server/);
    await harness.waitForOutput(/Server started successfully/);

    // Check status
    await harness.sendInput("c");
    await harness.waitForOutput(/Checking status/);
    await harness.assertOutput(/Server is running/);

    // Show logs
    await harness.sendInput("l");
    await harness.waitForOutput(/Showing logs/);
    await harness.assertOutput(/\[INFO\] Server started/);
  });

  it("should exit cleanly", async () => {
    await harness.sendInput("q");
    await harness.waitForOutput(/Exiting/);
  });
});
