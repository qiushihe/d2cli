import { CommandDefinition } from "~src/cli/d2cli.types";
import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";

import { sessionIdOption } from "../../command-option/session-id.option";
import { SessionIdCommandOptions } from "../../command-option/session-id.option";

type CmdOptions = SessionIdCommandOptions & { _: never };

const cmd: CommandDefinition = {
  description: "List agenda items",
  options: [sessionIdOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:agenda:list");

    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);
  }
};

export default cmd;
