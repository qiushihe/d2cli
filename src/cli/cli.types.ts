import * as repl from "repl";

export type CliRuntimeContext = {
  repoRootPath: string;
  sessionId: string;
};

export type CliCmdDefinition = {
  description: string;

  action: (
    server: repl.REPLServer,
    context: CliRuntimeContext,
    arg?: string
  ) => void | Promise<void> | Error | null | undefined | Promise<Error | null | undefined>;
};
