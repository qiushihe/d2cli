import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { showAllOption } from "~src/cli/command-option/cli.option";
import { ShowAllCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { getSubclassItems } from "~src/helper/inventory-bucket.helper";
import { SUBCLASS_SOCKET_NAMES } from "~src/helper/subclass.helper";
import { makeTable2 } from "~src/helper/table.helper";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { ItemService } from "~src/service/item/item.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { PlugService } from "~src/service/plug/plug.service";
import { SocketName } from "~src/service/plug/plug.service.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions & ShowAllCommandOptions;

type SubclassPlugRecord = {
  name: string;
  itemHash: number;
  isEquipped: boolean;
  socketIndex: number;
  sortOrder: number;
};

type SubclassRecord = {
  name: string;
  itemHash: number;
  itemInstanceId: string;
  sockets: Record<string, SubclassPlugRecord[][]>;
};

type ListCommandOptions = {
  listEquipped: boolean;
};

export const listCommand = (options: ListCommandOptions): CommandDefinition => {
  return {
    description: `List ${
      options.listEquipped ? "equipped subclass" : "unequipped subclasses"
    } of the current character`,
    options: [sessionIdOption, verboseOption, showAllOption],
    action: async (_, opts, { app, logger }) => {
      const { session: sessionId, verbose, showAll } = opts as CmdOptions;
      logger.debug(`Session ID: ${sessionId}`);

      const manifestDefinitionService = app.resolve(ManifestDefinitionService);

      const characterSelectionService = app.resolve(CharacterSelectionService);

      const inventoryService = app.resolve(InventoryService);

      const plugService = app.resolve(PlugService);

      const itemService = app.resolve(ItemService);

      const [characterInfoErr, characterInfo] =
        await characterSelectionService.ensureSelectedCharacter(sessionId);
      if (characterInfoErr) {
        return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
      }

      const subclassRecords: SubclassRecord[] = [];
      const allSubclasses: DestinyItemComponent[] = [];

      if (options.listEquipped) {
        logger.info("Retrieving equipment items ...");
        const [equipmentItemsErr, equipmentItems] = await inventoryService.getEquipmentItems(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId
        );
        if (equipmentItemsErr) {
          return logger.loggedError(
            `Unable to retrieve equipment items: ${equipmentItemsErr.message}`
          );
        }
        getSubclassItems(equipmentItems).forEach((subclass) => allSubclasses.push(subclass));
      } else {
        logger.info("Retrieving inventory items ...");
        const [inventoryItemsErr, inventoryItems] = await inventoryService.getInventoryItems(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId
        );
        if (inventoryItemsErr) {
          return logger.loggedError(
            `Unable to retrieve inventory items: ${inventoryItemsErr.message}`
          );
        }
        getSubclassItems(inventoryItems).forEach((subclass) => allSubclasses.push(subclass));
      }

      for (let subClassIndex = 0; subClassIndex < allSubclasses.length; subClassIndex++) {
        const subclass = allSubclasses[subClassIndex];

        logger.info(`Retrieving subclass definitions for ${subclass.itemHash} ...`);
        const [subclassDefinitionErr, subclassDefinition] =
          await manifestDefinitionService.getItemDefinition(subclass.itemHash);
        if (subclassDefinitionErr) {
          return logger.loggedError(
            `Unable to retrieve subclass definitions for ${subclass.itemHash}`
          );
        }

        const subclassName = subclassDefinition ? subclassDefinition.displayProperties.name : "N/A";

        const subclassRecord: SubclassRecord = {
          name: subclassName,
          itemHash: subclass.itemHash,
          itemInstanceId: subclass.itemInstanceId,
          sockets: {}
        };

        logger.info(`Retrieving ${subclassName} equipped plug hashes ...`);
        const [equippedPlugHashesErr, equippedPlugHashes] =
          await itemService.getItemEquippedPlugHashes(
            sessionId,
            characterInfo.membershipType,
            characterInfo.membershipId,
            subclass.itemInstanceId
          );
        if (equippedPlugHashesErr) {
          return logger.loggedError(
            `Unable to retrieve ${subclassName} equipped plug hashes: ${equippedPlugHashesErr.message}`
          );
        }

        for (
          let socketNameIndex = 0;
          socketNameIndex < SUBCLASS_SOCKET_NAMES.length;
          socketNameIndex++
        ) {
          const socketName = SUBCLASS_SOCKET_NAMES[socketNameIndex] as SocketName;

          logger.info(
            `Fetching ${subclassName} ${socketName.toLocaleLowerCase()} socket indices ...`
          );
          const [socketIndicesErr, socketIndices] = await plugService.getSocketIndices(
            sessionId,
            characterInfo.membershipType,
            characterInfo.membershipId,
            characterInfo.characterId,
            subclass.itemHash,
            socketName
          );
          if (socketIndicesErr) {
            return logger.loggedError(
              `Unable to fetch ${socketName.toLocaleLowerCase()} socket indices for ${subclassName}: ${
                socketIndicesErr.message
              }`
            );
          }

          logger.info(
            `Retrieving ${subclassName} available ${socketName.toLocaleLowerCase()} items ...`
          );
          const [plugItemHashesErr, plugItemHashes] = await plugService.getPlugItemHashes(
            sessionId,
            characterInfo.membershipType,
            characterInfo.membershipId,
            characterInfo.characterId,
            subclass.itemHash,
            socketName
          );
          if (plugItemHashesErr) {
            return logger.loggedError(
              `Unable to retrieve ${subclassName} available ${socketName.toLocaleLowerCase()} items: ${
                plugItemHashesErr.message
              }`
            );
          }

          subclassRecord.sockets[socketName] = [];

          for (let index = 0; index < socketIndices.length; index++) {
            const socketIndex = socketIndices[index];
            const slotPlugRecords: SubclassPlugRecord[] = [];
            const slotPlugItemHashes = plugItemHashes[index];
            const equippedPlugItemHash = equippedPlugHashes[socketIndex] || -1;

            for (
              let plugItemIndex = 0;
              plugItemIndex < slotPlugItemHashes.length;
              plugItemIndex++
            ) {
              const plugItemHash = slotPlugItemHashes[plugItemIndex];

              logger.info(`Retrieving plug item definitions for ${plugItemHash} ...`);
              const [plugItemDefinitionErr, plugItemDefinition] =
                await manifestDefinitionService.getItemDefinition(plugItemHash);
              if (plugItemDefinitionErr) {
                return logger.loggedError(
                  `Unable to retrieve plug item definitions for ${plugItemHash}`
                );
              }

              const plugRecord: SubclassPlugRecord = {
                name: plugItemDefinition
                  ? plugItemDefinition.displayProperties.name
                  : `Plug: ${plugItemHash}`,
                itemHash: plugItemHash,
                isEquipped: equippedPlugItemHash === plugItemHash,
                socketIndex,
                sortOrder: plugItemDefinition.index
              };

              slotPlugRecords.push(plugRecord);
            }

            subclassRecord.sockets[socketName].push(slotPlugRecords);
          }
        }

        subclassRecords.push(subclassRecord);
      }

      const tableData: string[][] = [];

      const tableHeader: string[] = ["Name", "Slot", "Equipped"];
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

      subclassRecords.forEach((subclassRecord) => {
        const subClassColumns = ["Subclass", "", subclassRecord.name];
        if (verbose) {
          subClassColumns.push(`${subclassRecord.itemHash}:${subclassRecord.itemInstanceId}`);
        }
        if (showAll) {
          subClassColumns.push("");
          if (verbose) {
            subClassColumns.push("");
          }
        }
        tableData.push(subClassColumns);

        [
          { name: "Super", records: subclassRecord.sockets["SUPER"].flat() },
          { name: "Class Ability", records: subclassRecord.sockets["ABILITIES"][0] || [] },
          { name: "Movement", records: subclassRecord.sockets["ABILITIES"][1] || [] },
          { name: "Melee", records: subclassRecord.sockets["ABILITIES"][2] || [] },
          { name: "Grenade", records: subclassRecord.sockets["ABILITIES"][3] || [] },
          { name: "Aspects", records: subclassRecord.sockets["ASPECTS"].flat() },
          { name: "Fragments", records: subclassRecord.sockets["FRAGMENTS"].flat() }
        ].forEach((plugSet) => {
          const [_equippedRecords, _unequippedRecords] = plugSet.records.reduce(
            (acc, plugRecord) => {
              acc[plugRecord.isEquipped ? 0 : 1].push(plugRecord);
              return acc;
            },
            [[], []] as [SubclassPlugRecord[], SubclassPlugRecord[]]
          );

          const equippedRecords = _equippedRecords.sort((a, b) => a.sortOrder - b.sortOrder);

          // We need to do some de-duping here to remove extra entries from subclass plug sets that
          // can have multiple sockets and each socket can have the same set of available plugs to
          // choose from (i.e. the "Aspects" and "Fragments" plug sets are like that).
          const equippedRecordHashes = _equippedRecords.map((record) => record.itemHash);
          const unequippedRecords = Object.values(
            _unequippedRecords
              .filter((record) => !equippedRecordHashes.includes(record.itemHash))
              .reduce(
                (acc, record) => ({ ...acc, [record.itemHash]: record }),
                {} as Record<number, SubclassPlugRecord>
              )
          ).sort((a, b) => a.sortOrder - b.sortOrder);

          for (
            let plugIndex = 0;
            plugIndex < Math.max(equippedRecords.length, unequippedRecords.length);
            plugIndex++
          ) {
            const equippedPlug = equippedRecords[plugIndex] || null;
            const unequippedPlug = unequippedRecords[plugIndex] || null;

            const rowColumns = [plugIndex === 0 ? plugSet.name : ""];

            rowColumns.push(equippedPlug ? `${equippedPlug.socketIndex + 1}` : "");
            rowColumns.push(equippedPlug ? equippedPlug.name : "");
            if (verbose) {
              rowColumns.push(equippedPlug ? `${equippedPlug.itemHash}` : "");
            }
            if (showAll) {
              rowColumns.push(unequippedPlug ? `${unequippedPlug.name}` : "");
              if (verbose) {
                rowColumns.push(unequippedPlug ? `${unequippedPlug.itemHash}` : "");
              }
            }

            tableData.push(rowColumns);
          }
        });
      });

      logger.log(makeTable2(tableData));
    }
  };
};
