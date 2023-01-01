export type BungieApiDestiny2Membership = {
  iconPath: string;
  crossSaveOverride: number;
  applicableMembershipTypes: number[];
  isPublic: boolean;
  membershipType: number;
  membershipId: string;
  displayName: string;
  bungieGlobalDisplayName: string;
  bungieGlobalDisplayNameCode: number;
};

// TODO: Replace with raw API types
export type Destiny2Membership = {
  type: number;
  id: string;
  displayName: string;
};
