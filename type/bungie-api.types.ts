import { DestinyCharacterComponent } from "~type/bungie-api/destiny/entities/characters.types";
import { DestinyCharacterProgressionComponent } from "~type/bungie-api/destiny/entities/characters.types";
import { DestinyInventoryComponent } from "~type/bungie-api/destiny/entities/inventory.types";

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
