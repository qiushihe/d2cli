import fs from "fs";
import path from "path";

import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { loadoutNameOption } from "~src/cli/command-option/loadout.option";
import { LoadoutNameCommandOptions } from "~src/cli/command-option/loadout.option";
import { includeUnequippedOption } from "~src/cli/command-option/loadout.option";
import { IncludeUnequippedCommandOptions } from "~src/cli/command-option/loadout.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { getEditedContent } from "~src/helper/edit.helper";
import { getSubclassItems } from "~src/helper/inventory-bucket.helper";
import { groupEquipmentItems } from "~src/helper/inventory-bucket.helper";
import { ArmourBucketHashes } from "~src/helper/inventory-bucket.helper";
import { LoadoutInventoryBuckets } from "~src/helper/loadout-export.helper";
import { serializeItem } from "~src/helper/loadout-export.helper";
import { serializeItemPlugs } from "~src/helper/loadout-export.helper";
import { promisedFn } from "~src/helper/promise.helper";
import { SUBCLASS_SOCKET_NAMES } from "~src/helper/subclass.helper";
import { getLoadoutPlugRecords } from "~src/helper/subclass.helper";
import { LoadoutPlugRecord } from "~src/helper/subclass.helper";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { resolveCharacterItems } from "~src/service/destiny2-component-data/character.resolver";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { PastebinService } from "~src/service/pastebin/pastebin.service";
import { PlugService } from "~src/service/plug/plug.service";
import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

type CmdOptions = SessionIdCommandOptions &
  LoadoutNameCommandOptions &
  IncludeUnequippedCommandOptions & { edit: boolean; toFile: string; toPastebin: boolean };

type EquipmentGroup = {
  isExtra: boolean;
  separateEquipments: boolean;
  equipments: DestinyItemComponent[];
};

const cmd: CommandDefinition = {
  description: "Export the currently equipped loadout",
  options: [
    sessionIdOption,
    loadoutNameOption,
    includeUnequippedOption,
    {
      flags: ["edit"],
      description: "Edit the loadout content before writing it to a destination",
      defaultValue: false
    },
    {
      flags: ["to-file <file-path>"],
      description: "Path to the loadout file to write",
      defaultValue: ""
    },
    {
      flags: ["to-pastebin"],
      description: "Save the loadout to Pastebin",
      defaultValue: false
    }
  ],
  action: async (_, opts, { app, logger }) => {
    const {
      session: sessionId,
      loadoutName,
      includeUnequipped,
      edit: editBeforeExport,
      toFile,
      toPastebin
    } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const configService = app.resolve(ConfigService);

    const manifestDefinitionService = app.resolve(ManifestDefinitionService);

    const characterSelectionService = app.resolve(CharacterSelectionService);

    const pastebinService = app.resolve(PastebinService);

    const plugService = app.resolve(PlugService);

    const destiny2ComponentDataService = app.resolve(Destiny2ComponentDataService);

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Indexing character items ...");
    const [characterItemsErr, characterItems] =
      await destiny2ComponentDataService.getCharacterComponentsData(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId,
        resolveCharacterItems
      );
    if (characterItemsErr) {
      return logger.loggedError(`Unable to index character items: ${characterItemsErr.message}`);
    }

    const allItems = includeUnequipped
      ? [...characterItems.equipped, ...characterItems.unequipped]
      : characterItems.equipped;
    const allItemsSockets = characterItems.sockets;

    const equippedItemHashes = characterItems.equipped.map((item) => item.itemHash);
    const unequippedItemHashes = includeUnequipped
      ? characterItems.unequipped.map((item) => item.itemHash)
      : [];
    const allItemHashes = [...equippedItemHashes, ...unequippedItemHashes];

    logger.info(`Indexing character item definitions ...`);
    const allItemDefinitions: Record<number, DestinyInventoryItemDefinition> = {};
    for (let itemHashIndex = 0; itemHashIndex < allItemHashes.length; itemHashIndex++) {
      const itemHash = allItemHashes[itemHashIndex];

      const [itemDefinitionErr, itemDefinition] = await manifestDefinitionService.getItemDefinition(
        itemHash
      );
      if (itemDefinitionErr) {
        return logger.loggedError(
          `Unable to fetch item definition for ${itemHash}: ${itemDefinitionErr.message}`
        );
      }
      if (!itemDefinition) {
        return logger.loggedError(`Unable to find item definition for: ${itemHash}`);
      }

      allItemDefinitions[itemHash] = itemDefinition;
    }

    const subclass = getSubclassItems(characterItems.equipped)[0];
    if (!subclass) {
      return logger.loggedError(`Unable to retrieve equipped subclass items`);
    }

    const [subclassPlugRecordsErr, subclassPlugRecords] = await getLoadoutPlugRecords(
      logger,
      allItemDefinitions,
      allItemsSockets,
      plugService,
      sessionId,
      characterInfo.membershipType,
      characterInfo.membershipId,
      characterInfo.characterId,
      subclass.itemHash,
      subclass.itemInstanceId,
      SUBCLASS_SOCKET_NAMES
    );
    if (subclassPlugRecordsErr) {
      return logger.loggedError(
        `Unable to export subclass plugs: ${subclassPlugRecordsErr.message}`
      );
    }

    const equipmentsByBucket = groupEquipmentItems(allItems);
    const equipments = LoadoutInventoryBuckets.reduce(
      (acc, bucket) => [...acc, ...equipmentsByBucket[bucket]],
      [] as DestinyItemComponent[]
    );

    const equipmentsPlugRecords: Record<string, LoadoutPlugRecord[]> = {};

    for (let equipmentIndex = 0; equipmentIndex < equipments.length; equipmentIndex++) {
      const equipment = equipments[equipmentIndex];
      const equipmentDefinition = allItemDefinitions[equipment.itemHash];

      if (ArmourBucketHashes.includes(equipment.bucketHash)) {
        const [equipmentPlugRecordsErr, equipmentPlugRecords] = await getLoadoutPlugRecords(
          logger,
          allItemDefinitions,
          allItemsSockets,
          plugService,
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId,
          equipment.itemHash,
          equipment.itemInstanceId,
          ["ARMOR MODS"]
        );
        if (equipmentPlugRecordsErr) {
          return logger.loggedError(
            `Unable to export equipment plugs for ${
              equipmentDefinition?.displayProperties.name || `ITEM: ${equipment.itemHash}`
            } (${equipment.itemHash}:${equipment.itemInstanceId}): ${
              equipmentPlugRecordsErr.message
            }`
          );
        }

        equipmentsPlugRecords[`${equipment.itemHash}:${equipment.itemInstanceId}`] =
          equipmentPlugRecords;
      }
    }

    const exportLinesGroups: string[][] = [];

    const subclassDefinition = allItemDefinitions[subclass.itemHash];

    const exportedLoadoutName =
      loadoutName || `${subclassDefinition?.displayProperties.name || "UNKNOWN SUBCLASS"} Loadout`;

    exportLinesGroups.push([`LOADOUT // ${exportedLoadoutName}`]);

    const subclassExportLines: string[] = [];
    const [serializeSubclassErr, serializedSubclass] = await serializeItem(
      allItemDefinitions,
      subclass,
      true
    );
    if (serializeSubclassErr) {
      return logger.loggedError(`Unable to serialize subclass: ${serializeSubclassErr.message}`);
    }
    subclassExportLines.push(serializedSubclass);

    const [serializeSubclassPlugsErr, serializedSubclassPlugs] = await serializeItemPlugs(
      manifestDefinitionService,
      subclass,
      subclassPlugRecords
    );
    if (serializeSubclassPlugsErr) {
      return logger.loggedError(
        `Unable to serialize subclass plugs: ${serializeSubclassPlugsErr.message}`
      );
    }
    serializedSubclassPlugs.forEach((serialized) => {
      subclassExportLines.push(serialized);
    });
    exportLinesGroups.push(subclassExportLines);

    const equipmentsGroups: EquipmentGroup[] = [
      {
        isExtra: false,
        separateEquipments: false,
        equipments: equipments.filter(
          (equipment) =>
            !unequippedItemHashes.includes(equipment.itemHash) &&
            !ArmourBucketHashes.includes(equipment.bucketHash)
        )
      },
      {
        isExtra: false,
        separateEquipments: true,
        equipments: equipments.filter(
          (equipment) =>
            !unequippedItemHashes.includes(equipment.itemHash) &&
            ArmourBucketHashes.includes(equipment.bucketHash)
        )
      },
      {
        isExtra: true,
        separateEquipments: false,
        equipments: equipments.filter(
          (equipment) =>
            unequippedItemHashes.includes(equipment.itemHash) &&
            !ArmourBucketHashes.includes(equipment.bucketHash)
        )
      },
      {
        isExtra: true,
        separateEquipments: true,
        equipments: equipments.filter(
          (equipment) =>
            unequippedItemHashes.includes(equipment.itemHash) &&
            ArmourBucketHashes.includes(equipment.bucketHash)
        )
      }
    ];

    // TODO: Refactor this into a service function
    const serializeEquipment = async (
      equipment: DestinyItemComponent,
      isExtra: boolean
    ): Promise<[Error, null] | [null, string[]]> => {
      const lines: string[] = [];

      const [serializeEquipmentErr, serializedEquipment] = await serializeItem(
        allItemDefinitions,
        equipment,
        !isExtra
      );
      if (serializeEquipmentErr) {
        return [serializeEquipmentErr, null];
      }
      lines.push(serializedEquipment);

      const [serializeEquipmentPlugsErr, serializedEquipmentPlugs] = await serializeItemPlugs(
        manifestDefinitionService,
        equipment,
        equipmentsPlugRecords[`${equipment.itemHash}:${equipment.itemInstanceId}`] || []
      );
      if (serializeEquipmentPlugsErr) {
        return [serializeEquipmentPlugsErr, null];
      }
      serializedEquipmentPlugs.forEach((serialized) => {
        lines.push(serialized);
      });

      return [null, lines];
    };

    for (let groupIndex = 0; groupIndex < equipmentsGroups.length; groupIndex++) {
      const equipmentsGroup = equipmentsGroups[groupIndex];

      if (equipmentsGroup.separateEquipments) {
        for (
          let equipmentIndex = 0;
          equipmentIndex < equipmentsGroup.equipments.length;
          equipmentIndex++
        ) {
          const equipment = equipmentsGroup.equipments[equipmentIndex];

          const [equipmentExportLinesErr, equipmentExportLines] = await serializeEquipment(
            equipment,
            equipmentsGroup.isExtra
          );
          if (equipmentExportLinesErr) {
            return logger.loggedError(
              `Unable to serialize equipment: ${equipmentExportLinesErr.message}`
            );
          }

          if (equipmentExportLines.length > 0) {
            exportLinesGroups.push(equipmentExportLines);
          }
        }
      } else {
        const equipmentsExportLines: string[] = [];

        for (
          let equipmentIndex = 0;
          equipmentIndex < equipmentsGroup.equipments.length;
          equipmentIndex++
        ) {
          const equipment = equipmentsGroup.equipments[equipmentIndex];

          const [equipmentExportLinesErr, equipmentExportLines] = await serializeEquipment(
            equipment,
            equipmentsGroup.isExtra
          );
          if (equipmentExportLinesErr) {
            return logger.loggedError(
              `Unable to serialize equipment: ${equipmentExportLinesErr.message}`
            );
          }
          equipmentExportLines.forEach((line) => equipmentsExportLines.push(line));
        }

        if (equipmentsExportLines.length > 0) {
          exportLinesGroups.push(equipmentsExportLines);
        }
      }
    }

    const exportContent = exportLinesGroups.map((lines) => lines.join("\n")).join("\n\n");

    let finalExportContent: string;
    if (editBeforeExport) {
      const [editorPathErr, editorPath] = configService.getAppConfig(AppConfigName.EditorPath);
      if (editorPathErr) {
        return logger.loggedError(`Unable to retrieve editor path: ${editorPathErr.message}`);
      }
      if (!editorPath || editorPath.trim().length <= 0) {
        return logger.loggedError(`Missing editor path`);
      }

      const [editedLoadoutContentErr, editedLoadoutContent] = await getEditedContent(
        logger,
        editorPath.trim(),
        exportContent
      );
      if (editedLoadoutContentErr) {
        return logger.loggedError(`Unable to edit loadout: ${editedLoadoutContentErr.message}`);
      }

      finalExportContent = editedLoadoutContent;
    } else {
      finalExportContent = exportContent;
    }

    if (toFile) {
      const loadoutFilePath = path.isAbsolute(toFile)
        ? toFile
        : path.resolve(process.cwd(), toFile);

      logger.info("Writing to loadout file ...");
      const [writeErr] = await promisedFn(
        () =>
          new Promise<void>((resolve, reject) => {
            fs.writeFile(loadoutFilePath, finalExportContent, "utf8", (err) => {
              err ? reject(err) : resolve();
            });
          })
      );
      if (writeErr) {
        return logger.loggedError(`Unable to write loadout file: ${writeErr.message}`);
      }
      logger.log(`Loadout exported to: ${loadoutFilePath}`);
    } else if (toPastebin) {
      logger.info("Writing loadout to Pastebin ...");
      const [pastebinUrlErr, pastebinUrl] = await pastebinService.createPaste(
        exportedLoadoutName,
        finalExportContent
      );
      if (pastebinUrlErr) {
        return logger.loggedError(`Unable to write to Pastebin: ${pastebinUrlErr.message}`);
      }

      logger.log(`Loadout URL (Pastebin): ${pastebinUrl}`);
    } else {
      logger.log(finalExportContent);
    }
  }
};

export default cmd;
