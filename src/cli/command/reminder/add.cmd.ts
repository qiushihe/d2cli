import { CommandDefinition } from "~src/cli/d2cli.types";
import { realTmpDir as fsRealTmpDir } from "~src/helper/fs.helper";
import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";

import { sessionIdOption } from "../../command-option/session-id.option";
import { SessionCommandOptions } from "../command.types";

type CmdOptions = SessionCommandOptions & { _: never };

const cmd: CommandDefinition = {
  description: "Add a reminder for activities in Destiny 2",
  options: [sessionIdOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:reminder:add");

    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const [tmpDirPathErr, tmpDirPath] = await fsRealTmpDir();
    if (tmpDirPathErr) {
      return logger.loggedError(
        `Unable to obtain temporary directory path: ${tmpDirPathErr.message}`
      );
    }

    logger.debug(`Temporary directory path: ${tmpDirPath}`);
  }
};

export default cmd;
