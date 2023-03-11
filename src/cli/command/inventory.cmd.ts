import { CommandDefinition } from "~src/cli/d2cli.types";

import list from "./inventory/list.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 character inventory",
  commands: { list }
};

export default cmd;
