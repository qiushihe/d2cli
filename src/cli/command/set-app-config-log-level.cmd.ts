import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LogService } from "~src/service/log/log.service";

import { CliCmdDefinition } from "../cli.types";

export const setAppConfigLogLevel: CliCmdDefinition = {
  description: "Set log level",
  action: async (server, context, arg) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:setAppConfigLogLevel");

    const config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");

    config.setAppConfig(AppConfigName.LogLevel, arg || null);
    logger.log(`Log level set to: ${arg}`);
  }
};
