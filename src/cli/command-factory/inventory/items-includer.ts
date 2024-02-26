import { InventoryItem } from "./type";

export const itemsIncluder =
  (slots?: string[] | null) =>
  (inventoryItems: InventoryItem[]): InventoryItem[] => {
    if (!slots) {
      return inventoryItems;
    }

    return inventoryItems.filter((inventoryItem) => {
      return inventoryItem.tags.find((tag) => {
        return tag.startsWith("Slot:") && slots.find((slot) => tag.endsWith(`:${slot}`));
      });
    });
  };
