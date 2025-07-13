import { CLITestHarness } from "./helpers";
import path from "path";

describe("take-over", () => {
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
        "take-over",
        "run.js"
      ),
      /Take over/
    );
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  it("should take over output and return to normal", async () => {
    await new Promise<void>((resolve) => {
      harness.on("alt-screen-enter", () => resolve());
      harness.sendInput("t");
    });
    await harness.waitForOutput(/What is your name?/);
    await harness.sendInput("John");
    await harness.sendInput("\r");
    await harness.waitForOutput(/User's name is: John/);
  });
});
