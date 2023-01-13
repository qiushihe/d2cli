export enum SessionDataName {
  BungieAccessToken = "bungieAccessToken",
  CurrentCharacterInfo = "currentCharacterInfo",
  CalendarEvents = "calendarEvents"
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
