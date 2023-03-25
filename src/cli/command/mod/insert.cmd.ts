import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { itemIdentifierOption } from "~src/cli/command-option/item.option";
import { ItemIdentifierCommandOptions } from "~src/cli/command-option/item.option";
import { socketNumberOption } from "~src/cli/command-option/socket.option";
import { SocketNumberCommandOptions } from "~src/cli/command-option/socket.option";
import { plugIHashOption } from "~src/cli/command-option/socket.option";
import { PlugHashCommandOptions } from "~src/cli/command-option/socket.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { parseItemIdentifier } from "~src/helper/item.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { LogService } from "~src/service/log/log.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { PlugService } from "~src/service/plug/plug.service";

type CmdOptions = SessionIdCommandOptions &
  ItemIdentifierCommandOptions &
  SocketNumberCommandOptions &
  PlugHashCommandOptions;

const cmd: CommandDefinition = {
  description: "Install a mod into an socket",
  options: [sessionIdOption, itemIdentifierOption, socketNumberOption, plugIHashOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:mod:insert");

    const { session: sessionId, item, socket, plugHash } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const itemIdentifier = parseItemIdentifier(item);
    if (!itemIdentifier) {
      return logger.loggedError(`Missing item identifier`);
    }
    if (!itemIdentifier.itemHash) {
      return logger.loggedError(`Missing item hash`);
    }
    if (!itemIdentifier.itemInstanceId) {
      return logger.loggedError(`Missing item instance ID`);
    }

    const socketIndex = (parseInt(socket, 10) || 0) - 1;
    const plugItemHash = parseInt(plugHash, 10) || 0;

    const manifestDefinitionService =
      AppModule.getDefaultInstance().resolve<ManifestDefinitionService>(
        "ManifestDefinitionService"
      );

    const characterSelectionService =
      AppModule.getDefaultInstance().resolve<CharacterSelectionService>(
        "CharacterSelectionService"
      );

    const plugService = AppModule.getDefaultInstance().resolve<PlugService>("PlugService");

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info(`Fetching item definition for ${itemIdentifier.itemHash} ...`);
    const [itemDefinitionErr, itemDefinition] = await manifestDefinitionService.getItemDefinition(
      itemIdentifier.itemHash
    );
    if (itemDefinitionErr) {
      return logger.loggedError(
        `Unable to fetch item definition for ${itemIdentifier.itemHash}: ${itemDefinitionErr.message}`
      );
    }

    logger.info(`Fetching item definition for ${plugItemHash} ...`);
    const [plugItemDefinitionErr, plugItemDefinition] =
      await manifestDefinitionService.getItemDefinition(plugItemHash);
    if (plugItemDefinitionErr) {
      return logger.loggedError(
        `Unable to fetch item definition for ${plugItemHash}: ${plugItemDefinitionErr.message}`
      );
    }

    const itemDescription = itemDefinition.displayProperties.name;
    const plugItemDescription = plugItemDefinition.displayProperties.name;

    logger.info(
      `Inserting ${plugItemDescription} into slot #${socketIndex + 1} of ${itemDescription} ...`
    );
    const insertErr = await plugService.insert(
      sessionId,
      characterInfo.membershipType,
      characterInfo.characterId,
      itemIdentifier.itemInstanceId,
      socketIndex,
      plugItemHash
    );
    if (insertErr) {
      return logger.loggedError(
        `Unable to insert ${plugItemDescription} into slot #${
          socketIndex + 1
        } of ${itemDescription}: ${insertErr.message}`
      );
    }

    logger.log(
      `Inserted ${plugItemDescription} into slot #${socketIndex + 1} of ${itemDescription}`
    );
  }
};

export default cmd;
