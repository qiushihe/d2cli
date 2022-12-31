export type CacheData = {
  data: {
    [key: string]: any;
  };
  expiredAtInMilliseconds: number | null;
};
