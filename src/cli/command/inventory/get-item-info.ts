import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemInstanceComponent } from "~type/bungie-api/destiny/entities/items.types";

export type ItemInfo = { label: string; powerLevel: string };

export const getItemInfo = (
  itemDefinition: DestinyInventoryItemDefinition | null,
  itemInstance: DestinyItemInstanceComponent | null
): ItemInfo => {
  if (itemDefinition) {
    if (itemInstance && itemInstance.primaryStat) {
      return {
        label: itemDefinition.displayProperties.name || "UNKNOWN",
        powerLevel: `${itemInstance.primaryStat.value || "N/A"}`
      };
    } else {
      return { label: itemDefinition.displayProperties.name || "UNKNOWN", powerLevel: "N/A" };
    }
  } else {
    return { label: "UNKNOWN", powerLevel: "N/A" };
  }
};
