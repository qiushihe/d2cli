import { ComponentDataResolver } from "~src/service/destiny2-component-data/resolver.types";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { DestinyVendorComponent } from "~type/bungie-api/destiny/entities/vendors.types";
import { DestinyVendorsResponse } from "~type/bungie-api/destiny/responses";

export const resolveVendors: ComponentDataResolver<
  DestinyVendorsResponse,
  DestinyVendorComponent[]
> = {
  components: [DestinyComponentType.Vendors],
  resolve: (res) => {
    return res.vendors
      ? [null, Object.values(res.vendors.data)]
      : [new Error("Response missing vendors attribute"), null];
  }
};
