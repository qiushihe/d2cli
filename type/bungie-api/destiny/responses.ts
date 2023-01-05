import { SingleComponentResponseOfDestinyCharacterComponent } from "~type/bungie-api.types";
import { SingleComponentResponseOfDestinyCharacterProgressionComponent } from "~type/bungie-api.types";
import { SingleComponentResponseOfDestinyInventoryComponent } from "~type/bungie-api.types";
import { DictionaryComponentResponseOfint64AndDestinyCharacterComponent } from "~type/bungie-api.types";

export type DestinyCharacterResponse = {
  character?: SingleComponentResponseOfDestinyCharacterComponent;
  inventory?: SingleComponentResponseOfDestinyInventoryComponent;
  progressions?: SingleComponentResponseOfDestinyCharacterProgressionComponent;
};

export type DestinyProfileResponse = {
  characters?: DictionaryComponentResponseOfint64AndDestinyCharacterComponent;
};
