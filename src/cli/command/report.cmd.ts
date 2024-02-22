import { CommandDefinition } from "~src/cli/d2cli.types";

import allWeapons from "./report/all-weapons.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 reports",
  commands: { "all-weapons": allWeapons }
};

export default cmd;
