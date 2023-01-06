import { DestinyProgression } from "~type/bungie-api/destiny.types";

export type DestinyVendorComponent = {
  canPurchase: boolean;
  progression?: DestinyProgression;
  vendorLocationIndex: number;
  seasonalRank?: number;
  vendorHash: number;
  nextRefreshDate: string;
  enabled: boolean;
};
