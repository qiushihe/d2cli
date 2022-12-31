import "~src/module/register";

import * as repl from "repl";

import { AppModule } from "~src/module/app.module";

import { getServices } from "./service";

class InteractiveJSConsole {
  async run() {
    const server = repl.start({
      useColors: true,
      prompt: "> ",
      writer: (value: object): string => JSON.stringify(value),
      ignoreUndefined: true
    });

    server.context.D2QDB = {
      service: getServices(AppModule.getDefaultInstance())
    };
  }
}

new InteractiveJSConsole().run().then();
