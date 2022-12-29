export type BungieOAuthState = {
  /**
   * Time in milliseconds for when this state is created.
   */
  t: number;

  /**
   * The session ID for this state.
   */
  s: string;
};

export type BungieOAuthAccessToken = {
  type: string;
  token: string;
  expiredAt: number;
  refreshToken?: string;
  refreshTokenExpiredAt?: number;
  membershipId: string;
};
