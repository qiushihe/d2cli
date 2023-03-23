import { CommandDefinition } from "~src/cli/d2cli.types";

import login from "./auth/login.cmd";
import logout from "./auth/logout.cmd";
import status from "./auth/status.cmd";

const cmd: CommandDefinition = {
  description: "Authentication with Bungie.net",
  commands: { login, logout, status }
};

export default cmd;
