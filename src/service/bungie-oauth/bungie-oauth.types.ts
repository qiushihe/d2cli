export type BungieApiOAuthAccessToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  membership_id: string;
};

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
