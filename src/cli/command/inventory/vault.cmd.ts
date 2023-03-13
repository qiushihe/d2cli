import { CommandDefinition } from "~src/cli/d2cli.types";

import put from "./vault/put.cmd";
import take from "./vault/take.cmd";

const cmd: CommandDefinition = {
  description: "Transfer items between character and vault",
  commands: { put, take }
};

export default cmd;
