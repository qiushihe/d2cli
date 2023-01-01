import { BungieApiDestiny2InventoryItemLocation } from "~src/service/destiny2-item/destiny2-item.types";

export enum BungieApiDestiny2ManifestLanguage {
  English = "en",
  French = "fr"
}

export enum BungieApiDestiny2ManifestComponent {
  RaceDefinition = "DestinyRaceDefinition",
  GenderDefinition = "DestinyGenderDefinition",
  ClassDefinition = "DestinyClassDefinition",
  InventoryBucketDefinition = "DestinyInventoryBucketDefinition",
  InventoryItemDefinition = "DestinyInventoryItemDefinition"
}

export type BungieApiDestiny2Manifest = {
  [key: string]: any;
  version: string;
  jsonWorldComponentContentPaths: Record<BungieApiDestiny2ManifestLanguage, Record<string, string>>;
};

export type BungieApiDestiny2RaceDefinition = {
  [key: number]: {
    raceType: number;
    displayProperties: {
      name: string;
      description: string;
    };
  };
};

export type BungieApiDestiny2GenderDefinition = {
  [key: number]: {
    genderType: number;
    displayProperties: {
      name: string;
      description: string;
    };
  };
};

export type BungieApiDestiny2ClassDefinition = {
  [key: number]: {
    classType: number;
    displayProperties: {
      name: string;
    };
  };
};

export enum BungieApiDestiny2InventoryBucketScope {
  Character = 0,
  Account = 1
}

export enum BungieApiDestiny2InventoryBucketCategory {
  Invisible = 0,
  Item = 1,
  Currency = 2,
  Equippable = 3,
  Ignored = 4
}

export type BungieApiDestiny2InventoryBucketDefinition = {
  displayProperties: {
    name: string;
    description: string;
  };
  scope: BungieApiDestiny2InventoryBucketScope;
  category: BungieApiDestiny2InventoryBucketCategory;
  location: BungieApiDestiny2InventoryItemLocation;
  bucketOrder: number;
  itemCount: number;
  hasTransferDestination: boolean;
  enabled: boolean;
  fifo: boolean;
  hash: number;
  index: number;
  redacted: boolean;
};

export type BungieApiDestiny2InventoryBucketDefinitions = Record<
  number,
  BungieApiDestiny2InventoryBucketDefinition
>;

export type BungieApiDestiny2InventoryItemDefinition = {
  displayProperties: {
    name: string;
    description: string;
  };
  tooltipNotifications: unknown[];
  collectibleHash?: number;
  iconWatermark: string;
  iconWatermarkShelved?: string;
  backgroundColor: unknown;
  screenshot?: string;
  itemTypeDisplayName: string;
  flavorText: string;
  uiItemDisplayStyle: string;
  itemTypeAndTierDisplayName: string;
  displaySource: string;
  action: unknown;
  crafting?: unknown;
  inventory: {
    maxStackSize: number;
    bucketTypeHash: number;
    recoveryBucketTypeHash: number;
    tierTypeHash: number;
    isInstanceItem: number;
    tierTypeName: string;
    tierType: number;
  };
  stats?: unknown;
  equippingBlock?: unknown;
  translationBlock?: unknown;
  preview?: unknown;
  quality?: unknown;
  acquireRewardSiteHash?: number;
  acquireUnlockHash?: number;
  sockets?: unknown;
  talentGrid?: unknown;
  investmentStats: unknown[];
  perks: unknown[];
  summaryItemHash?: number;
  allowActions: boolean;
  doesPostmasterPullHaveSideEffects: boolean;
  nonTransferrable: boolean;
  itemCategoryHashes: number[];
  specialItemType: number;
  itemType: number;
  itemSubType: number;
  classType: number;
  breakerType: number;
  equippable: boolean;
  defaultDamageType?: number;
  damageTypeHashes?: number[];
  isWrapper: boolean;
  traitIds?: string[];
  traitHashes?: number[];
  hash: number;
  index: number;
  redacted: boolean;
  blacklisted: boolean;
};

export type BungieApiDestiny2InventoryItemDefinitions = Record<
  number,
  BungieApiDestiny2InventoryItemDefinition
>;
