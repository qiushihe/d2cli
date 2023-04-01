import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";

import { errorLogger } from "./log.logger";
import { warningLogger } from "./log.logger";
import { infoLogger } from "./log.logger";
import { debugLogger } from "./log.logger";
import { messageLogger } from "./log.logger";
import { Logger } from "./log.types";

export class LogService {
  private readonly config: ConfigService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve(ConfigService);
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
