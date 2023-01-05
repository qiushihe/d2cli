import { ItemLocation } from "~type/bungie-api/destiny.types";
import { BucketScope } from "~type/bungie-api/destiny.types";
import { BucketCategory } from "~type/bungie-api/destiny.types";

export type DestinyRaceDefinition = {
  raceType: number;
  displayProperties: {
    name: string;
    description: string;
  };
};

export type DestinyGenderDefinition = {
  genderType: number;
  displayProperties: {
    name: string;
    description: string;
  };
};

export type DestinyClassDefinition = {
  classType: number;
  displayProperties: {
    name: string;
  };
};

export type DestinyInventoryBucketDefinition = {
  displayProperties: {
    name: string;
    description: string;
  };
  scope: BucketScope;
  category: BucketCategory;
  location: ItemLocation;
  bucketOrder: number;
  itemCount: number;
  hasTransferDestination: boolean;
  enabled: boolean;
  fifo: boolean;
  hash: number;
  index: number;
  redacted: boolean;
};

export type DestinyInventoryItemDefinition = {
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
  inventory: unknown;
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

export type DestinyStatDefinition = {
  displayProperties: {
    name: string;
    description: string;
  };
  aggregationType: number;
  hasComputedBlock: boolean;
  statCategory: number;
  interpolate: boolean;
  hash: number;
  index: number;
  redacted: boolean;
  blacklisted: boolean;
};

export type DestinyProgressionDefinition = {
  displayProperties: {
    name: string;
    description: string;
    displayUnitsName: string;
  };
  scope: number;
  repeatLastStep: boolean;
  source: number;
  steps: any[];
  visible: boolean;
  factionHash?: number;
  rewardItems: any[];
  hash: number;
  index: number;
  redacted: boolean;
  blacklisted: boolean;
};
