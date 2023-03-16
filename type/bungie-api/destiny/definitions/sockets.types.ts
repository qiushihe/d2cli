import { DestinyDisplayPropertiesDefinition } from "~type/bungie-api/destiny/definitions/common.types";

export type DestinySocketTypeDefinition = {
  displayProperties: DestinyDisplayPropertiesDefinition;
  insertAction: any;
  plugWhitelist: any[];
  socketCategoryHash: number;
  visibility: number;
  alwaysRandomizeSockets: boolean;
  isPreviewEnabled: boolean;
  hideDuplicateReusablePlugs: boolean;
  overridesUiAppearance: boolean;
  avoidDuplicatesOnInitialization: boolean;
  currencyScalars: any[];
  hash: number;
  index: number;
  redacted: boolean;
};

export type DestinySocketCategoryDefinition = {
  displayProperties: DestinyDisplayPropertiesDefinition;
  uiCategoryStyle: number;
  categoryStyle: number;
  hash: number;
  index: number;
  redacted: boolean;
};
