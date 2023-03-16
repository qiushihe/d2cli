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
