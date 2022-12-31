export enum BungieApiDestiny2ManifestLanguage {
  English = "en",
  French = "fr"
}

export enum BungieApiDestiny2ManifestComponent {
  RaceDefinition = "DestinyRaceDefinition",
  GenderDefinition = "DestinyGenderDefinition",
  ClassDefinition = "DestinyClassDefinition"
}

export type BungieApiDestiny2Manifest = {
  [key: string]: any;
  version: string;
  jsonWorldComponentContentPaths: Record<BungieApiDestiny2ManifestLanguage, Record<string, string>>;
};

export type BungieApiDestiny2RaceDefinition = {
  [key: number]: {
    raceType: number;
    displayProperties: {
      name: string;
      description: string;
    };
  };
};

export type BungieApiDestiny2GenderDefinition = {
  [key: number]: {
    genderType: number;
    displayProperties: {
      name: string;
      description: string;
    };
  };
};

export type BungieApiDestiny2ClassDefinition = {
  [key: number]: {
    classType: number;
    displayProperties: {
      name: string;
    };
  };
};
