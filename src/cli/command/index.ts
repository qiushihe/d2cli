import { CommandDefinitions } from "~src/cli/d2cli.types";

import auth from "./auth.cmd";
import calendar from "./calendar.cmd";
import character from "./character.cmd";
import config from "./config.cmd";
import postmaster from "./postmaster.cmd";
import progression from "./progression.cmd";
import vendor from "./vendor.cmd";

export const commands: CommandDefinitions = {
  auth,
  calendar,
  character,
  config,
  postmaster,
  progression,
  vendor
};
