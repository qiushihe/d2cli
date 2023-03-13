import { CommandDefinition } from "~src/cli/d2cli.types";

import equip from "./inventory/equip.cmd";
import list from "./inventory/list.cmd";
import vault from "./inventory/vault.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 character inventory",
  commands: { equip, list, vault }
};

export default cmd;
