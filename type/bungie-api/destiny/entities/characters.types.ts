import { DestinyProgression } from "~type/bungie-api/destiny.types";

export type DestinyCharacterComponent = {
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
  levelProgression: DestinyProgression;
  baseCharacterLevel: number;
  percentToNextLevel: number;
  titleRecordHash: number;
};

export type DestinyCharacterProgressionComponent = {
  progressions: { [key: number]: DestinyProgression };
  factions: any;
  milestones: any;
  quests: any;
  uninstancedItemObjectives: any;
  uninstancedItemPerks: any;
  checklists: any;
  seasonalArtifact: any;
};
