import { ComponentDataResolver } from "~src/service/destiny2-component-data/resolver.types";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { DestinyItemSocketsComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyItemResponse } from "~type/bungie-api/destiny/responses";

export const resolveItemSockets: ComponentDataResolver<
  DestinyItemResponse,
  DestinyItemSocketsComponent
> = {
  components: [DestinyComponentType.ItemSockets],
  resolve: (res) => {
    return res.sockets
      ? [null, res.sockets.data]
      : [new Error("Response missing vendors attribute"), null];
  }
};
