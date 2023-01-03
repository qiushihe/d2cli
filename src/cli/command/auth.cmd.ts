import { CommandDefinition } from "~src/cli/d2cli.types";

import login from "./auth/login.cmd";
import logout from "./auth/logout.cmd";
import oauthReturn from "./auth/oauth-return.cmd";
import status from "./auth/status.cmd";

const cmd: CommandDefinition = {
  description: "Authentication with Bungie.net",
  commands: { login, logout, status, "oauth-return": oauthReturn }
};

export default cmd;
