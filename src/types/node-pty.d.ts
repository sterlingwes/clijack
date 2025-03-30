declare module "node-pty" {
  export interface IPtyForkOptions {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: { [key: string]: string };
  }

  export interface IPty {
    onData(callback: (data: string) => void): void;
    write(data: string): void;
    kill(signal?: string): void;
  }

  export function spawn(
    file: string,
    args: string[],
    options: IPtyForkOptions
  ): IPty;
}
