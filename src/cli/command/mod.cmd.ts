import { CommandDefinition } from "~src/cli/d2cli.types";

import insert from "./mod/insert.cmd";
import list from "./mod/list.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 item mods",
  commands: { insert, list }
};

export default cmd;
