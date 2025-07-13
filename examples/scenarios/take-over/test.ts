import path from "path";
import { CommandWrapper } from "../../../src";
export async function main() {
  const wrapper = new CommandWrapper();

  const childProcess = wrapper.spawn({
    command: "bash",
    args: [path.join(__dirname, "../base-interactive/cli.sh")],
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
    key: "t",
    handler: async () => {
      const name = await wrapper.takeOverOutput<string>((api) => {
        api.write("What is your name?\n");
        let input = "";
        api.onKeyPress((key) => {
          if (key === "\r") {
            api.resolve(input);
          } else {
            input += key;
            api.write(key);
          }
        });
      });
      console.log(`\nUser's name is: ${name}`);
      process.exit(0);
    },
    description: "Take over output",
  });

  return childProcess;
}
