import * as repl from "repl";

export type CliCmdDefinition = {
  description: string;
  action: (server: repl.REPLServer, arg?: string) => void | Promise<void>;
};
