import { CommandDefinition } from "~src/cli/d2qdb.types";

import list from "./postmaster/list.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 postmaster",
  commands: { list }
};

export default cmd;
