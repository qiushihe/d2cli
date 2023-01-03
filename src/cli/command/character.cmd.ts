import { CommandDefinition } from "~src/cli/d2qdb.types";

import list from "./character/list.cmd";
import select from "./character/select.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 characters",
  commands: { list, select }
};

export default cmd;
