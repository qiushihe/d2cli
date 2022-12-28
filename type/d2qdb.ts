import * as repl from "repl";

export namespace D2QDB {
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

  export type Destiny2Membership = {
    type: number;
    id: string;
    displayName: string;
  };

  export type Destiny2Character = {
    id: string;
    lightLevel: number;
  };

  export type CliCmdDefinition = {
    description: string;
    action: (server: repl.REPLServer, arg?: string) => void | Promise<void>;
  };

  export type SessionData = {
    bungleAccessToken?: D2QDB.BungieOAuthAccessToken | null;
  };

  export type LoginStatus = {
    isLoggedIn: boolean;
    isLoginExpired: boolean;
  };
}
