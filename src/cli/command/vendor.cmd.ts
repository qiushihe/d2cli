import { CommandDefinition } from "~src/cli/d2cli.types";

import list from "./vendor/list.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 vendors",
  commands: { list }
};

export default cmd;
