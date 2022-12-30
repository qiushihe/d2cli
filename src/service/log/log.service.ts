import { bgRed } from "~src/helper/colour.helper";
import { bgGreen } from "~src/helper/colour.helper";
import { bgYellow } from "~src/helper/colour.helper";
import { bgBlue } from "~src/helper/colour.helper";
import { bgGray } from "~src/helper/colour.helper";
import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";

import { Logger } from "./log.types";

const LOG_LEVEL = {
  error: 100,
  warning: 200,
  info: 300,
  debug: 400
};

export class LogService {
  private readonly config: ConfigService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
  }

  getLogger(namespace: string): Logger {
    const logLevel = this.getLogLevel();

    const logError = (...args: any[]) => {
      if (logLevel >= LOG_LEVEL.error) {
        console.error(`${bgRed(" ERR ")} [${namespace}]`, ...args);
      }
    };

    const logWarning = (...args: any[]) => {
      if (logLevel >= LOG_LEVEL.warning) {
        console.warn(`${bgYellow(" WRN ")} [${namespace}]`, ...args);
      }
    };
    const logInfo = (...args: any[]) => {
      if (logLevel >= LOG_LEVEL.info) {
        console.log(`${bgGreen(" INF ")} [${namespace}]`, ...args);
      }
    };

    const logDebug = (...args: any[]) => {
      if (logLevel >= LOG_LEVEL.debug) {
        console.log(`${bgBlue(" DBG ")} [${namespace}]`, ...args);
      }
    };

    const logMessage = (...args: any[]) => {
      console.log(`${bgGray(" MSG ")} [${namespace}]`, ...args);
    };

    return {
      error: logError,
      warn: logWarning,
      info: logInfo,
      debug: logDebug,
      log: logMessage,
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

  private getLogLevel(): number {
    const logLevel = (LOG_LEVEL as Record<string, number>)[this.config.getLogLevel()];
    if (logLevel !== null && logLevel !== undefined) {
      return logLevel;
    } else {
      return LOG_LEVEL.error;
    }
  }
}
