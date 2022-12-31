import "~src/module/register";

import * as path from "path";
import * as repl from "repl";

import { getRepoRootPath } from "~src/helper/path.helper";
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

    server.setupHistory(path.resolve(getRepoRootPath(), ".console-history"), (err) => {
      if (err) {
        console.error(err);
      }
    });

    server.context.D2QDB = {
      service: getServices(AppModule.getDefaultInstance())
    };
  }
}

new InteractiveJSConsole().run().then();
