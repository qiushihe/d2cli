export type DestinyPlugSetsComponent = {
  plugs: {
    // The "value" part is not typed in Bungie's API documentation.
    // So here we also don't declare a explicit type, and just types the data
    // structure inline.
    [key: number]: {
      plugItemHash: number;
      canInsert: boolean;
      enabled: string;
    }[];
  };
};
