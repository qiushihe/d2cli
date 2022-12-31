import { bgBlue, bgGreen, bgRed, bgYellow } from "~src/helper/colour.helper";
import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";

import { Logger } from "./log.types";

export const LOG_LEVEL = {
  error: 100,
  warning: 200,
  info: 300,
  debug: 400
};

export const errorLogger =
  (namespace: string, logLevel: number) =>
  (...args: any[]) => {
    if (logLevel >= LOG_LEVEL.error) {
      console.error(`${bgRed(" ERR ")} [${namespace}]`, ...args);
    }
  };

export const warningLogger =
  (namespace: string, logLevel: number) =>
  (...args: any[]) => {
    if (logLevel >= LOG_LEVEL.warning) {
      console.warn(`${bgYellow(" WRN ")} [${namespace}]`, ...args);
    }
  };
export const infoLogger =
  (namespace: string, logLevel: number) =>
  (...args: any[]) => {
    if (logLevel >= LOG_LEVEL.info) {
      console.log(`${bgGreen(" INF ")} [${namespace}]`, ...args);
    }
  };

export const debugLogger =
  (namespace: string, logLevel: number) =>
  (...args: any[]) => {
    if (logLevel >= LOG_LEVEL.debug) {
      console.log(`${bgBlue(" DBG ")} [${namespace}]`, ...args);
    }
  };

export const messageLogger =
  () =>
  (...args: any[]) => {
    console.log(...args);
  };

export class LogService {
  private readonly config: ConfigService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
  }

  getLogger(namespace: string): Logger {
    const logLevel = this.config.getLogLevel();

    const logError = errorLogger(namespace, logLevel);

    return {
      error: logError,
      warn: warningLogger(namespace, logLevel),
      info: infoLogger(namespace, logLevel),
      debug: debugLogger(namespace, logLevel),
      log: messageLogger(),
      loggedError: (message: string, attrs?: Record<string, any>): Error => {
        logError(message);

        const err = new Error(message);

        Object.entries(attrs || {}).forEach(([key, value]) => {
          (err as any)[key] = value;
        });

        return err;
      }
    };
  }
}
