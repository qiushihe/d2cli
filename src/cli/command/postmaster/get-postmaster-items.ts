import { AppModule } from "~src/module/app.module";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

export const getPostmasterItems = async (
  sessionId: string,
  membershipType: number,
  membershipId: string,
  characterId: string
): Promise<[Error, null] | [null, DestinyItemComponent[]]> => {
  const destiny2InventoryService = AppModule.getDefaultInstance().resolve<Destiny2InventoryService>(
    "Destiny2InventoryService"
  );

  const [postmasterItemsErr, postmasterItems] = await destiny2InventoryService.getPostmasterItems(
    sessionId,
    membershipType,
    membershipId,
    characterId
  );
  if (postmasterItemsErr) {
    return [
      new Error(`Unable to fetch items from postmaster: ${postmasterItemsErr.message}`),
      null
    ];
  }

  return [null, postmasterItems];
};
