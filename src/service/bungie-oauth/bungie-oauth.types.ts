export type BungieOAuthState = {
  t: number;
};

export type BungieOAuthAccessToken = {
  type: string;
  token: string;
  expiredAt: number;
  refreshToken?: string;
  refreshTokenExpiredAt?: number;
  membershipId: string;
};
