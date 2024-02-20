import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";

import { errorMessageEmitter } from "./log.emitter";
import { warningMessageEmitter } from "./log.emitter";
import { infoMessageEmitter } from "./log.emitter";
import { debugMessageEmitter } from "./log.emitter";
import { messageEmitter } from "./log.emitter";
import { Logger } from "./log.types";

export class LogService {
  private readonly config: ConfigService;

  constructor() {
    this.config = AppModule.getDefaultInstance().resolve(ConfigService);
  }

  getLogger(namespace: string): Logger {
    const logLevel = this.config.getLogLevel();

    const logError = errorMessageEmitter(namespace, logLevel);

    return {
      error: logError,
      warn: warningMessageEmitter(namespace, logLevel),
      info: infoMessageEmitter(namespace, logLevel),
      debug: debugMessageEmitter(namespace, logLevel),
      log: messageEmitter(),
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
