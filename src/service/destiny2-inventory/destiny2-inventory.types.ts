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
