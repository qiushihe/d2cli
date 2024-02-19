import { CommandDefinitions } from "~src/cli/d2cli.types";

import auth from "./auth.cmd";
import character from "./character.cmd";
import config from "./config.cmd";
import equipment from "./equipment.cmd";
import mod from "./mod.cmd";
import postmaster from "./postmaster.cmd";
import progression from "./progression.cmd";
import subclass from "./subclass.cmd";
import vault from "./vault.cmd";
import vendor from "./vendor.cmd";

export const commands: CommandDefinitions = {
  auth,
  character,
  config,
  equipment,
  mod,
  postmaster,
  progression,
  subclass,
  vault,
  vendor
};
