import { transferCommand } from "~src/cli/command-factory/vault.command-factory";
import { CommandDefinition } from "~src/cli/d2cli.types";

const cmd: CommandDefinition = transferCommand({ toVault: true });

export default cmd;
