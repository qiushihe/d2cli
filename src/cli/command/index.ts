import { CommandDefinitions } from "~src/cli/d2cli.types";

import agenda from "./agenda.cmd";
import auth from "./auth.cmd";
import character from "./character.cmd";
import config from "./config.cmd";
import inventory from "./inventory.cmd";
import postmaster from "./postmaster.cmd";
import progression from "./progression.cmd";
import vendor from "./vendor.cmd";

export const commands: CommandDefinitions = {
  agenda,
  auth,
  character,
  config,
  inventory,
  postmaster,
  progression,
  vendor
};
