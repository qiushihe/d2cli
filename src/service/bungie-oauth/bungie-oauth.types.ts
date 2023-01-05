export type OAuthState = {
  /**
   * Time in milliseconds for when this state is created.
   */
  t: number;

  /**
   * The session ID for this state.
   */
  s: string;
};

export type OAuthAccessToken = {
  type: string;
  token: string;
  expiredAt: number;
  refreshToken?: string;
  refreshTokenExpiredAt?: number;
  membershipId: string;
};
