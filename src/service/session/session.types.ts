import { BungieOAuthAccessToken } from "~src/service/bungie-oauth/bungie-oauth.types";

export type SessionData = {
  bungleAccessToken?: BungieOAuthAccessToken | null;
};

export type LoginStatus = {
  isLoggedIn: boolean;
  isLoginExpired: boolean;
};
