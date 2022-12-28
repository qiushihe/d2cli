import * as repl from "repl";

import { D2QDB } from "~type/d2qdb";

import { getLoginStatus } from "./get-login-status.cmd";

export const CLI_COMMANDS = { getLoginStatus };

export const makeCmd =
  (server: repl.REPLServer) => (keyword: string, cmd: D2QDB.CliCmdDefinition) => {
    server.defineCommand(keyword, {
      help: cmd.description,
      action: async (arg) => {
        server.clearBufferedCommand();
        await cmd.action(server, arg);
        server.displayPrompt();
      }
    });
  };
