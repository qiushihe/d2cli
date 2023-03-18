export type DestinyPostmasterTransferRequest = {
  membershipType: number;
  characterId: string;
  itemReferenceHash: number; // Item hash
  itemId: string | null; // Item instance ID
  stackSize?: number;
};

export type DestinyItemActionRequest = {
  membershipType: number;
  characterId: string;
  itemId: string; // Item instance ID
};

export enum DestinySocketArrayType {
  Default = 0,
  Intrinsic = 1
}

export type DestinyInsertPlugsRequestEntry = {
  socketIndex: number;
  socketArrayType: DestinySocketArrayType;
  plugItemHash: number;
};

export type DestinyInsertPlugsFreeActionRequest = {
  plug: DestinyInsertPlugsRequestEntry;
  itemId: string;
  characterId: string;
  membershipType: number;
};
