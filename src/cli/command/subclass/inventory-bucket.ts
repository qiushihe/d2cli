import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

export const SubclassInventoryBucketHash = 3284755031;

export const getSubclassItems = (items: DestinyItemComponent[]): DestinyItemComponent[] => {
  return items.filter((item) => {
    return item.bucketHash === SubclassInventoryBucketHash;
  });
};
