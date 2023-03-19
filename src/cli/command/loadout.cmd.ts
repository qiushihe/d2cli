import { CommandDefinition } from "~src/cli/d2cli.types";

import exportLoadout from "./loadout/export.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 character loadout",
  commands: { export: exportLoadout }
};

export default cmd;
