export type DestinyPostmasterTransferRequest = {
  membershipType: number;
  characterId: string;
  itemReferenceHash: number; // Item hash
  itemId: string | null; // Item instance ID
  stackSize?: number;
};
