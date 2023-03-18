import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterReference } from "~src/service/destiny2-character/destiny2-character.types";
import { Logger } from "~src/service/log/log.types";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

export const getCharacterSelectionInfo = async (
  logger: Logger,
  sessionId: string
): Promise<[Error, null] | [null, CharacterReference | null]> => {
  const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

  const [characterInfoErr, characterInfo] = await fnWithSpinner(
    "Retrieving current character selection ...",
    () =>
      sessionService.getData<CharacterReference>(sessionId, SessionDataName.CurrentCharacterInfo)
  );
  if (characterInfoErr) {
    return [
      logger.loggedError(
        `Unable to retrieve current character selection: ${characterInfoErr.message}`
      ),
      null
    ];
  }

  return [null, characterInfo];
};

export const hasSelectedCharacter = async (
  logger: Logger,
  sessionId: string
): Promise<[Error, null] | [null, boolean]> => {
  const [characterInfoErr, characterInfo] = await getCharacterSelectionInfo(logger, sessionId);
  if (characterInfoErr) {
    return [characterInfoErr, null];
  }

  return [null, characterInfo !== null];
};

export const getSelectedCharacterInfo = async (
  logger: Logger,
  sessionId: string
): Promise<[Error, null] | [null, CharacterReference]> => {
  const [characterInfoErr, characterInfo] = await getCharacterSelectionInfo(logger, sessionId);
  if (characterInfoErr) {
    return [characterInfoErr, null];
  }

  if (!characterInfo) {
    return [logger.loggedError(`Missing current character selection`), null];
  }

  return [null, characterInfo];
};
