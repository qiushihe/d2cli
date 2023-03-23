import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { showAllOption } from "~src/cli/command-option/cli.option";
import { ShowAllCommandOptions } from "~src/cli/command-option/cli.option";
import { itemIdentifierOption } from "~src/cli/command-option/item.option";
import { ItemIdentifierCommandOptions } from "~src/cli/command-option/item.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { parseItemIdentifier } from "~src/helper/item.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2ItemService } from "~src/service/destiny2-item/destiny2-item.service";
import { Destiny2PlugService } from "~src/service/destiny2-plug/destiny2-plug.service";
import { ItemDefinitionService } from "~src/service/item-definition/item-definition.service";
import { LogService } from "~src/service/log/log.service";

type CmdOptions = SessionIdCommandOptions &
  VerboseCommandOptions &
  ShowAllCommandOptions &
  ItemIdentifierCommandOptions;

const cmd: CommandDefinition = {
  description: "List available mods for an item",
  options: [sessionIdOption, verboseOption, showAllOption, itemIdentifierOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:mod:list");

    const { session: sessionId, verbose, showAll, item } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const itemIdentifier = parseItemIdentifier(item);
    if (!itemIdentifier) {
      return logger.loggedError(`Missing item identifier`);
    }
    if (!itemIdentifier.itemHash) {
      return logger.loggedError(`Missing item hash`);
    }

    const itemDefinitionService =
      AppModule.getDefaultInstance().resolve<ItemDefinitionService>("ItemDefinitionService");

    const destiny2PlugService =
      AppModule.getDefaultInstance().resolve<Destiny2PlugService>("Destiny2PlugService");

    const destiny2ItemService =
      AppModule.getDefaultInstance().resolve<Destiny2ItemService>("Destiny2ItemService");

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving armour mod socket indices ...");
    const [armourPlugItemSocketIndicesErr, armourPlugItemSocketIndices] =
      await destiny2PlugService.getSocketIndices(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId,
        itemIdentifier.itemHash,
        "ARMOR MODS"
      );
    if (armourPlugItemSocketIndicesErr) {
      return logger.loggedError(
        `Unable to retrieve armour mod socket indices: ${armourPlugItemSocketIndicesErr.message}`
      );
    }

    logger.info("Retrieving available armour mods ...");
    const [armourPlugItemHashesErr, armourPlugItemHashes] =
      await destiny2PlugService.getPlugItemHashes(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId,
        itemIdentifier.itemHash,
        "ARMOR MODS"
      );
    if (armourPlugItemHashesErr) {
      return logger.loggedError(
        `Unable to retrieve available armour mods: ${armourPlugItemHashesErr.message}`
      );
    }

    let equippedPlugHashes: number[] = [];
    if (itemIdentifier.itemInstanceId) {
      const [equippedPlugHashesErr, _equippedPlugHashes] =
        await destiny2ItemService.getItemEquippedPlugHashes(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          itemIdentifier.itemInstanceId
        );
      if (equippedPlugHashesErr) {
        return logger.loggedError(
          `Unable to retrieve equipped plug hashes: ${equippedPlugHashesErr.message}`
        );
      }

      equippedPlugHashes = armourPlugItemSocketIndices.map((index) => _equippedPlugHashes[index]);
    }

    const plugsBySlotIndex: { isEquipped: boolean; hash: number; label: string }[][] = [];
    for (let slotIndex = 0; slotIndex < armourPlugItemHashes.length; slotIndex++) {
      const plugItemHashes = armourPlugItemHashes[slotIndex];

      const plugs: { isEquipped: boolean; hash: number; label: string }[] = [];
      for (let plugIndex = 0; plugIndex < plugItemHashes.length; plugIndex++) {
        const plugItemHash = plugItemHashes[plugIndex];
        const isEquipped = equippedPlugHashes[slotIndex] === plugItemHash;

        logger.info(`Retrieving plug item definition for ${plugItemHash} ...`);
        const [plugItemDefinitionErr, plugItemDefinition] =
          await itemDefinitionService.getItemDefinition(plugItemHash);
        if (plugItemDefinitionErr) {
          return logger.loggedError(
            `Unable to retrieve plug item definition: ${plugItemDefinitionErr.message}`
          );
        }

        plugs.push({
          isEquipped,
          hash: plugItemHash,
          label: plugItemDefinition?.displayProperties.name || "UNKNOWN PLUG"
        });
      }

      plugsBySlotIndex.push(plugs);
    }

    const tableData: string[][] = [];

    const tableHeader = ["Slot"];
    if (itemIdentifier.itemInstanceId) {
      tableHeader.push("Equipped");
    }
    if (verbose) {
      tableHeader.push("ID");
    }
    if (showAll || !itemIdentifier.itemInstanceId) {
      if (itemIdentifier.itemInstanceId) {
        tableHeader.push("Unequipped");
      } else {
        tableHeader.push("Available");
      }
      if (verbose) {
        tableHeader.push("ID");
      }
    }
    tableData.push(tableHeader);

    for (let slotIndex = 0; slotIndex < plugsBySlotIndex.length; slotIndex++) {
      const plugs = plugsBySlotIndex[slotIndex];

      const equippedPlug = plugs.find((plug) => plug.isEquipped) || null;

      const tableRow = [`${slotIndex + 1}`];

      if (itemIdentifier.itemInstanceId) {
        tableRow.push(equippedPlug ? equippedPlug.label : "");
      }
      if (verbose) {
        tableRow.push(equippedPlug ? `${equippedPlug.hash}` : "");
      }
      if (showAll || !itemIdentifier.itemInstanceId) {
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
