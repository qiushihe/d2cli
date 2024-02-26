import { inventoryCommand } from "~src/cli/command-factory/inventory.command-factory";
import { CommandDefinition } from "~src/cli/d2cli.types";

const cmd: CommandDefinition = inventoryCommand({
  description: "List weapons",
  slots: ["Kinetic", "Energy", "Power"],
  filter: (items) => items,
  group: (items) => [items],
  hideStaticColumns: () => false
});

export default cmd;
