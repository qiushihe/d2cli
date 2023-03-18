import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { itemIdOption } from "~src/cli/command-option/item.option";
import { ItemIdCommandOptions } from "~src/cli/command-option/item.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2ItemService } from "~src/service/destiny2-item/destiny2-item.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2PlugService } from "~src/service/destiny2-plug/destiny2-plug.service";
import { LogService } from "~src/service/log/log.service";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

type CmdOptions = SessionIdCommandOptions &
  VerboseCommandOptions &
  ItemIdCommandOptions & { showAll: boolean };

const cmd: CommandDefinition = {
  description: "List available mods for an item",
  options: [
    sessionIdOption,
    verboseOption,
    itemIdOption,
    {
      flags: ["a", "show-all"],
      description: "Show unequipped slot mods",
      defaultValue: false
    }
  ],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:mod:list");

    const { session: sessionId, verbose, showAll, itemId } = opts as CmdOptions;
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

    const destiny2PlugService =
      AppModule.getDefaultInstance().resolve<Destiny2PlugService>("Destiny2PlugService");

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
        destiny2PlugService.getSocketIndices(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId,
          itemHash,
          "ARMOR MODS"
        )
    );
    if (armourPlugItemSocketIndicesErr) {
      return logger.loggedError(
        `Unable to retrieve armour mod socket indices: ${armourPlugItemSocketIndicesErr.message}`
      );
    }

    const [armourPlugItemHashesErr, armourPlugItemHashes] = await fnWithSpinner(
      "Retrieving available armour mods ...",
      () =>
        destiny2PlugService.getPlugItemHashes(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId,
          itemHash,
          "ARMOR MODS"
        )
    );
    if (armourPlugItemHashesErr) {
      return logger.loggedError(
        `Unable to retrieve available armour mods: ${armourPlugItemHashesErr.message}`
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
          `Unable to retrieve equipped plug hashes: ${equippedPlugHashesErr.message}`
        );
      }

      equippedPlugHashes = armourPlugItemSocketIndices.map((index) => _equippedPlugHashes[index]);
    }

    const plugsBySlotIndex = armourPlugItemHashes.map((plugItemHashes, slotIndex) => {
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

    const tableData: string[][] = [];

    const tableHeader = ["Slot", "Equipped"];
    if (verbose) {
      tableHeader.push("ID");
    }
    if (showAll) {
      tableHeader.push("Unequipped");
      if (verbose) {
        tableHeader.push("ID");
      }
    }
    tableData.push(tableHeader);

    for (let slotIndex = 0; slotIndex < plugsBySlotIndex.length; slotIndex++) {
      const plugs = plugsBySlotIndex[slotIndex];

      const equippedPlug = plugs.find((plug) => plug.isEquipped) || null;

      const tableRow = [`${slotIndex + 1}`, equippedPlug ? equippedPlug.label : ""];

      if (verbose) {
        tableRow.push(equippedPlug ? `${equippedPlug.hash}` : "");
      }
      if (showAll) {
        const unequippedPlugs = plugs.filter((plug) => !plug.isEquipped);
        tableRow.push(unequippedPlugs.map((plug) => plug.label).join("\n"));
        if (verbose) {
          tableRow.push(unequippedPlugs.map((plug) => `${plug.hash}`).join("\n"));
        }
      }

      tableData.push(tableRow);
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
