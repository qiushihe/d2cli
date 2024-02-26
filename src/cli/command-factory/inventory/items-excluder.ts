import { InventoryItem } from "./type";

export const itemsExcluder =
  (slots: string[]) =>
  (inventoryItems: InventoryItem[]): InventoryItem[] => {
    return inventoryItems.filter((inventoryItem) => {
      return !inventoryItem.tags.find((tag) => {
        return tag.startsWith("Slot:") && slots.find((slot) => tag.endsWith(`:${slot}`));
      });
    });
  };
