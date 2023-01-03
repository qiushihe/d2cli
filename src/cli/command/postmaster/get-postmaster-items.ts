import { AppModule } from "~src/module/app.module";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { BungieApiDestiny2ItemComponent } from "~src/service/destiny2-item/destiny2-item.types";

export const getPostmasterItems = async (
  sessionId: string,
  characterNumber: number
): Promise<[Error, null] | [null, BungieApiDestiny2ItemComponent[]]> => {
  const destiny2CharacterService = AppModule.getDefaultInstance().resolve<Destiny2CharacterService>(
    "Destiny2CharacterService"
  );

  const destiny2InventoryService = AppModule.getDefaultInstance().resolve<Destiny2InventoryService>(
    "Destiny2InventoryService"
  );

  const [charactersErr, characters] = await destiny2CharacterService.getDestiny2Characters(
    sessionId
  );
  if (charactersErr) {
    return [new Error(`Unable to list characters: ${charactersErr.message}`), null];
  }

  const character = characters[characterNumber - 1];
  if (!character) {
    return [new Error(`Character not found at position ${characterNumber}`), null];
  }

  const [postmasterItemsErr, postmasterItems] = await destiny2InventoryService.getPostmasterItems(
    sessionId,
    character.membershipType,
    character.membershipId,
    character.characterId
  );
  if (postmasterItemsErr) {
    return [
      new Error(`Unable to fetch items from postmaster: ${postmasterItemsErr.message}`),
      null
    ];
  }

  return [null, postmasterItems];
};
