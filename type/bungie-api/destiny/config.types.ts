import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";

export type DestinyManifest = {
  [key: string]: any;
  version: string;
  jsonWorldComponentContentPaths: Record<Destiny2ManifestLanguage, Record<string, string>>;
};
