import { CommandDefinition } from "~src/cli/d2cli.types";

import all from "./inventory/all.cmd";
import armours from "./inventory/armours.cmd";
import essentials from "./inventory/essentials.cmd";
import similarWeapons from "./inventory/similar-weapons.cmd";
import weapons from "./inventory/weapons.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 inventory",
  commands: { all, armours, essentials, "similar-weapons": similarWeapons, weapons }
};

export default cmd;
