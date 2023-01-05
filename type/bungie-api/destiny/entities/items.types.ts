import { ItemLocation } from "~type/bungie-api/destiny.types";

export type DestinyItemComponent = {
  itemHash: number;
  itemInstanceId: string;
  quantity: number;
  bindStatus: number;
  location: ItemLocation;
  bucketHash: number;
  transferStatus: number;
  lockable: boolean;
  state: number;
  dismantlePermission: number;
  isWrapper: boolean;
  tooltipNotificationIndexes: unknown[];
};
