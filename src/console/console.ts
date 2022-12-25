import * as Logger from "purdy";
import * as repl from "repl";

class InteractiveJSConsole {
  async run() {
    const awaitOutside = require("await-outside");

    const server = repl.start({
      useColors: true,
      prompt: "> ",
      writer: (value: object): string => Logger.stringify(value, { indent: 2, depth: 1 }),
      ignoreUndefined: true
    });

    server.context.D2QDB = {
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
