import { SessionIdCommandOptions, sessionIdOption } from "~src/cli/command-option/cli.option";
import { itemOption } from "~src/cli/command-option/item.option";
import { ItemCommandOptions } from "~src/cli/command-option/item.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2PlugService } from "~src/service/destiny2-plug/destiny2-plug.service";
import { LogService } from "~src/service/log/log.service";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

type CmdOptions = SessionIdCommandOptions &
  ItemCommandOptions & { modHash: string } & { slotNumber: string };

const cmd: CommandDefinition = {
  description: "Install a mod into an socket",
  options: [
    sessionIdOption,
    itemOption,
    {
      flags: ["m", "mod-hash <hash>"],
      description: "The item hash of the mod item to insert",
      defaultValue: ""
    },
    {
      flags: ["n", "slot-number <slot>"],
      description: "The number of the slot to insert the mod",
      defaultValue: ""
    }
  ],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:mod:insert");

    const { session: sessionId, itemId, modHash, slotNumber } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const itemIds = `${itemId}`.trim().split(":", 2);
    const itemHash = parseInt(itemIds[0], 10) || 0;
    const itemInstanceId = (itemIds[1] || "").trim();

    const socketIndex = (parseInt(slotNumber, 10) || 0) - 1;
    const plugItemHash = parseInt(modHash, 10) || 0;

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2PlugService =
      AppModule.getDefaultInstance().resolve<Destiny2PlugService>("Destiny2PlugService");

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    const [itemDefinitionsErr, itemDefinitions] = await fnWithSpinner(
      "Retrieving inventory item definitions ...",
      () =>
        destiny2ManifestService.getManifestComponent<Destiny2ManifestInventoryItemDefinitions>(
          Destiny2ManifestLanguage.English,
          Destiny2ManifestComponent.InventoryItemDefinition
        )
    );
    if (itemDefinitionsErr) {
      return logger.loggedError(
        `Unable to retrieve inventory item definitions: ${itemDefinitionsErr.message}`
      );
    }

    const itemDefinition = itemDefinitions[itemHash];
    const plugItemDefinition = itemDefinitions[plugItemHash];

    const itemDescription = itemDefinition.displayProperties.name;
    const plugItemDescription = plugItemDefinition.displayProperties.name;

    const insertErr = await fnWithSpinner(
      `Inserting ${plugItemDescription} into slot #${socketIndex + 1} of ${itemDescription} ...`,
      () =>
        destiny2PlugService.insert(
          sessionId,
          characterInfo?.membershipType,
          characterInfo?.characterId,
          itemInstanceId,
          socketIndex,
          plugItemHash
        )
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
