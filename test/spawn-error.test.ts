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
      /Specific error matched with context/
    );
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  it.only("should capture specific error", async () => {
    await harness.assertOutput(/Specific error matched with context/);
  });
});
