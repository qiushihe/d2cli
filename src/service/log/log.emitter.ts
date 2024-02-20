import { LOG_LEVEL } from "./log.enum";

export const errorMessageEmitter =
  (namespace: string, logLevel: number) =>
  (...args: any[]) => {
    if (logLevel >= LOG_LEVEL.error) {
      if (logLevel >= LOG_LEVEL.debug) {
        console.error(`- ERR - [${namespace}]`, ...args);
      } else {
        console.error(`- ERR -`, ...args);
      }
    }
  };

export const warningMessageEmitter =
  (namespace: string, logLevel: number) =>
  (...args: any[]) => {
    if (logLevel >= LOG_LEVEL.warning) {
      if (logLevel >= LOG_LEVEL.debug) {
        console.warn(`- WRN - [${namespace}]`, ...args);
      } else {
        console.warn(`- WRN -`, ...args);
      }
    }
  };

export const infoMessageEmitter =
  (namespace: string, logLevel: number) =>
  (...args: any[]) => {
    if (logLevel >= LOG_LEVEL.info) {
      if (logLevel >= LOG_LEVEL.debug) {
        console.log(`- INF - [${namespace}]`, ...args);
      } else {
        console.log(`- INF -`, ...args);
      }
    }
  };

export const debugMessageEmitter =
  (namespace: string, logLevel: number) =>
  (...args: any[]) => {
    if (logLevel >= LOG_LEVEL.debug) {
      console.log(`- DBG - [${namespace}]`, ...args);
    }
  };

export const messageEmitter =
  () =>
  (...args: any[]) =>
    console.log(...args);
