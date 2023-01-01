export enum BungieApiDestiny2InventoryItemLocation {
  Unknown = 0,
  Inventory = 1,
  Vault = 2,
  Vendor = 3,
  Postmaster = 4
}

export type BungieApiDestiny2ItemComponent = {
  itemHash: number;
  itemInstanceId: string;
  quantity: number;
  bindStatus: number;
  location: BungieApiDestiny2InventoryItemLocation;
  bucketHash: number;
  transferStatus: number;
  lockable: boolean;
  state: number;
  dismantlePermission: number;
  isWrapper: boolean;
  tooltipNotificationIndexes: unknown[];
};
