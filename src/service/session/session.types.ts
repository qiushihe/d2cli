export enum SessionDataName {
  BungieAccessToken = "bungieAccessToken",
  FarmingReminder = "farmingReminder"
}

export type SessionData = {
  [key: string]: any;
};

export type TokenStatus = {
  isAccessTokenExpired: boolean;
  isRefreshTokenExpired: boolean;
};

export type LoginStatus = {
  isLoggedIn: boolean;
  isLoginExpired: boolean;
};
