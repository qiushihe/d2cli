import { AppModule } from "~src/module/app.module";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { LogService } from "~src/service/log/log.service";

import { CliCmdDefinition } from "../cli.types";

export const setAppConfigBungieApiKey: CliCmdDefinition = {
  description: "Set Bungie API key",
  action: async (server, context, arg) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:setAppConfigBungieApiKey");

    const config = AppModule.getDefaultInstance().resolve<ConfigService>("ConfigService");

    config.setAppConfig(AppConfigName.BungieApiKey, arg || null);
    logger.debug(`Bungie API key set to: ${arg}`);
  }
};
