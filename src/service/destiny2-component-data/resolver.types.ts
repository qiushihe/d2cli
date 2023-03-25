import { DestinyComponentType } from "~type/bungie-api/destiny.types";

export type ComponentDataResolver<TResponse, TData> = {
  components: DestinyComponentType[];
  resolve: (res: TResponse) => [Error, null] | [null, TData];
};
