import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";

import { CliCmdDefinition } from "../cli.types";

export const addFarmingReminder: CliCmdDefinition = {
  description: "Add farming reminder",
  action: async () => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:addFarmingReminder");

    logger.info("WIP");
  }
};
