import chalk from "chalk";

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
      if (logLevel >= LOG_LEVEL.debug) {
        console.error(`${chalk.bgRed(" ERR ")} [${namespace}]`, ...args);
      } else {
        console.error(`${chalk.bgRed(" ERR ")}`, ...args);
      }
    }
  };

export const warningLogger =
  (namespace: string, logLevel: number) =>
  (...args: any[]) => {
    if (logLevel >= LOG_LEVEL.warning) {
      if (logLevel >= LOG_LEVEL.debug) {
        console.warn(`${chalk.bgYellow(" WRN ")} [${namespace}]`, ...args);
      } else {
        console.warn(`${chalk.bgYellow(" WRN ")}`, ...args);
      }
    }
  };
export const infoLogger =
  (namespace: string, logLevel: number) =>
  (...args: any[]) => {
    if (logLevel >= LOG_LEVEL.info) {
      if (logLevel >= LOG_LEVEL.debug) {
        console.log(`${chalk.bgGreen(" INF ")} [${namespace}]`, ...args);
      } else {
        console.log(`${chalk.bgGreen(" INF ")}`, ...args);
      }
    }
  };

export const debugLogger =
  (namespace: string, logLevel: number) =>
  (...args: any[]) => {
    if (logLevel >= LOG_LEVEL.debug) {
      console.log(`${chalk.bgBlue(" DBG ")} [${namespace}]`, ...args);
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
