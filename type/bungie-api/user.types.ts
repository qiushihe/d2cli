export type GeneralUser = {
  membershipId: string;
  uniqueName: string;
  normalizedName: string;
  displayName: string;
};

export type UserInfoCard = {
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
