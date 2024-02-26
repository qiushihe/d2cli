import { DestinyItemInstanceComponent } from "~type/bungie-api/destiny/entities/items.types";

import { InventoryItem } from "./type";

export const lightLevelTagger =
  (slots: string[]) =>
  (
    inventoryItems: InventoryItem[],
    itemInstances: Record<string, DestinyItemInstanceComponent>
  ): InventoryItem[] => {
    return inventoryItems.map((inventoryItem) => {
      const matchSlot = inventoryItem.tags.find((tag) => {
        return tag.startsWith("Slot:") && slots.find((slot) => tag.endsWith(`:${slot}`));
      });

      if (matchSlot) {
        const itemInstance = itemInstances[inventoryItem.itemInstanceId];
        const lightLevel = `${itemInstance?.primaryStat?.value || "N/A"}`;

        return {
          itemHash: inventoryItem.itemHash,
          itemInstanceId: inventoryItem.itemInstanceId,
          tags: [...inventoryItem.tags, `Light:${lightLevel}`]
        };
      } else {
        return inventoryItem;
      }
    });
  };
