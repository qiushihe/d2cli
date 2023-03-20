import { InventoryBucket } from "~src/helper/inventory-bucket.helper";
import { LoadoutPlugRecord } from "~src/helper/subclass.helper";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

export const LoadoutInventoryBuckets = [
  InventoryBucket.KineticWeapon,
  InventoryBucket.EnergyWeapon,
  InventoryBucket.PowerWeapon,
  InventoryBucket.Helmet,
  InventoryBucket.Gauntlet,
  InventoryBucket.ChestArmour,
  InventoryBucket.LegArmour,
  InventoryBucket.ClassItem
];

export const serializeItem = (
  itemDefinitions: Destiny2ManifestInventoryItemDefinitions,
  item: DestinyItemComponent,
  equip: boolean
): string => {
  const itemName = itemDefinitions[item.itemHash]?.displayProperties.name || "UNKNOWN ITEM";
  const itemInfo = [`${item.itemHash}:${item.itemInstanceId}`].join("::");
  return `${equip ? "EQUIP" : "EXTRA"} // ${itemInfo} // ${itemName}`;
};

export const serializeItemPlugs = (
  itemDefinitions: Destiny2ManifestInventoryItemDefinitions,
  item: DestinyItemComponent,
  plugs: LoadoutPlugRecord[]
): string[] => {
  return plugs.map((plug) => {
    const plugName = itemDefinitions[plug.itemHash]?.displayProperties.name || "UNKNOWN ITEM";
    const plugInfo = [
      `${item.itemHash}:${item.itemInstanceId}`,
      `index:${plug.socketIndex}`,
      `plug:${plug.itemHash}`
    ].join("::");
    return `SOCKET // ${plugInfo} // ${plugName}`;
  });
};
