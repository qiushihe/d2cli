import { CommandDefinition } from "~src/cli/d2cli.types";

import list from "./inventory/list.cmd";
import vault from "./inventory/vault.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 character inventory",
  commands: { list, vault }
};

export default cmd;
