import { BungieApiDestiny2InventoryComponent } from "~src/service/destiny2-inventory/destiny2-inventory.types";

export type BungieApiDestiny2Character = {
  inventory?: BungieApiDestiny2InventoryComponent;
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
  stats: { [statHash: string]: number };
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

// TODO: Replace with raw API types
export type Destiny2Character = {
  id: string;
  membershipType: number;
  membershipId: string;
  lightLevel: number;
  lastPlayedAt: Date;
  gender: string;
  race: string;
  class: string;
};
