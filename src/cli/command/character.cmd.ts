import { CommandDefinition } from "~src/cli/d2qdb.types";

import list from "./character/list.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 characters",
  commands: { list }
};

export default cmd;
