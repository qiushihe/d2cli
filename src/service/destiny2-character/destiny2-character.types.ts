import { BungieApiDestiny2InventoryComponent } from "~src/service/destiny2-inventory/destiny2-inventory.types";

export type BungieApiDestiny2CharacterResponse = {
  character?: { data: BungieApiDestiny2CharacterComponent };
  inventory?: { data: BungieApiDestiny2InventoryComponent; privacy: number };
};

export type BungieApiDestiny2CharactersComponent = {
  data: { [characterId: string]: BungieApiDestiny2CharacterComponent };
  privacy: number;
};

export type BungieApiDestiny2CharacterComponent = {
  membershipId: string;
  membershipType: number;
  characterId: string;
  dateLastPlayed: string;
  minutesPlayedThisSession: string;
  minutesPlayedTotal: string;
  light: number;
  stats: { [statHash: number]: number };
  raceHash: number;
  genderHash: number;
  classHash: number;
  raceType: number;
  classType: number;
  genderType: number;
  emblemPath: string;
  emblemBackgroundPath: string;
  emblemHash: number;
  emblemColor: { red: number; green: number; blue: number; alpha: number };
  levelProgression: {
    progressionHash: number;
    dailyProgress: number;
    dailyLimit: number;
    weeklyProgress: number;
    weeklyLimit: number;
    currentProgress: number;
    level: number;
    levelCap: number;
    stepIndex: number;
    progressToNextLevel: number;
    nextLevelAt: number;
  };
  baseCharacterLevel: number;
  percentToNextLevel: number;
  titleRecordHash: number;
};

export type CharacterReference = {
  membershipType: number;
  membershipId: string;
  characterId: string;
};
