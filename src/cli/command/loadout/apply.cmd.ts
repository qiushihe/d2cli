import chalk from "chalk";
import fs from "fs";
import path from "path";

import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { SerializedItem } from "~src/helper/item-serialization.helper";
import { SerializedPlug } from "~src/helper/item-serialization.helper";
import { serializeItem } from "~src/helper/item-serialization.helper";
import { serializeAllItems } from "~src/helper/item-serialization.helper";
import { LoadoutAction } from "~src/helper/loadout-action.helper";
import { describeLoadoutAction } from "~src/helper/loadout-action.helper";
import { resolveTransferActions } from "~src/helper/loadout-action.helper";
import { resolveDeExoticActions } from "~src/helper/loadout-action.helper";
import { resolveEquipActions } from "~src/helper/loadout-action.helper";
import { resolveSocketActions } from "~src/helper/loadout-action.helper";
import { applyLoadoutAction } from "~src/helper/loadout-action.helper";
import { promisedFn } from "~src/helper/promise.helper";
import { SUBCLASS_SOCKET_NAMES } from "~src/helper/subclass.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { Destiny2InventoryEquipmentService } from "~src/service/destiny2-inventory-equipment/destiny2-inventory-equipment.service";
import { Destiny2InventoryTransferService } from "~src/service/destiny2-inventory-transfer/destiny2-inventory-transfer.service";
import { Destiny2ItemService } from "~src/service/destiny2-item/destiny2-item.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2PlugService } from "~src/service/destiny2-plug/destiny2-plug.service";
import { SocketName } from "~src/service/destiny2-plug/destiny2-plug.service.types";
import { LogService } from "~src/service/log/log.service";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

type CmdOptions = SessionIdCommandOptions &
  VerboseCommandOptions & { file: string; dryRun: boolean };

const cmd: CommandDefinition = {
  description: "Apply a loadout to the current character",
  options: [
    sessionIdOption,
    verboseOption,
    {
      flags: ["f", "file <loadout-file>"],
      description: "Path to the loadout file to apply",
      defaultValue: ""
    },
    {
      flags: ["dry-run"],
      description: "Only list the expected loadout actions without applying them",
      defaultValue: false
    }
  ],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:loadout:apply");

    const { session: sessionId, verbose, file, dryRun } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");

    const characterDescriptionService =
      AppModule.getDefaultInstance().resolve<CharacterDescriptionService>(
        "CharacterDescriptionService"
      );

    const destiny2InventoryTransferService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryTransferService>(
        "Destiny2InventoryTransferService"
      );

    const destiny2InventoryEquipmentService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryEquipmentService>(
        "Destiny2InventoryEquipmentService"
      );

    const destiny2ItemService =
      AppModule.getDefaultInstance().resolve<Destiny2ItemService>("Destiny2ItemService");

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

    const loadoutFilePath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);

    const [fileContentErr, fileContent] = await fnWithSpinner("Reading loadout file ...", () =>
      promisedFn(
        () =>
          new Promise<string>((resolve, reject) => {
            fs.readFile(loadoutFilePath, "utf8", (err, data) => {
              err ? reject(err) : resolve(data);
            });
          })
      )
    );
    if (fileContentErr) {
      return logger.loggedError(`Unable to read loadout file: ${fileContentErr.message}`);
    }

    const loadoutLines = `${fileContent}`
      .trim()
      .split("\n")
      .map((line) => `${line}`.trim())
      .filter((line) => line.length > 0);

    let loadoutName = "";
    const loadoutEquipments: SerializedItem[] = [];
    const loadoutExtraEquipments: SerializedItem[] = [];
    const loadoutPlugs: SerializedPlug[] = [];

    for (let lineIndex = 0; lineIndex < loadoutLines.length; lineIndex++) {
      const line = loadoutLines[lineIndex];
      const metaLineMatch = line.match(/^LOADOUT\s*\/\/(.*)$/);
      if (metaLineMatch) {
        loadoutName = `${metaLineMatch[1]}`.trim();
      } else {
        const dataLineMatch = line.match(/^([^/]+)\s*\/\/([^/]*)\s*\/\/(.*)$/);
        if (dataLineMatch) {
          const dataType = `${dataLineMatch[1]}`.trim();
          const dataValue = `${dataLineMatch[2]}`.trim();
          const dataLabel = `${dataLineMatch[3]}`.trim();

          if (dataType === "EQUIP") {
            const dataParts = dataValue.split(":", 2);
            const itemHash = parseInt(`${dataParts[0]}`.trim(), 10);
            const itemInstanceId = `${dataParts[1]}`.trim().replace(/\D/gi, "");

            const itemDefinition = itemDefinitions[itemHash];
            if (!itemDefinition) {
              return logger.loggedError(`Unable to find item definition for: ${itemHash}`);
            }

            const [serializeItemErr, serializedItem] = serializeItem(
              itemDefinition,
              itemHash,
              itemInstanceId
            );
            if (serializeItemErr) {
              return logger.loggedError(`Unable to serialize item: ${serializeItemErr.message}`);
            }

            loadoutEquipments.push(serializedItem);
          } else if (dataType === "EXTRA") {
            const dataParts = dataValue.split(":", 2);
            const itemHash = parseInt(`${dataParts[0]}`.trim(), 10);
            const itemInstanceId = `${dataParts[1]}`.trim().replace(/\D/gi, "");

            const itemDefinition = itemDefinitions[itemHash];
            if (!itemDefinition) {
              return logger.loggedError(`Unable to find extra item definition for: ${itemHash}`);
            }

            const [serializeItemErr, serializedItem] = serializeItem(
              itemDefinition,
              itemHash,
              itemInstanceId
            );
            if (serializeItemErr) {
              return logger.loggedError(
                `Unable to serialize extra item: ${serializeItemErr.message}`
              );
            }

            loadoutExtraEquipments.push(serializedItem);
          } else if (dataType === "SOCKET") {
            const dataParts = dataValue.split("::", 3);
            const itemParts = `${dataParts[0]}`.trim().split(":", 2);
            const indexParts = `${dataParts[1]}`.trim().split(":", 2);
            const plugParts = `${dataParts[2]}`.trim().split(":", 2);
            const itemHash = parseInt(`${itemParts[0]}`.trim(), 10);
            const itemInstanceId = `${itemParts[1]}`.trim().replace(/\D/gi, "");
            const socketIndex = parseInt(`${indexParts[1]}`.trim(), 10);
            const plugItemHash = parseInt(`${plugParts[1]}`.trim(), 10);

            const plugItemDefinition = itemDefinitions[plugItemHash];
            if (!plugItemDefinition) {
              return logger.loggedError(`Unable to find item definition for: ${plugItemHash}`);
            }

            const itemDefinition = itemDefinitions[itemHash];
            if (!itemDefinition) {
              return logger.loggedError(`Unable to find item definition for: ${itemHash}`);
            }

            const [serializeItemErr, serializedItem] = serializeItem(
              itemDefinition,
              itemHash,
              itemInstanceId
            );
            if (serializeItemErr) {
              return logger.loggedError(
                `Unable to serialize plug item: ${serializeItemErr.message}`
              );
            }

            loadoutPlugs.push({
              label: dataLabel,
              itemType: serializedItem.itemType,
              itemBucket: serializedItem.itemBucket,
              itemName: serializedItem.itemName,
              itemHash,
              itemInstanceId,
              socketIndex,
              plugItemName: plugItemDefinition.displayProperties.name || "UNKNOWN PLUG",
              plugItemHash
            });
          }
        }
      }
    }

    logger.debug(`Loadout name: ${loadoutName}`);

    const [characterDescriptionsErr, characterDescriptions] = await fnWithSpinner(
      "Retrieving character descriptions ...",
      () => characterDescriptionService.getDescriptions(sessionId)
    );
    if (characterDescriptionsErr) {
      return logger.loggedError(
        `Unable to retrieve character descriptions: ${characterDescriptionsErr.message}`
      );
    }

    const [allItemsInfoErr, allItemsInfo] = await fnWithSpinner("Indexing existing items ...", () =>
      serializeAllItems(
        destiny2InventoryService,
        itemDefinitions,
        characterDescriptions,
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId
      )
    );
    if (allItemsInfoErr) {
      return logger.loggedError(`Unable to index existing items: ${allItemsInfoErr.message}`);
    }

    const loadoutActions: LoadoutAction[] = [];

    const [equipmentTransferActionsErr, equipmentTransferActions] = resolveTransferActions(
      itemDefinitions,
      characterDescriptions,
      characterInfo.characterId,
      loadoutEquipments,
      allItemsInfo.currentCharacter,
      allItemsInfo.otherCharacter,
      allItemsInfo.vault
    );
    if (equipmentTransferActionsErr) {
      return logger.loggedError(
        `Unable to resolve equipment transfer actions: ${equipmentTransferActionsErr.message}`
      );
    }
    equipmentTransferActions.forEach((action) => loadoutActions.push(action));

    const [extraEquipmentTransferActionsErr, extraEquipmentTransferActions] =
      resolveTransferActions(
        itemDefinitions,
        characterDescriptions,
        characterInfo.characterId,
        loadoutExtraEquipments,
        allItemsInfo.currentCharacter,
        allItemsInfo.otherCharacter,
        allItemsInfo.vault
      );
    if (extraEquipmentTransferActionsErr) {
      return logger.loggedError(
        `Unable to resolve extra equipment transfer actions: ${extraEquipmentTransferActionsErr.message}`
      );
    }
    extraEquipmentTransferActions.forEach((action) => loadoutActions.push(action));

    const exoticWeapon =
      loadoutEquipments.find((item) => item.itemType === "WEAPON" && item.isItemExotic) || null;
    let reEquipExoticWeapon = false;
    if (exoticWeapon) {
      const alreadyEquipped = !!allItemsInfo.currentCharacter.equipped.find(
        (equipped) => equipped.itemInstanceId === exoticWeapon.itemInstanceId
      );

      if (!alreadyEquipped) {
        const [deExoticActionsErr, deExoticActions] = resolveDeExoticActions(
          characterDescriptions,
          characterInfo.characterId,
          loadoutExtraEquipments,
          allItemsInfo.otherCharacter,
          allItemsInfo.vault,
          exoticWeapon
        );
        if (deExoticActionsErr) {
          return logger.loggedError(
            `Unable to resolve de-exotic weapon actions: ${deExoticActionsErr.message}`
          );
        }
        deExoticActions.forEach((action) => loadoutActions.push(action));
        reEquipExoticWeapon = true;
      }
    }

    const exoticArmour =
      loadoutEquipments.find((item) => item.itemType === "ARMOUR" && item.isItemExotic) || null;
    let reEquipExoticArmour = false;
    if (exoticArmour) {
      const alreadyEquipped = !!allItemsInfo.currentCharacter.equipped.find(
        (equipped) => equipped.itemInstanceId === exoticArmour.itemInstanceId
      );

      if (!alreadyEquipped) {
        const [deExoticActionsErr, deExoticActions] = resolveDeExoticActions(
          characterDescriptions,
          characterInfo.characterId,
          loadoutExtraEquipments,
          allItemsInfo.otherCharacter,
          allItemsInfo.vault,
          exoticArmour
        );
        if (deExoticActionsErr) {
          return logger.loggedError(
            `Unable to resolve de-exotic armour actions: ${deExoticActionsErr.message}`
          );
        }
        deExoticActions.forEach((action) => loadoutActions.push(action));
        reEquipExoticArmour = true;
      }
    }

    resolveEquipActions(
      characterDescriptions,
      characterInfo.characterId,
      loadoutEquipments.filter((item) => !item.isItemExotic),
      allItemsInfo.currentCharacter.equipped
    ).forEach((loadoutAction) => loadoutActions.push(loadoutAction));

    if (exoticWeapon && reEquipExoticWeapon) {
      loadoutActions.push({
        type: "EQUIP",
        characterName: characterDescriptions[characterInfo.characterId].asString,
        characterId: characterInfo.characterId,
        itemName: exoticWeapon.itemName,
        itemHash: exoticWeapon.itemHash,
        itemInstanceId: exoticWeapon.itemInstanceId,
        socketIndex: null,
        plugItemName: null,
        plugItemHash: null
      });
    }

    if (exoticArmour && reEquipExoticArmour) {
      loadoutActions.push({
        type: "EQUIP",
        characterName: characterDescriptions[characterInfo.characterId].asString,
        characterId: characterInfo.characterId,
        itemName: exoticArmour.itemName,
        itemHash: exoticArmour.itemHash,
        itemInstanceId: exoticArmour.itemInstanceId,
        socketIndex: null,
        plugItemName: null,
        plugItemHash: null
      });
    }

    const socketIndicesByItemHash: Record<number, number[]> = {};
    const plugItemHashesAndTypes = Object.entries(
      loadoutPlugs.reduce(
        (acc, plug) => ({ ...acc, [plug.itemHash]: plug.itemType }),
        {} as Record<number, string>
      )
    );
    for (let plugItemIndex = 0; plugItemIndex < plugItemHashesAndTypes.length; plugItemIndex++) {
      const [itemHashStr, itemType] = plugItemHashesAndTypes[plugItemIndex];
      const itemHash = parseInt(itemHashStr, 10);

      if (itemType === "ARMOUR") {
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
        socketIndicesByItemHash[itemHash] = armourPlugItemSocketIndices;
      } else if (itemType === "SUBCLASS") {
        socketIndicesByItemHash[itemHash] = [];

        for (
          let socketNameIndex = 0;
          socketNameIndex < SUBCLASS_SOCKET_NAMES.length;
          socketNameIndex++
        ) {
          const socketName = SUBCLASS_SOCKET_NAMES[socketNameIndex] as SocketName;

          const [socketIndicesErr, socketIndices] = await fnWithSpinner(
            `Fetching ${socketName.toLocaleLowerCase()} socket indices ...`,
            () =>
              destiny2PlugService.getSocketIndices(
                sessionId,
                characterInfo.membershipType,
                characterInfo.membershipId,
                characterInfo.characterId,
                itemHash,
                socketName
              )
          );
          if (socketIndicesErr) {
            return logger.loggedError(
              `Unable to fetch ${socketName.toLocaleLowerCase()} socket indices: ${
                socketIndicesErr.message
              }`
            );
          }

          socketIndices.forEach((socketIndex) =>
            socketIndicesByItemHash[itemHash].push(socketIndex)
          );
        }
      }
    }

    const equippedPlugHashesByItemInstanceId: Record<string, number[]> = {};
    const plugItemInstanceIdsAndHashes = Object.entries(
      loadoutPlugs.reduce(
        (acc, plug) => ({ ...acc, [plug.itemInstanceId]: plug.itemHash }),
        {} as Record<string, number>
      )
    );
    for (
      let plugItemIndex = 0;
      plugItemIndex < plugItemInstanceIdsAndHashes.length;
      plugItemIndex++
    ) {
      const [itemInstanceId, itemHash] = plugItemInstanceIdsAndHashes[plugItemIndex];
      const itemDefinition = itemDefinitions[itemHash];
      const itemName = itemDefinition?.displayProperties.name || "UNKNOWN ITEM";

      const [equippedPlugHashesErr, _equippedPlugHashes] = await fnWithSpinner(
        `Fetching equipped plugs for ${itemName} ...`,
        () =>
          destiny2ItemService.getItemEquippedPlugHashes(
            sessionId,
            characterInfo.membershipType,
            characterInfo.membershipId,
            itemInstanceId
          )
      );
      if (equippedPlugHashesErr) {
        return logger.loggedError(
          `Unable to fetch equipped plugs for ${itemName}: ${equippedPlugHashesErr.message}`
        );
      }

      equippedPlugHashesByItemInstanceId[itemInstanceId] = socketIndicesByItemHash[itemHash].map(
        (index) => _equippedPlugHashes[index]
      );
    }

    resolveSocketActions(
      characterDescriptions,
      characterInfo.characterId,
      socketIndicesByItemHash,
      equippedPlugHashesByItemInstanceId,
      loadoutPlugs
    ).forEach((loadoutAction) => loadoutActions.push(loadoutAction));

    const tableData: string[][] = [];

    const tableHeader = [];
    if (!dryRun) {
      tableHeader.push("Success?");
    }
    tableHeader.push("Character");
    tableHeader.push("Action");
    tableHeader.push("Item");
    if (verbose) {
      tableHeader.push("Item ID");
    }
    tableHeader.push("Socket");
    tableHeader.push("Plug");
    if (verbose) {
      tableHeader.push("Plug ID");
    }
    if (!dryRun) {
      tableHeader.push("Message");
    }
    tableData.push(tableHeader);

    for (let actionIndex = 0; actionIndex < loadoutActions.length; actionIndex++) {
      const loadoutAction = loadoutActions[actionIndex];
      let actionSuccess: boolean;
      let actionMessage: string;

      if (!dryRun) {
        const loadoutActionDescription = describeLoadoutAction(loadoutAction);
        const loadoutActionErr = await fnWithSpinner(
          `Applying loadout action: ${loadoutActionDescription} ...`,
          () =>
            applyLoadoutAction(
              destiny2InventoryTransferService,
              destiny2InventoryEquipmentService,
              destiny2PlugService,
              loadoutAction,
              sessionId,
              characterInfo.membershipType
            )
        );
        if (loadoutActionErr) {
          actionSuccess = false;
          actionMessage = loadoutActionErr.message;
        } else {
          actionSuccess = true;
          actionMessage = "";
        }
      } else {
        actionSuccess = false;
        actionMessage = "";
      }

      const tableRow = [];
      if (!dryRun) {
        tableRow.push(actionSuccess ? chalk.bgGreen(" Yes ") : chalk.bgRed(" No "));
      }
      tableRow.push(loadoutAction.characterName);
      tableRow.push(loadoutAction.type);
      tableRow.push(loadoutAction.itemName);
      if (verbose) {
        tableRow.push(`${loadoutAction.itemHash}:${loadoutAction.itemInstanceId}`);
      }
      tableRow.push(loadoutAction.socketIndex !== null ? `${loadoutAction.socketIndex + 1}` : "");
      tableRow.push(loadoutAction.plugItemName || "");
      if (verbose) {
        tableRow.push(loadoutAction.plugItemHash ? `${loadoutAction.plugItemHash}` : "");
      }
      if (!dryRun) {
        tableRow.push(actionMessage);
      }
      tableData.push(tableRow);
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
