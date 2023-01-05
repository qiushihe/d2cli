import { CommandDefinition } from "~src/cli/d2cli.types";

import list from "./character/list.cmd";
import ranks from "./character/ranks.cmd";
import select from "./character/select.cmd";
import stats from "./character/stats.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 characters",
  commands: { list, ranks, select, stats }
};

export default cmd;
