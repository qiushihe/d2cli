import { BungieApiDestiny2CharactersComponent } from "~src/service/destiny2-character/destiny2-character.types";

export type BungieApiDestiny2Profile = {
  responseMintedTimestamp: string;
  secondaryComponentsMintedTimestamp: string;
  characters?: BungieApiDestiny2CharactersComponent;
};
