import { inventoryCommand } from "~src/cli/command-factory/inventory.command-factory";
import { CommandDefinition } from "~src/cli/d2cli.types";

const cmd: CommandDefinition = inventoryCommand({
  description: "List items",
  includeSlots: null
});

export default cmd;
