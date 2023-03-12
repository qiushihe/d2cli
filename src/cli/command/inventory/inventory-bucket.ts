import { CharacterInventoryBuckets } from "~src/service/destiny2-inventory/destiny2-inventory.types";
import { CharacterInventoryBucketHashes } from "~src/service/destiny2-inventory/destiny2-inventory.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

export const BucketLabels: Record<CharacterInventoryBuckets, string> = {
  [CharacterInventoryBuckets.KineticWeapon]: "Kinetic Weapon",
  [CharacterInventoryBuckets.EnergyWeapon]: "Energy Weapon",
  [CharacterInventoryBuckets.PowerWeapon]: "Power Weapon",
  [CharacterInventoryBuckets.Ghost]: "Ghost",
  [CharacterInventoryBuckets.Vehicle]: "Vehicle",
  [CharacterInventoryBuckets.Ship]: "Ship",
  [CharacterInventoryBuckets.Helmet]: "Helmet",
  [CharacterInventoryBuckets.Gauntlet]: "Gauntlet",
  [CharacterInventoryBuckets.ChestArmour]: "Chest Armour",
  [CharacterInventoryBuckets.LegArmour]: "Leg Armour",
  [CharacterInventoryBuckets.ClassItem]: "Class Item"
};

export const BucketOrder = [
  CharacterInventoryBuckets.KineticWeapon,
  CharacterInventoryBuckets.EnergyWeapon,
  CharacterInventoryBuckets.PowerWeapon,
  CharacterInventoryBuckets.Helmet,
  CharacterInventoryBuckets.Gauntlet,
  CharacterInventoryBuckets.ChestArmour,
  CharacterInventoryBuckets.LegArmour,
  CharacterInventoryBuckets.ClassItem,
  CharacterInventoryBuckets.Ghost,
  CharacterInventoryBuckets.Vehicle,
  CharacterInventoryBuckets.Ship
];

export const groupInventoryItems = (
  item: DestinyItemComponent[]
): Record<CharacterInventoryBuckets, DestinyItemComponent[]> => {
  return item.reduce(
    (acc, item) => {
      switch (item.bucketHash) {
        case CharacterInventoryBucketHashes[CharacterInventoryBuckets.KineticWeapon]:
          acc.kineticWeapon.push(item);
          break;
        case CharacterInventoryBucketHashes[CharacterInventoryBuckets.EnergyWeapon]:
          acc.energyWeapon.push(item);
          break;
        case CharacterInventoryBucketHashes[CharacterInventoryBuckets.PowerWeapon]:
          acc.powerWeapon.push(item);
          break;
        case CharacterInventoryBucketHashes[CharacterInventoryBuckets.Ghost]:
          acc.ghost.push(item);
          break;
        case CharacterInventoryBucketHashes[CharacterInventoryBuckets.Vehicle]:
          acc.vehicle.push(item);
          break;
        case CharacterInventoryBucketHashes[CharacterInventoryBuckets.Ship]:
          acc.ship.push(item);
          break;
        case CharacterInventoryBucketHashes[CharacterInventoryBuckets.Helmet]:
          acc.helmet.push(item);
          break;
        case CharacterInventoryBucketHashes[CharacterInventoryBuckets.Gauntlet]:
          acc.gauntlet.push(item);
          break;
        case CharacterInventoryBucketHashes[CharacterInventoryBuckets.ChestArmour]:
          acc.chestArmour.push(item);
          break;
        case CharacterInventoryBucketHashes[CharacterInventoryBuckets.LegArmour]:
          acc.legArmour.push(item);
          break;
        case CharacterInventoryBucketHashes[CharacterInventoryBuckets.ClassItem]:
          acc.classItem.push(item);
          break;
      }
      return acc;
    },
    {
      [CharacterInventoryBuckets.KineticWeapon]: [],
      [CharacterInventoryBuckets.EnergyWeapon]: [],
      [CharacterInventoryBuckets.PowerWeapon]: [],
      [CharacterInventoryBuckets.Ghost]: [],
      [CharacterInventoryBuckets.Vehicle]: [],
      [CharacterInventoryBuckets.Ship]: [],
      [CharacterInventoryBuckets.Helmet]: [],
      [CharacterInventoryBuckets.Gauntlet]: [],
      [CharacterInventoryBuckets.ChestArmour]: [],
      [CharacterInventoryBuckets.LegArmour]: [],
      [CharacterInventoryBuckets.ClassItem]: []
    } as Record<CharacterInventoryBuckets, DestinyItemComponent[]>
  );
};
