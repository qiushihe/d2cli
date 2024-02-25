import { inventoryCommand } from "~src/cli/command-factory/inventory.command-factory";
import { CommandDefinition } from "~src/cli/d2cli.types";

const cmd: CommandDefinition = inventoryCommand({
  description: "List armours",
  includeSlots: ["Helmet", "Glove", "Chest", "Leg", "Class"]
});

export default cmd;
