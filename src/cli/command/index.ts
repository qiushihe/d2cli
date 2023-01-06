import { CommandDefinitions } from "~src/cli/d2cli.types";

import auth from "./auth.cmd";
import character from "./character.cmd";
import config from "./config.cmd";
import postmaster from "./postmaster.cmd";
import progression from "./progression.cmd";
import reminder from "./reminder.cmd";
import vendor from "./vendor.cmd";

export const commands: CommandDefinitions = {
  auth,
  character,
  config,
  postmaster,
  progression,
  reminder,
  vendor
};
