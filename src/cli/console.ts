import "~src/module/register";

import minimist from "minimist";
import * as repl from "repl";

import { AppModule } from "~src/module/app.module";
import { DEFAULT_SESSION_ID } from "~src/service/session/session.service";

import { CliRuntimeContext } from "./cli.types";
import { CLI_COMMANDS, makeCmd } from "./command";
import { getServices } from "./service";

type RunConsoleOptions = {
  argv: string[];
};

type RunConsoleArgv = {
  sessionId: string;
};

class InteractiveJSConsole {
  async run(options: RunConsoleOptions) {
    require("dotenv").config({ path: ".env" });

    const { sessionId } = minimist<RunConsoleArgv>(options.argv, {
      string: ["session-id"],
      boolean: [],
      default: { sessionId: DEFAULT_SESSION_ID },
      alias: { sessionId: ["session-id", "s"] }
    });

    const runtimeContext: CliRuntimeContext = {
      sessionId,
      service: getServices(AppModule.getDefaultInstance())
    };

    const awaitOutside = require("await-outside");

    const server = repl.start({
      useColors: true,
      prompt: "> ",
      writer: (value: object): string => JSON.stringify(value),
      ignoreUndefined: true
    });

    server.context.D2QDB = runtimeContext;

    const makeServerCmd = makeCmd(server, runtimeContext);
    Object.entries(CLI_COMMANDS).forEach(([key, value]) => makeServerCmd(key, value));

    awaitOutside.addAwaitOutsideToReplServer(server);
  }
}

new InteractiveJSConsole()
  .run({
    argv: process.argv.slice(2)
  })
  .then();
