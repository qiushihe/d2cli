// This "plug component" is not typed in Bungie's API documentation.
export type DestinyPlugComponent = {
  plugItemHash: number;
  canInsert: boolean;
  enabled: string;
};

export type DestinyPlugSetsComponent = {
  plugs: {
    [key: number]: DestinyPlugComponent[];
  };
};
