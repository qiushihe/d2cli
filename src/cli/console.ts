import "~src/module/register";

import minimist from "minimist";
import * as repl from "repl";

import { getRepoRootPath } from "~src/helper/path.helper";
import { AppModule } from "~src/module/app.module";
import { DEFAULT_SESSION_ID } from "~src/service/session/session.service";

import { CliRuntimeContext } from "./cli.types";
import { CLI_COMMANDS, makeCmd } from "./command";
import { getServices } from "./service";

type RunConsoleOptions = {
  argv: string[];
  repoRootPath: string;
};

type RunConsoleArgv = {
  sessionId: string;
};

class InteractiveJSConsole {
  async run(options: RunConsoleOptions) {
    const { sessionId } = minimist<RunConsoleArgv>(options.argv, {
      string: ["session-id"],
      boolean: [],
      default: { sessionId: DEFAULT_SESSION_ID },
      alias: { sessionId: ["session-id", "s"] }
    });

    const runtimeContext: CliRuntimeContext = {
      sessionId,
      repoRootPath: options.repoRootPath
    };

    const server = repl.start({
      useColors: true,
      prompt: "> ",
      writer: (value: object): string => JSON.stringify(value),
      ignoreUndefined: true
    });

    server.context.D2QDB = {
      ...runtimeContext,
      service: getServices(AppModule.getDefaultInstance())
    };

    const makeServerCmd = makeCmd(server, runtimeContext);
    Object.entries(CLI_COMMANDS).forEach(([key, value]) => makeServerCmd(key, value));
  }
}

new InteractiveJSConsole()
  .run({
    argv: process.argv.slice(2),
    repoRootPath: getRepoRootPath()
  })
  .then();
