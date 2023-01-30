import { CommandDefinition } from "~src/cli/d2cli.types";

import add from "./agenda/add.cmd";
import list from "./agenda/list.cmd";

const cmd: CommandDefinition = {
  description: "Agenda items",
  commands: { add, list }
};

export default cmd;
