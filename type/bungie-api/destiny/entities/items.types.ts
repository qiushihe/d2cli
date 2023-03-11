import { ItemLocation } from "~type/bungie-api/destiny.types";
import { DestinyStat } from "~type/bungie-api/destiny.types";

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

export type DestinyItemInstanceComponent = {
  damageType: number;
  damageTypeHash?: number;
  primaryStat?: DestinyStat;
  itemLevel: number;
  quality: number;
  isEquipped: boolean;
  canEquip: boolean;
  equipRequiredLevel: number;
  unlockHashesRequiredToEquip: any;
  cannotEquipReason: number;
  breakerType: any;
  breakerTypeHash: any;
  energy: any;
};
