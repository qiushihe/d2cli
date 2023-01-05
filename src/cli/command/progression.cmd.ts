import { CommandDefinition } from "~src/cli/d2cli.types";

import ranks from "./progression/ranks.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 character progressions",
  commands: { ranks }
};

export default cmd;
