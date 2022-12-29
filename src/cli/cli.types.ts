import * as repl from "repl";

export type CliRuntimeContext = {
  sessionId: string;
  service: { [key: string]: any };
};

export type CliCmdDefinition = {
  description: string;

  action: (
    server: repl.REPLServer,
    context: CliRuntimeContext,
    arg?: string
  ) => void | Promise<void>;
};
