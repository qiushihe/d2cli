import { CommandDefinition } from "~src/cli/d2cli.types";

import apply from "./loadout/apply.cmd";
import exportLoadout from "./loadout/export.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 character loadout",
  commands: { apply, export: exportLoadout }
};

export default cmd;
