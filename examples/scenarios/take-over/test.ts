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
      const name = await wrapper.withFullscreenPrompt<string>((api) => {
        api.write("What is your name?\n");
        let input = "";
        api.onInput(
          (key) => {
            if (key === "\r") {
              api.resolve(input);
            } else {
              input += key;
              api.write(key);
            }
          },
          { intermediates: true }
        );
      });
      console.log(`\nUser's name is: ${name}`);
      process.exit(0);
    },
    description: "Take over input",
  });

  childProcess.registerShortcut({
    key: "f",
    handler: async () => {
      const message = await wrapper.withFullscreenPrompt<string>(
        async (api) => {
          api.write("Enter a message to display:\n");
          const input = await api.promptInput();
          api.write("\nAnything else you want to say?\n");
          const additionalInput = await api.promptInput();
          api.resolve(`${input} ${additionalInput}`);
        }
      );
      console.log(`\nYou entered: ${message}`);
      process.exit(0);
    },
    description: "Take over input with only final input event",
  });

  return childProcess;
}
