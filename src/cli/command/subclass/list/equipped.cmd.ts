import { CommandDefinition } from "~src/cli/d2cli.types";

import { listCommand } from "./lister";

const cmd: CommandDefinition = listCommand({ listEquipped: true });

export default cmd;
