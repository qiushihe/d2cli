import { CommandDefinition } from "~src/cli/d2cli.types";

import deposit from "./vault/deposit.cmd";
import list from "./vault/list.cmd";
import withdraw from "./vault/withdraw.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 vault",
  commands: { deposit, list, withdraw }
};

export default cmd;
