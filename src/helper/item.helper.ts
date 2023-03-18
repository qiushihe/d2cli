import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemInstanceComponent } from "~type/bungie-api/destiny/entities/items.types";

export type ItemNameAndPowerLevel = { label: string; powerLevel: string };

export const getItemNameAndPowerLevel = (
  itemDefinition: DestinyInventoryItemDefinition | null,
  itemInstance: DestinyItemInstanceComponent | null
): ItemNameAndPowerLevel => {
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

export type ItemIdentifier =
  | { itemHash: null; itemInstanceId: string }
  | { itemHash: number; itemInstanceId: null }
  | { itemHash: number; itemInstanceId: string };

export const parseItemIdentifier = (identifier: string): ItemIdentifier | null => {
  const parts = `${identifier}`.trim().split(":", 2);
  const itemHashString = `${parts[0]}`.trim();
  const itemInstanceIdString = `${parts[1]}`.trim();

  const itemHashIsValid = !itemHashString.match(/\D/gi);
  const itemInstanceIdIsValid = !itemInstanceIdString.match(/\D/gi);

  if (itemHashIsValid) {
    const itemHash = parseInt(itemHashString, 10) || 0;
    if (itemInstanceIdIsValid) {
      return { itemHash, itemInstanceId: itemInstanceIdString };
    } else {
      return { itemHash, itemInstanceId: null };
    }
  } else {
    if (itemInstanceIdIsValid) {
      return { itemHash: null, itemInstanceId: itemInstanceIdString };
    } else {
      return null;
    }
  }
};
