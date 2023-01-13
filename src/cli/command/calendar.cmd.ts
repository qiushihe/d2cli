import { CommandDefinition } from "~src/cli/d2cli.types";

import add from "./calendar/add.cmd";
import list from "./calendar/list.cmd";

const cmd: CommandDefinition = {
  description: "Calendar events",
  commands: { add, list }
};

export default cmd;
