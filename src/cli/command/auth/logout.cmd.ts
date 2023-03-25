import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { AppModule } from "~src/module/app.module";
import { OAuthAccessToken } from "~src/service/bungie-oauth/bungie-oauth.types";
import { CharacterReference } from "~src/service/character/character.types";
import { LogService } from "~src/service/log/log.service";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

type CmdOptions = SessionIdCommandOptions & { _: never };

const cmd: CommandDefinition = {
  description: "Log out from Bungie.net",
  options: [sessionIdOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:auth:logout");

    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

    logger.info("Clearing characters info ...");
    const clearCharactersErr = await sessionService.setData<CharacterReference>(
      sessionId,
      SessionDataName.CurrentCharacterInfo,
      null
    );
    if (clearCharactersErr) {
      return logger.loggedError(`Unable to clear characters info: ${clearCharactersErr.message}`);
    }

    logger.info("Clearing Bungie.net access token ...");
    const clearTokenErr = await sessionService.setData<OAuthAccessToken>(
      sessionId,
      SessionDataName.BungieAccessToken,
      null
    );
    if (clearTokenErr) {
      return logger.loggedError(
        `Unable to clear Bungie.net access token: ${clearTokenErr.message}`
      );
    }

    logger.log("Logged out from Bungie.net");
  }
};

export default cmd;
