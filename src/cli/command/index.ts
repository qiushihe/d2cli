import * as repl from "repl";

import { CliCmdDefinition } from "../cli.types";
import { getLoginStatus } from "./get-login-status.cmd";

export const CLI_COMMANDS = { getLoginStatus };

export const makeCmd = (server: repl.REPLServer) => (keyword: string, cmd: CliCmdDefinition) => {
  server.defineCommand(keyword, {
    help: cmd.description,
    action: async (arg) => {
      server.clearBufferedCommand();
      await cmd.action(server, arg);
      server.displayPrompt();
    }
  });
};
