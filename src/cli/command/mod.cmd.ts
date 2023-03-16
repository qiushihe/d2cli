import { CommandDefinition } from "~src/cli/d2cli.types";

import list from "./mod/list.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 item mods",
  commands: { list }
};

export default cmd;
