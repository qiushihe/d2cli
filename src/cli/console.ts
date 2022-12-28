import "~src/module/register";

import * as repl from "repl";

import { AppModule } from "~src/module/app.module";

import { CLI_COMMANDS, makeCmd } from "./command";
import { getServices } from "./service";

class InteractiveJSConsole {
  async run() {
    require("dotenv").config({ path: ".env" });

    const awaitOutside = require("await-outside");

    const server = repl.start({
      useColors: true,
      prompt: "> ",
      writer: (value: object): string => JSON.stringify(value),
      ignoreUndefined: true
    });

    const makeServerCmd = makeCmd(server);
    Object.entries(CLI_COMMANDS).forEach(([key, value]) => makeServerCmd(key, value));

    server.context.D2QDB = {
      service: getServices(AppModule.getDefaultInstance())
    };

    awaitOutside.addAwaitOutsideToReplServer(server);
  }
}

new InteractiveJSConsole().run().then();
