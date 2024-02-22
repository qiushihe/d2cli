export enum DestinyComponentType {
  None = 0,
  Profiles = 100,
  VendorReceipts = 101,
  ProfileInventories = 102,
  ProfileCurrencies = 103,
  ProfileProgression = 104,
  PlatformSilver = 105,
  Characters = 200,
  CharacterInventories = 201,
  CharacterProgressions = 202,
  CharacterRenderData = 203,
  CharacterActivities = 204,
  CharacterEquipment = 205,
  ItemInstances = 300,
  ItemObjectives = 301,
  ItemPerks = 302,
  ItemRenderData = 303,
  ItemStats = 304,
  ItemSockets = 305,
  ItemTalentGrids = 306,
  ItemCommonData = 307,
  ItemPlugStates = 308,
  ItemPlugObjectives = 309,
  ItemReusablePlugs = 310,
  Vendors = 400,
  VendorCategories = 401,
  VendorSales = 402,
  Kiosks = 500,
  CurrencyLookups = 600,
  PresentationNodes = 700,
  Collectibles = 800,
  Records = 900,
  Transitory = 1000,
  Metrics = 1100,
  StringVariables = 1200,
  Craftables = 1300
}

export enum ItemLocation {
  Unknown = 0,
  Inventory = 1,
  Vault = 2,
  Vendor = 3,
  Postmaster = 4
}

export type DestinyProgressionResetEntry = {
  season: number;
  resets: number;
};

export type DestinyProgression = {
  progressionHash: number;
  dailyProgress: number;
  dailyLimit: number;
  weeklyProgress: number;
  weeklyLimit: number;
  currentProgress: number;
  level: number;
  levelCap: number;
  stepIndex: number;
  progressToNextLevel: number;
  nextLevelAt: number;
  currentResetCount?: number;
  seasonResets?: DestinyProgressionResetEntry[];
  rewardItemStates?: number[];
};

export enum BucketScope {
  Character = 0,
  Account = 1
}

export enum BucketCategory {
  Invisible = 0,
  Item = 1,
  Currency = 2,
  Equippable = 3,
  Ignored = 4
}

export type DestinyStat = {
  statHash: number;
  value: number;
};

// The values are denoted as binary, because plug sources are usually used in
// a bitmask. However, this enum's values can still be used as integers.
export enum SocketPlugSources {
  None = 0b0000, // 0
  InventorySourced = 0b0001, // 1
  ReusablePlugItems = 0b0010, // 2
  ProfilePlugSet = 0b0100, // 4
  CharacterPlugSet = 0b1000 // 8
}

export enum ItemType {
  None = 0,
  Currency = 1,
  Armor = 2,
  Weapon = 3,
  Message = 7,
  Engram = 8,
  Consumable = 9,
  ExchangeMaterial = 10,
  MissionReward = 11,
  QuestStep = 12,
  QuestStepComplete = 13,
  Emblem = 14,
  Quest = 15,
  Subclass = 16,
  ClanBanner = 17,
  Aura = 18,
  Mod = 19,
  Dummy = 20,
  Ship = 21,
  Vehicle = 22,
  Emote = 23,
  Ghost = 24,
  Package = 25,
  Bounty = 26,
  Wrapper = 27,
  SeasonalArtifact = 28,
  Finisher = 29,
  Pattern = 30
}

export enum ItemSubType {
  None = 0,
  AutoRifle = 6,
  Shotgun = 7,
  Machinegun = 8,
  HandCannon = 9,
  RocketLauncher = 10,
  FusionRifle = 11,
  SniperRifle = 12,
  PulseRifle = 13,
  ScoutRifle = 14,
  Sidearm = 17,
  Sword = 18,
  Mask = 19,
  Shader = 20,
  Ornament = 21,
  FusionRifleLine = 22,
  GrenadeLauncher = 23,
  SubmachineGun = 24,
  TraceRifle = 25,
  HelmetArmor = 26,
  GauntletsArmor = 27,
  ChestArmor = 28,
  LegArmor = 29,
  ClassArmor = 30,
  Bow = 31,
  DummyRepeatableBounty = 32,
  Glaive = 33,

  /**
   * @deprecated
   */
  Crucible = 1,

  /**
   * @deprecated
   */
  Vanguard = 2,

  /**
   * @deprecated
   */
  Exotic = 5,

  /**
   * @deprecated
   */
  Crm = 16
}

export enum DamageType {
  None = 0,
  Kinetic = 1,
  Arc = 2,
  Thermal = 3,
  Void = 4,
  Raid = 5,
  Stasis = 6,
  Strand = 7
}

export enum TierType {
  Unknown = 0,
  Currency = 1,
  Basic = 2,
  Common = 3,
  Rare = 4,
  Superior = 5,
  Exotic = 6
}
