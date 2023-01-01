import { BungieApiDestiny2ItemComponent } from "~src/service/destiny2-item/destiny2-item.types";

export type BungieApiDestiny2InventoryComponent = {
  data: {
    items: BungieApiDestiny2ItemComponent[];
  };
  privacy: number;
};
