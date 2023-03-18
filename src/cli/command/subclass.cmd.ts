import { CommandDefinition } from "~src/cli/d2cli.types";

import equipped from "./subclass/equipped.cmd";
import unequipped from "./subclass/unequipped.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 character subclass",
  commands: { equipped, unequipped }
};

export default cmd;
