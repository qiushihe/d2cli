import { DamageType, ItemLocation, TierType } from "~type/bungie-api/destiny.types";
import { BucketScope } from "~type/bungie-api/destiny.types";
import { BucketCategory } from "~type/bungie-api/destiny.types";
import { DestinyDisplayPropertiesDefinition } from "~type/bungie-api/destiny/definitions/common.types";
import { DestinyIconSequenceDefinition } from "~type/bungie-api/destiny/definitions/common.types";

type AbstractDefinition<TDefinition> = TDefinition & {
  hash: number;
  index: number;
  redacted?: boolean;
  blacklisted?: boolean;
};

export type DestinyRaceDefinition = AbstractDefinition<{
  raceType: number;
  displayProperties: DestinyDisplayPropertiesDefinition;
}>;

export type DestinyGenderDefinition = AbstractDefinition<{
  genderType: number;
  displayProperties: DestinyDisplayPropertiesDefinition;
}>;

export type DestinyClassDefinition = AbstractDefinition<{
  classType: number;
  displayProperties: DestinyDisplayPropertiesDefinition;
}>;

export type DestinyInventoryBucketDefinition = AbstractDefinition<{
  displayProperties: DestinyDisplayPropertiesDefinition;
  scope: BucketScope;
  category: BucketCategory;
  location: ItemLocation;
  bucketOrder: number;
  itemCount: number;
  hasTransferDestination: boolean;
  enabled: boolean;
  fifo: boolean;
}>;

export type DestinyItemSocketEntryPlugItemDefinition = {
  plugItemHash: number;
};

export type DestinyItemSocketEntryDefinition = {
  socketTypeHash: number;
  singleInitialItemHash: number;
  reusablePlugItems: DestinyItemSocketEntryPlugItemDefinition[];
  preventInitializationOnVendorPurchase: boolean;
  hidePerksInItemTooltip: boolean;
  plugSources: number; // Bitmask; See Destiny.SocketPlugSources
  reusablePlugSetHash?: number;
  randomizedPlugSetHash?: number;
  defaultVisible: boolean;
};

export type DestinyItemIntrinsicSocketEntryDefinition = {
  plugItemHash: number;
  socketTypeHash: number;
  defaultVisible: boolean;
};

export type DestinyItemSocketCategoryDefinition = {
  socketCategoryHash: number;
  socketIndexes: number[];
};

export type DestinyItemSocketBlockDefinition = {
  detail: string;
  socketEntries: DestinyItemSocketEntryDefinition[];
  intrinsicSockets: DestinyItemIntrinsicSocketEntryDefinition[];
  socketCategories: DestinyItemSocketCategoryDefinition[];
};

export type DestinyItemInventoryBlockDefinition = {
  stackUniqueLabel: string;
  maxStackSize: number;
  bucketTypeHash: number;
  recoveryBucketTypeHash: number;
  tierTypeHash: number;
  isInstanceItem: boolean;
  tierTypeName: string;
  tierType: TierType;
  expirationTooltip: string;
  expiredInActivityMessage: string;
  expiredInOrbitMessage: string;
  suppressExpirationWhenObjectivesComplete: boolean;
  recipeItemHash?: number;
};

export type DestinyInventoryItemDefinition = AbstractDefinition<{
  displayProperties: DestinyDisplayPropertiesDefinition;
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
  inventory: DestinyItemInventoryBlockDefinition;
  stats?: unknown;
  equippingBlock?: unknown;
  translationBlock?: unknown;
  preview?: unknown;
  quality?: unknown;
  acquireRewardSiteHash?: number;
  acquireUnlockHash?: number;
  sockets?: DestinyItemSocketBlockDefinition;
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
}>;

export type DestinyStatDefinition = AbstractDefinition<{
  displayProperties: DestinyDisplayPropertiesDefinition;
  aggregationType: number;
  hasComputedBlock: boolean;
  statCategory: number;
  interpolate: boolean;
}>;

export type DestinyProgressionDefinition = AbstractDefinition<{
  displayProperties: DestinyDisplayPropertiesDefinition;
  scope: number;
  repeatLastStep: boolean;
  source: number;
  steps: any[];
  visible: boolean;
  factionHash?: number;
  rewardItems: any[];
}>;

export type DestinyVendorGroupDefinition = AbstractDefinition<{
  order: number;
  categoryName: string;
}>;

export type DestinyVendorDisplayPropertiesDefinition = {
  largeIcon: string;
  subtitle: string;
  originalIcon: string;
  requirementsDisplay: any[];
  smallTransparentIcon: string;
  mapIcon: string;
  largeTransparentIcon: string;
  description: string;
  name: string;
  icon: string;
  iconSequences: DestinyIconSequenceDefinition[];
  highResIcon: string;
  hasIcon: boolean;
};

export type DestinyVendorGroupReference = {
  vendorGroupHash: number;
};

export type DestinyVendorLocationDefinition = {
  destinationHash: number;
  backgroundImagePath: string;
};

export type DestinyVendorDefinition = AbstractDefinition<{
  displayProperties: DestinyVendorDisplayPropertiesDefinition;
  vendorProgressionType: number;
  buyString: string;
  sellString: string;
  displayItemHash: number;
  inhibitBuying: boolean;
  inhibitSelling: boolean;
  factionHash: number;
  resetIntervalMinutes: number;
  resetOffsetMinutes: number;
  failureStrings: string[];
  unlockRanges: any[];
  vendorIdentifier: string;
  vendorPortrait: string;
  vendorBanner: string;
  enabled: boolean;
  visible: boolean;
  vendorSubcategoryIdentifier: string;
  consolidateCategories: boolean;
  actions: any[];
  categories: any[];
  originalCategories: any[];
  displayCategories: any[];
  interactions: any[];
  inventoryFlyouts: any[];
  itemList: any[];
  services: any[];
  acceptedItems: any[];
  returnWithVendorRequest: boolean;
  locations: DestinyVendorLocationDefinition[];
  groups: DestinyVendorGroupReference[];
  ignoreSaleItemHashes: number[];
}>;

export type DestinyDestinationDefinition = AbstractDefinition<{
  displayProperties: DestinyDisplayPropertiesDefinition;
  placeHash: number;
  defaultFreeroamActivityHash: number;
  activityGraphEntries: any[];
  bubbleSettings: any[];
  bubbles: any[];
}>;

export type DestinyPlaceDefinition = AbstractDefinition<{
  displayProperties: DestinyDisplayPropertiesDefinition;
}>;

export type DestinyDamageTypeDefinition = AbstractDefinition<{
  displayProperties: DestinyDisplayPropertiesDefinition;
  transparentIconPath: string;
  showIcon: boolean;
  enumValue: DamageType;
  color: any;
}>;
