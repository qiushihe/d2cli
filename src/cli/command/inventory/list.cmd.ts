import { CommandDefinition } from "~src/cli/d2cli.types";

import equipped from "./list/equipped.cmd";
import unequipped from "./list/unequipped.cmd";
import vault from "./list/vault.cmd";

const cmd: CommandDefinition = {
  description: "List items in character inventory",
  commands: { equipped, unequipped, vault }
};

export default cmd;
