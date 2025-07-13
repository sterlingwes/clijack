import { IPty } from "node-pty";

export interface CommandConfig {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  menuMatcher?: Omit<OutputMatcher, "eventName">;
  shortcutMenu?:
    | {
        title?: string;
        optionPrefix?: string;
      }
    | boolean;
}

export interface ShortcutConfig {
  key: string;
  shift?: boolean;
  handler: () => void;
  description?: string;
}

export interface OutputMatcher {
  pattern: RegExp;
  eventName: string;
  context?: {
    linesBefore?: number;
    linesAfter?: number;
    maxBufferSize?: number;
  };
  once?: boolean;
  insertPosition?: "before" | "after";
}

export interface MatchData {
  match: RegExpMatchArray;
  context: {
    before: string[];
    after: string[];
    fullMatch: string;
  };
}

export interface WrappedProcess {
  pty: IPty;
  kill(signal?: string): void;
  on(event: "exit" | string, handler: (data: MatchData) => void): void;
  registerShortcut(config: ShortcutConfig): () => void;
  registerOutputMatcher(config: OutputMatcher): () => void;
  waitForExit(): Promise<void>;
}
