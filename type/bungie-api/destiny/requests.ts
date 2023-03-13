export type DestinyItemTransferRequest = {
  membershipType: number;
  characterId: string;
  transferToVault: boolean;
  itemId: string | null; // Item instance ID
  itemReferenceHash: number; // Item hash
  stackSize?: number;
};
