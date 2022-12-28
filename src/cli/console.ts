import "~src/module/register";

import * as repl from "repl";

import { AppModule } from "~src/module/app.module";
import { BungieService } from "~src/service/bungie/bungie.service";

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
