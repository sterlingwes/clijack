import { CLITestHarness } from "./helpers";
import path from "path";

describe("spawn-error", () => {
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
        "spawn-error",
        "run.js"
      ),
      /<\/specificError>/
    );
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  it("should capture specific error", async () => {
    await harness.assertOutput(/Specific error matched with context/);
    await harness.assertOutput('Before: ["This is a test error"]');
    await harness.assertOutput(
      'After: ["This is the end of the error message"]'
    );
    await harness.assertOutput(
      'Full match: "Something happened and this is the error message"'
    );
  });
});
