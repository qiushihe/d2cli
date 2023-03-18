import { listCommand } from "~src/cli/command-factory/subclass.command-factory";
import { CommandDefinition } from "~src/cli/d2cli.types";

const cmd: CommandDefinition = listCommand({ listEquipped: false });

export default cmd;
