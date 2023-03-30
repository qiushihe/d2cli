import { AppModule } from "~src/module/app.module";
import { CharacterReference } from "~src/service/character/character.types";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { SessionService } from "~src/service/session/session.service";
import { SessionDataName } from "~src/service/session/session.types";

export class CharacterSelectionService {
  private readonly sessionService: SessionService;

  constructor() {
    this.sessionService = AppModule.getDefaultInstance().resolve(SessionService);
  }

  async ensureSelectedCharacter(
    sessionId: string
  ): Promise<[Error, null] | [null, CharacterReference]> {
    const logger = this.getLogger();

    const [characterInfoErr, characterInfo] = await this.getSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return [characterInfoErr, null];
    }

    if (!characterInfo) {
      return [logger.loggedError(`Missing current character selection`), null];
    }

    return [null, characterInfo];
  }

  async hasSelectedCharacter(sessionId: string): Promise<[Error, null] | [null, boolean]> {
    const [characterInfoErr, characterInfo] = await this.getSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return [characterInfoErr, null];
    }

    return [null, characterInfo !== null];
  }

  async getSelectedCharacter(
    sessionId: string
  ): Promise<[Error, null] | [null, CharacterReference | null]> {
    const logger = this.getLogger();

    logger.info("Retrieving current character selection ...");
    const [characterInfoErr, characterInfo] = await this.sessionService.getData<CharacterReference>(
      sessionId,
      SessionDataName.CurrentCharacterInfo
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
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve(LogService)
      .getLogger("CharacterSelectionService");
  }
}
