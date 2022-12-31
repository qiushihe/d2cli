export type BungieApiResponse<TResponse = any> = {
  [key: string]: any;
  Response?: TResponse;
  ErrorCode: number;
  ThrottleSeconds: number;
  ErrorStatus: string;
  Message: string;
  MessageData: any;
};
