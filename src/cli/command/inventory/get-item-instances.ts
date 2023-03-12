import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2ItemService } from "~src/service/destiny2-item/destiny2-item.service";
import { DestinyItemInstanceComponent } from "~type/bungie-api/destiny/entities/items.types";

export const getIndexedItemInstances = async (
  sessionId: string,
  membershipType: number,
  membershipId: string,
  itemInstanceIds: string[]
): Promise<[Error, null] | [null, Record<string, DestinyItemInstanceComponent>]> => {
  const destiny2ItemService =
    AppModule.getDefaultInstance().resolve<Destiny2ItemService>("Destiny2ItemService");

  const itemInstanceById: Record<string, DestinyItemInstanceComponent> = {};

  for (
    let itemInstanceIdIndex = 0;
    itemInstanceIdIndex < itemInstanceIds.length;
    itemInstanceIdIndex++
  ) {
    const itemInstanceId = itemInstanceIds[itemInstanceIdIndex];

    const [itemInstanceErr, itemInstance] = await fnWithSpinner(
      `Fetching item instance ${itemInstanceIdIndex + 1} of ${itemInstanceIds.length} ...`,
      () =>
        destiny2ItemService.getItemInstance(sessionId, membershipType, membershipId, itemInstanceId)
    );
    if (itemInstanceErr) {
      return [itemInstanceErr, null];
    } else {
      itemInstanceById[itemInstanceId] = itemInstance;
    }
  }

  return [null, itemInstanceById];
};
