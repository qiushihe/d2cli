import { realTmpDir as fsRealTmpDir } from "~src/helper/fs.helper";
import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";

import { CliCmdDefinition } from "../cli.types";

export const addFarmingReminder: CliCmdDefinition = {
  description: "Add farming reminder",
  action: async () => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:addFarmingReminder");

    const [tmpDirPathErr, tmpDirPath] = await fsRealTmpDir();
    if (tmpDirPathErr) {
      return logger.loggedError(
        `Unable to obtain temporary directory path: ${tmpDirPathErr.message}`
      );
    }

    logger.debug(`Temporary directory path: ${tmpDirPath}`);
  }
};
