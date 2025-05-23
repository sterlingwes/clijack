import { CommandWrapper } from "../../../src";
import path from "path";

export async function main() {
  const wrapper = new CommandWrapper();
  const childProcess = wrapper.spawn({
    command: "bash",
    args: [path.join(__dirname, "cli.sh")],
    menuMatcher: {
      pattern: /Press a key to continue/,
      insertPosition: "before",
    },
    shortcutMenu: {
      title: "",
      optionPrefix: "",
    },
  });

  childProcess.registerShortcut({
    key: "s",
    handler: () => {
      console.log("\nStarting server via shortcut...");
      childProcess.stdin.write("1");
    },
    description: "Start server",
  });

  childProcess.registerShortcut({
    key: "c",
    handler: () => {
      console.log("\nChecking status via shortcut...");
      childProcess.stdin.write("2");
    },
    description: "Check status",
  });

  childProcess.registerShortcut({
    key: "l",
    handler: () => {
      console.log("\nShowing logs...");
      childProcess.stdin.write("3");
    },
    description: "Show logs",
  });

  childProcess.registerOutputMatcher({
    pattern: /Server started successfully/,
    eventName: "serverStarted",
    context: {
      linesBefore: 2,
      linesAfter: 2,
    },
  });

  childProcess.on("interactive", (context) => {
    console.log("Interactive mode:", context);
  });

  childProcess.on("serverStarted", (context) => {
    console.log("Server started with context:", context);
  });

  return childProcess;
}
