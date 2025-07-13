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
      title: "Custom Shortcuts:",
      optionPrefix: "  ",
    },
  });

  childProcess.registerShortcut({
    key: "s",
    handler: () => {
      console.log("\nStarting server via shortcut...");
      childProcess.pty.write("1");
    },
    description: "Start server",
  });

  childProcess.registerShortcut({
    key: "c",
    handler: () => {
      console.log("\nChecking status via shortcut...");
      childProcess.pty.write("2");
    },
    description: "Check status",
  });

  childProcess.registerShortcut({
    key: "l",
    handler: () => {
      console.log("\nShowing logs...");
      childProcess.pty.write("3");
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

  childProcess.on("serverStarted", (context) => {
    console.log("Server started event received!");
  });

  return childProcess;
}
