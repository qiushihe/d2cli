import { InventoryBucket } from "~src/enum/inventory.enum";
import { InventoryBucketHashes } from "~src/enum/inventory.enum";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

export const getSubclassItems = (items: DestinyItemComponent[]): DestinyItemComponent[] => {
  return items.filter((item) => {
    return item.bucketHash === InventoryBucketHashes[InventoryBucket.Subclass];
  });
};

export const groupEquipmentItems = (
  items: DestinyItemComponent[]
): Record<string, DestinyItemComponent[]> => {
  return items.reduce(
    (acc, item) => {
      switch (item.bucketHash) {
        case InventoryBucketHashes[InventoryBucket.KineticWeapon]:
          acc.kineticWeapon.push(item);
          break;
        case InventoryBucketHashes[InventoryBucket.EnergyWeapon]:
          acc.energyWeapon.push(item);
          break;
        case InventoryBucketHashes[InventoryBucket.PowerWeapon]:
          acc.powerWeapon.push(item);
          break;
        case InventoryBucketHashes[InventoryBucket.Ghost]:
          acc.ghost.push(item);
          break;
        case InventoryBucketHashes[InventoryBucket.Vehicle]:
          acc.vehicle.push(item);
          break;
        case InventoryBucketHashes[InventoryBucket.Ship]:
          acc.ship.push(item);
          break;
        case InventoryBucketHashes[InventoryBucket.Helmet]:
          acc.helmet.push(item);
          break;
        case InventoryBucketHashes[InventoryBucket.Gauntlet]:
          acc.gauntlet.push(item);
          break;
        case InventoryBucketHashes[InventoryBucket.ChestArmour]:
          acc.chestArmour.push(item);
          break;
        case InventoryBucketHashes[InventoryBucket.LegArmour]:
          acc.legArmour.push(item);
          break;
        case InventoryBucketHashes[InventoryBucket.ClassItem]:
          acc.classItem.push(item);
          break;
      }
      return acc;
    },
    {
      [InventoryBucket.KineticWeapon]: [],
      [InventoryBucket.EnergyWeapon]: [],
      [InventoryBucket.PowerWeapon]: [],
      [InventoryBucket.Ghost]: [],
      [InventoryBucket.Vehicle]: [],
      [InventoryBucket.Ship]: [],
      [InventoryBucket.Helmet]: [],
      [InventoryBucket.Gauntlet]: [],
      [InventoryBucket.ChestArmour]: [],
      [InventoryBucket.LegArmour]: [],
      [InventoryBucket.ClassItem]: []
    } as Record<string, DestinyItemComponent[]>
  );
};
