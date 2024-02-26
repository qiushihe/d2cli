import { inventoryCommand } from "~src/cli/command-factory/inventory.command-factory";
import { InventoryItem } from "~src/cli/command-factory/inventory/type";
import { CommandDefinition } from "~src/cli/d2cli.types";

const groupSimilar = (items: InventoryItem[]) =>
  items.reduce((acc, item) => {
    const key = ["Slot", "Weapon", "Frame", "Damage"]
      .map((prefix) => item.tags.find((tag) => tag.startsWith(`${prefix}:`)) || `${prefix}:Unknown`)
      .join("&&&");

    return { ...acc, [key]: [...(acc[key] || []), item] };
  }, {} as Record<string, InventoryItem[]>);

const cmd: CommandDefinition = inventoryCommand({
  description: "List similar weapons",
  slots: ["Kinetic", "Energy", "Power"],
  filter: (items) =>
    Object.values(groupSimilar(items.filter((item) => !item.tags.includes("Tier:Exotic"))))
      .filter((items) => items.length > 1)
      .flat(),
  group: (items) => Object.values(groupSimilar(items)),
  hideStaticColumns: (column) => column === "Tier"
});

export default cmd;
