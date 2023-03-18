import { CommandDefinition } from "~src/cli/d2cli.types";

import snapshot from "./loadout/snapshot.cmd";

const cmd: CommandDefinition = {
  description: "Destiny 2 character loadout",
  commands: { snapshot }
};

export default cmd;
