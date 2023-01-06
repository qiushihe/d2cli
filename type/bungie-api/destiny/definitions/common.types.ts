export type DestinyDisplayPropertiesDefinition = {
  name: string;
  description: string;
  icon: string;
  iconSequences: DestinyIconSequenceDefinition[];
  highResIcon: string;
  hasIcon: boolean;
};

export type DestinyIconSequenceDefinition = {
  frames: string[];
};
