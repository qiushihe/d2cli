import * as repl from "repl";

import { CliCmdDefinition } from "../cli.types";
import { CliRuntimeContext } from "../cli.types";
import { addFarmingReminder } from "./add-farming-reminder.cmd";
import { getLoginStatus } from "./get-login-status.cmd";
import { login } from "./login.cmd";
import { logout } from "./logout.cmd";
import { setAppConfigBungieApiKey } from "./set-app-config-bungie-api-key.cmd";
import { setAppConfigBungieClientId } from "./set-app-config-bungie-client-id.cmd";
import { setAppConfigBungieClientSecret } from "./set-app-config-bungie-client-secret.cmd";
import { setAppConfigLogLevel } from "./set-app-config-log-level.cmd";

export const CLI_COMMANDS = {
  login,
  logout,
  getLoginStatus,
  addFarmingReminder,
  setAppConfigBungieApiKey,
  setAppConfigBungieClientId,
  setAppConfigBungieClientSecret,
  setAppConfigLogLevel
};

export const makeCmd =
  (server: repl.REPLServer, context: CliRuntimeContext) =>
  (keyword: string, cmd: CliCmdDefinition) => {
    server.defineCommand(keyword, {
      help: cmd.description,
      action: async (arg) => {
        server.clearBufferedCommand();
        await cmd.action(server, context, arg);
        server.displayPrompt();
      }
    });
  };
