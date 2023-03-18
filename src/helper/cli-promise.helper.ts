import ora, { Ora } from "ora";

import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";
import { LOG_LEVEL } from "~src/service/log/log.service";

export const fnWithSpinner = async <T>(message: string, fn: () => Promise<T>) => {
  const config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");
  const logLevel = config.getLogLevel();

  let spinner: Ora | null;

  if (logLevel === LOG_LEVEL.debug) {
    spinner = null;
    console.log(message);
  } else {
    spinner = ora();
    spinner.start(`${message}\n`);
  }

  const result = await fn();

  if (spinner) {
    spinner.stop();
  }

  return result;
};
