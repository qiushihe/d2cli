import { getSelectedCharacterInfo } from "~src/cli/command-helper/current-character.helper";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2ItemService } from "~src/service/destiny2-item/destiny2-item.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2ModService } from "~src/service/destiny2-mod/destiny2-mod.service";
import { LogService } from "~src/service/log/log.service";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

import { sessionIdOption } from "../../command-option/session-id.option";
import { SessionIdCommandOptions } from "../../command-option/session-id.option";
import { itemOption } from "./item.option";
import { ItemCommandOptions } from "./item.option";

type CmdOptions = SessionIdCommandOptions & ItemCommandOptions;

const cmd: CommandDefinition = {
  description: "List available mods for an item",
  options: [sessionIdOption, itemOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:mod:list");

    const { session: sessionId, itemId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const itemIds = `${itemId}`.trim().split(":", 2);
    const itemHash = parseInt(itemIds[0], 10) || 0;
    const itemInstanceId = (itemIds[1] || "").trim();

    if (!itemHash) {
      return logger.loggedError(`Missing item hash`);
    }
    if (itemHash <= 0) {
      return logger.loggedError(`Invalid item hash`);
    }

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2ModService =
      AppModule.getDefaultInstance().resolve<Destiny2ModService>("Destiny2ModService");

    const destiny2ItemService =
      AppModule.getDefaultInstance().resolve<Destiny2ItemService>("Destiny2ItemService");

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

    const [armourPlugItemSocketIndicesErr, armourPlugItemSocketIndices] = await fnWithSpinner(
      "Retrieving armour mod socket indices ...",
      () =>
        destiny2ModService.getArmourModSocketIndices(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId,
          itemHash
        )
    );
    if (armourPlugItemSocketIndicesErr) {
      return logger.loggedError(
        `Unable to retrieving armour mod socket indices: ${armourPlugItemSocketIndicesErr.message}`
      );
    }

    const [armourPlugItemHashesErr, armourPlugItemHashes] = await fnWithSpinner(
      "Retrieving available armour mods ...",
      () =>
        destiny2ModService.getArmourModPlugItemHashes(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId,
          itemHash
        )
    );
    if (armourPlugItemHashesErr) {
      return logger.loggedError(
        `Unable to retrieving available armour mods: ${armourPlugItemHashesErr.message}`
      );
    }

    let equippedPlugHashes: number[] = [];
    if (itemInstanceId) {
      const [equippedPlugHashesErr, _equippedPlugHashes] =
        await destiny2ItemService.getItemEquippedPlugHashes(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          itemInstanceId
        );
      if (equippedPlugHashesErr) {
        return logger.loggedError(
          `Unable to retrieving equipped plug hashes: ${equippedPlugHashesErr.message}`
        );
      }

      equippedPlugHashes = armourPlugItemSocketIndices.map((index) => _equippedPlugHashes[index]);
    }

    const availablePlugHashesBySlotIndex = armourPlugItemHashes.map((plugItemHashes, slotIndex) => {
      return plugItemHashes.map((plugItemHash) => {
        const isEquipped = equippedPlugHashes[slotIndex] === plugItemHash;
        const plugItemDefinition = itemDefinitions[plugItemHash];

        if (plugItemDefinition) {
          return {
            isEquipped,
            hash: plugItemHash,
            label: plugItemDefinition ? plugItemDefinition.displayProperties.name : ""
          };
        } else {
          return { isEquipped, hash: plugItemHash, label: "" };
        }
      });
    });

    const maxColumnsCount = availablePlugHashesBySlotIndex.length;
    const maxRowsCount = Math.max(...availablePlugHashesBySlotIndex.map((hashes) => hashes.length));

    const tableData: string[][] = [];

    const tableHeader: string[] = [];
    for (let columnIndex = 0; columnIndex < maxColumnsCount; columnIndex++) {
      tableHeader.push(`Slot ${columnIndex + 1} Mod`);
      tableHeader.push("Hash");
    }
    tableData.push(tableHeader);

    for (let rowIndex = 0; rowIndex < maxRowsCount; rowIndex++) {
      const tableRow: string[] = [];

      for (let columnIndex = 0; columnIndex < maxColumnsCount; columnIndex++) {
        const data = availablePlugHashesBySlotIndex[columnIndex][rowIndex];
        if (itemInstanceId) {
          tableRow.push(data ? (data.isEquipped ? `> ${data.label}` : `  ${data.label}`) : "");
        } else {
          tableRow.push(data ? data.label : "");
        }
        tableRow.push(data ? `${data.hash}` : "");
      }

      tableData.push(tableRow);
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
