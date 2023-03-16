import { CommandDefinition } from "~src/cli/d2cli.types";

import equipped from "./list/equipped.cmd";
import unequipped from "./list/unequipped.cmd";

const cmd: CommandDefinition = {
  description: "List character subclass",
  commands: { equipped, unequipped }
};

export default cmd;
