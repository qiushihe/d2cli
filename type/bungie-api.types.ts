import { DestinyPlugSetsComponent } from "~type/bungie-api/destiny/components/plug-sets.types";
import { DestinyVendorGroupComponent } from "~type/bungie-api/destiny/components/vendors.types";
import { DestinyCharacterComponent } from "~type/bungie-api/destiny/entities/characters.types";
import { DestinyCharacterProgressionComponent } from "~type/bungie-api/destiny/entities/characters.types";
import { DestinyInventoryComponent } from "~type/bungie-api/destiny/entities/inventory.types";
import { DestinyItemInstanceComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyItemSocketsComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyVendorComponent } from "~type/bungie-api/destiny/entities/vendors.types";

export type ApiResponse<TResponse = any> = {
  [key: string]: any;
  Response?: TResponse;
  ErrorCode: number;
  ThrottleSeconds: number;
  ErrorStatus: string;
  Message: string;
  MessageData: any;
  DetailedErrorTrace: string;
};

export type SingleComponentResponseOfDestinyItemInstanceComponent = {
  data: DestinyItemInstanceComponent;
  privacy: number;
  disabled?: boolean;
};

export type SingleComponentResponseOfDestinyInventoryComponent = {
  data: DestinyInventoryComponent;
  privacy: number;
  disabled?: boolean;
};

export type SingleComponentResponseOfDestinyCharacterComponent = {
  data: DestinyCharacterComponent;
  privacy: number;
  disabled?: boolean;
};

export type SingleComponentResponseOfDestinyCharacterProgressionComponent = {
  data: DestinyCharacterProgressionComponent;
  privacy: number;
  disabled?: boolean;
};

export type DictionaryComponentResponseOfint64AndDestinyCharacterComponent = {
  data: { [key: number]: DestinyCharacterComponent };
  privacy: number;
  disabled?: boolean;
};

export type SingleComponentResponseOfDestinyVendorGroupComponent = {
  data: DestinyVendorGroupComponent;
  privacy: number;
  disabled?: boolean;
};

export type DictionaryComponentResponseOfuint32AndDestinyVendorComponent = {
  data: { [key: number]: DestinyVendorComponent };
  privacy: number;
  disabled?: boolean;
};

export type DictionaryComponentResponseOfint64AndDestinyItemInstanceComponent = {
  data: { [key: string]: DestinyItemInstanceComponent };
  privacy: number;
  disabled?: boolean;
};

export type DestinyItemComponentSetOfint64 = {
  instances?: DictionaryComponentResponseOfint64AndDestinyItemInstanceComponent;
};

export type SingleComponentResponseOfDestinyPlugSetsComponent = {
  data: DestinyPlugSetsComponent;
  privacy: number;
  disabled?: boolean;
};

export type DictionaryComponentResponseOfint64AndDestinyPlugSetsComponent = {
  data: { [key: string]: DestinyPlugSetsComponent };
  privacy: number;
  disabled?: boolean;
};

export type SingleComponentResponseOfDestinyItemSocketsComponent = {
  data: DestinyItemSocketsComponent;
  privacy: number;
  disabled?: boolean;
};
