import { CommandWrapper } from "../../../src";
import path from "path";

export async function main() {
  const wrapper = new CommandWrapper();
  const childProcess = wrapper.spawn({
    command: "bash",
    args: [path.join(__dirname, "cli.sh")],
  });

  childProcess.registerOutputMatcher({
    pattern: /this is the error/,
    eventName: "specificError",
    context: {
      linesBefore: 2,
      linesAfter: 2,
    },
  });

  childProcess.on("specificError", ({ context }) => {
    console.log("<specificError>");
    console.log("Specific error matched with context");
    console.log("Before:", JSON.stringify(context.before));
    console.log("After:", JSON.stringify(context.after));
    console.log("Full match:", JSON.stringify(context.fullMatch));
    console.log("</specificError>");
  });

  return childProcess;
}
