import { CommandDefinition } from "~src/cli/d2qdb.types";

import add from "./reminder/add.cmd";

const cmd: CommandDefinition = {
  description: "Reminders for activities in Destiny 2",
  commands: { add }
};

export default cmd;
