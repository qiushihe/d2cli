import { CommandDefinition } from "~src/cli/d2cli.types";

import list from "./subclass/list.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 character subclass",
  commands: { list }
};

export default cmd;
