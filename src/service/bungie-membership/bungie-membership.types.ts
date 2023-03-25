import { UserInfoCard } from "~type/bungie-api/user.types";

export type BungieDestiny2MembershipInfo = {
  membership: UserInfoCard;
  otherMemberships: UserInfoCard[];
};
