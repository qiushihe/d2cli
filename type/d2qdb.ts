export namespace D2QDB {
  export type BungieOAuthStartQuery = {
    [key: string]: any;
    returnUrl?: string;
  };

  export type BungieOAuthReturnQuery = {
    [key: string]: any;
    code: string;
    state: string;
  };

  export type BungieOAuthState = {
    t: number;
    r: string;
  };

  export type BungieOAuthAccessToken = {
    type: string;
    token: string;
    expiredAt: number;
    refreshToken?: string;
    refreshTokenExpiredAt?: number;
    membershipId: string;
  };

  export type Destiny2Membership = {
    type: number;
    id: string;
    displayName: string;
  };

  export type Destiny2Character = {
    id: string;
    lightLevel: number;
  };
}
