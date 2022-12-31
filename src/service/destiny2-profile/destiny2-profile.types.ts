import { BungieApiDestiny2Character } from "~src/service/destiny2-character/destiny2-character.types";

export type BungieApiDestiny2Profile = {
  responseMintedTimestamp: string;
  secondaryComponentsMintedTimestamp: string;
  characters?: {
    data: { [characterId: string]: BungieApiDestiny2Character };
    privacy: number;
  };
};
