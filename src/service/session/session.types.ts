export enum SessionDataName {
  AgendaItems = "agendaItems",
  BungieAccessToken = "bungieAccessToken",
  CurrentCharacterInfo = "currentCharacterInfo"
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
