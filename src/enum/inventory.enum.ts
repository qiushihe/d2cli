export enum InventoryBucket {
  Subclass = "subclass",
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
  ClassItem = "classItem",
  ClanBanner = "clanBanner",
  Emblem = "emblem",
  Finisher = "finisher",
  Quest = "quest",
  Consumable = "consumable",
  Emote = "emote",
  CommonEmotes = "commonEmotes",
  SeasonalArtifact = "seasonalArtifact",
  Modification = "modification"
}

export const InventoryBucketHashes: Record<InventoryBucket, number> = {
  [InventoryBucket.Subclass]: 3284755031,
  [InventoryBucket.KineticWeapon]: 1498876634,
  [InventoryBucket.EnergyWeapon]: 2465295065,
  [InventoryBucket.PowerWeapon]: 953998645,
  [InventoryBucket.Ghost]: 4023194814,
  [InventoryBucket.Vehicle]: 2025709351,
  [InventoryBucket.Ship]: 284967655,
  [InventoryBucket.Helmet]: 3448274439,
  [InventoryBucket.Gauntlet]: 3551918588,
  [InventoryBucket.ChestArmour]: 14239492,
  [InventoryBucket.LegArmour]: 20886954,
  [InventoryBucket.ClassItem]: 1585787867,
  [InventoryBucket.ClanBanner]: 4292445962,
  [InventoryBucket.Emblem]: 4274335291,
  [InventoryBucket.Finisher]: 3683254069,
  [InventoryBucket.Quest]: 1345459588,
  [InventoryBucket.Consumable]: 1469714392,
  [InventoryBucket.Emote]: 2401704334,
  [InventoryBucket.CommonEmotes]: 1107761855,
  [InventoryBucket.SeasonalArtifact]: 1506418338,
  [InventoryBucket.Modification]: 3313201758
};

export const InventoryBucketLabels: Record<InventoryBucket, string> = {
  [InventoryBucket.Subclass]: "Subclass",
  [InventoryBucket.KineticWeapon]: "Kinetic Weapon",
  [InventoryBucket.EnergyWeapon]: "Energy Weapon",
  [InventoryBucket.PowerWeapon]: "Power Weapon",
  [InventoryBucket.Ghost]: "Ghost",
  [InventoryBucket.Vehicle]: "Vehicle",
  [InventoryBucket.Ship]: "Ship",
  [InventoryBucket.Helmet]: "Helmet",
  [InventoryBucket.Gauntlet]: "Gauntlet",
  [InventoryBucket.ChestArmour]: "Chest Armour",
  [InventoryBucket.LegArmour]: "Leg Armour",
  [InventoryBucket.ClassItem]: "Class Item",
  [InventoryBucket.ClanBanner]: "Clan Banner",
  [InventoryBucket.Emblem]: "Emblem",
  [InventoryBucket.Finisher]: "Finisher",
  [InventoryBucket.Quest]: "Quest",
  [InventoryBucket.Consumable]: "Consumable",
  [InventoryBucket.Emote]: "Emote",
  [InventoryBucket.CommonEmotes]: "Common Emote",
  [InventoryBucket.SeasonalArtifact]: "Seasonal Artifact",
  [InventoryBucket.Modification]: "Modification"
};

export const WeaponBuckets = [
  InventoryBucket.KineticWeapon,
  InventoryBucket.EnergyWeapon,
  InventoryBucket.PowerWeapon
];

export const ArmourBuckets = [
  InventoryBucket.Helmet,
  InventoryBucket.Gauntlet,
  InventoryBucket.ChestArmour,
  InventoryBucket.LegArmour,
  InventoryBucket.ClassItem
];

export const EquipmentBuckets = [
  ...WeaponBuckets,
  ...ArmourBuckets,
  InventoryBucket.Ghost,
  InventoryBucket.Vehicle,
  InventoryBucket.Ship
];
