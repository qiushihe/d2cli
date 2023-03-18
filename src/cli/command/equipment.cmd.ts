import { CommandDefinition } from "~src/cli/d2cli.types";

import equip from "./equipment/equip.cmd";
import equipped from "./equipment/equipped.cmd";
import unequipped from "./equipment/unequipped.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 character inventory",
  commands: { equip, equipped, unequipped }
};

export default cmd;
