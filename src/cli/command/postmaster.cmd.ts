import { CommandDefinition } from "~src/cli/d2cli.types";

import list from "./postmaster/list.cmd";
import pull from "./postmaster/pull.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 postmaster",
  commands: { list, pull }
};

export default cmd;
