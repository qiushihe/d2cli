import { AppModule } from "~src/module/app.module";
import { Destiny2PostmasterService } from "~src/service/destiny2-postmaster/destiny2-postmaster.service";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

export const getPostmasterItems = async (
  sessionId: string,
  membershipType: number,
  membershipId: string,
  characterId: string
): Promise<[Error, null] | [null, DestinyItemComponent[]]> => {
  const destiny2PostmasterService =
    AppModule.getDefaultInstance().resolve<Destiny2PostmasterService>("Destiny2PostmasterService");

  const [postmasterItemsErr, postmasterItems] = await destiny2PostmasterService.getItems(
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
