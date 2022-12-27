import "~src/module/register";

import { loadEnvConfig } from "@next/env";
import * as Logger from "purdy";
import * as repl from "repl";

import { AppModule } from "~src/module/app.module";
import { BungieService } from "~src/service/bungie/bungie.service";

class InteractiveJSConsole {
  async run() {
    loadEnvConfig(process.cwd());

    const awaitOutside = require("await-outside");

    const server = repl.start({
      useColors: true,
      prompt: "> ",
      writer: (value: object): string => Logger.stringify(value, { indent: 2, depth: 1 }),
      ignoreUndefined: true
    });

    server.context.D2QDB = {
      service: {
        bungieService: AppModule.getDefaultInstance().resolve("BungieService")
      },
      cmd: {
        test: async () => {
          console.log("Waiting for 5 seconds ...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
          console.log("Done waiting for 5 seconds!");
        }
      }
    };

    awaitOutside.addAwaitOutsideToReplServer(server);
  }
}

new InteractiveJSConsole().run().then();
