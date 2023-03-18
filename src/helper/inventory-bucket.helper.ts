import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

export const SubclassInventoryBucketHash = 3284755031;

export const getSubclassItems = (items: DestinyItemComponent[]): DestinyItemComponent[] => {
  return items.filter((item) => {
    return item.bucketHash === SubclassInventoryBucketHash;
  });
};

export enum CharacterInventoryBuckets {
  KineticWeapon = "kineticWeapon",
  EnergyWeapon = "energyWeapon",
  PowerWeapon = "powerWeapon",
  Ghost = "ghost",
  Vehicle = "vehicle",
  Ship = "ship",
  Helmet = "helmet",
  Gauntlet = "gauntlet",
  ChestArmour = "chestArmour",
  LegArmour = "legArmour",
  ClassItem = "classItem"
}

export const CharacterInventoryBucketHashes: Record<CharacterInventoryBuckets, number> = {
  [CharacterInventoryBuckets.KineticWeapon]: 1498876634,
  [CharacterInventoryBuckets.EnergyWeapon]: 2465295065,
  [CharacterInventoryBuckets.PowerWeapon]: 953998645,
  [CharacterInventoryBuckets.Ghost]: 4023194814,
  [CharacterInventoryBuckets.Vehicle]: 2025709351,
  [CharacterInventoryBuckets.Ship]: 284967655,
  [CharacterInventoryBuckets.Helmet]: 3448274439,
  [CharacterInventoryBuckets.Gauntlet]: 3551918588,
  [CharacterInventoryBuckets.ChestArmour]: 14239492,
  [CharacterInventoryBuckets.LegArmour]: 20886954,
  [CharacterInventoryBuckets.ClassItem]: 1585787867
};

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

export const ArmourInventoryBuckets = [
  CharacterInventoryBuckets.Helmet,
  CharacterInventoryBuckets.Gauntlet,
  CharacterInventoryBuckets.ChestArmour,
  CharacterInventoryBuckets.LegArmour,
  CharacterInventoryBuckets.ClassItem
];

export const ArmourInventoryBucketHashes = ArmourInventoryBuckets.map(
  (bucket) => CharacterInventoryBucketHashes[bucket]
);

export const groupInventoryItems = (
  items: DestinyItemComponent[]
): Record<CharacterInventoryBuckets, DestinyItemComponent[]> => {
  return items.reduce(
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
