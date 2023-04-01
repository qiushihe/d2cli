import fs from "fs";
import path from "path";

import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { getEditedContent } from "~src/helper/edit.helper";
import { LoadoutItem } from "~src/helper/loadout-apply.helper";
import { LoadoutPlug } from "~src/helper/loadout-apply.helper";
import { parseLoadoutItem } from "~src/helper/loadout-apply.helper";
import { LoadoutAction } from "~src/helper/loadout-apply.helper";
import { describeLoadoutAction } from "~src/helper/loadout-apply.helper";
import { resolveTransferActions } from "~src/helper/loadout-apply.helper";
import { resolveDeExoticActions } from "~src/helper/loadout-apply.helper";
import { resolveEquipActions } from "~src/helper/loadout-apply.helper";
import { resolveSocketActions } from "~src/helper/loadout-apply.helper";
import { applyLoadoutAction } from "~src/helper/loadout-apply.helper";
import { promisedFn } from "~src/helper/promise.helper";
import { SUBCLASS_SOCKET_NAMES } from "~src/helper/subclass.helper";
import { makeTable2 } from "~src/helper/table.helper";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";
import { Destiny2ActionService } from "~src/service/destiny2-action/destiny2-action.service";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { resolveProfileCharacterItemsAndVaultItemsAndItemPlugHashes } from "~src/service/destiny2-component-data/profile.resolver";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { PastebinService } from "~src/service/pastebin/pastebin.service";
import { PlugService } from "~src/service/plug/plug.service";
import { SocketName } from "~src/service/plug/plug.service.types";
import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

type CmdOptions = SessionIdCommandOptions &
  VerboseCommandOptions & {
    dryRun: boolean;
    edit: boolean;
    fromFile: string;
    fromPastebin: string;
  };

const PASTEBIN_ID_FROM_URL_REGEXP = new RegExp("^https://pastebin.com/([^/]*)$", "gi");

const cmd: CommandDefinition = {
  description: "Apply a loadout to the current character",
  options: [
    sessionIdOption,
    verboseOption,
    {
      flags: ["dry-run"],
      description: "Only list the expected loadout actions without applying them",
      defaultValue: false
    },
    {
      flags: ["edit"],
      description: "Edit the loadout content before applying it",
      defaultValue: false
    },
    {
      flags: ["from-file <file-path>"],
      description: "Path to the loadout file to apply",
      defaultValue: ""
    },
    {
      flags: ["from-pastebin <loadout-url>"],
      description: "Read the loadout from Pastebin",
      defaultValue: ""
    }
  ],
  action: async (_, opts, { app, logger }) => {
    const {
      session: sessionId,
      verbose,
      dryRun,
      edit: editBeforeImport,
      fromFile,
      fromPastebin
    } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const configService = app.resolve(ConfigService);

    const manifestDefinitionService = app.resolve(ManifestDefinitionService);

    const characterSelectionService = app.resolve(CharacterSelectionService);

    const characterDescriptionService = app.resolve(CharacterDescriptionService);

    const destiny2ActionService = app.resolve(Destiny2ActionService);

    const destiny2ComponentDataService = app.resolve(Destiny2ComponentDataService);

    const plugService = app.resolve(PlugService);

    const pastebinService = app.resolve(PastebinService);

    let loadoutContent: string;

    if (fromFile) {
      const loadoutFilePath = path.isAbsolute(fromFile)
        ? fromFile
        : path.resolve(process.cwd(), fromFile);

      logger.info("Reading loadout file ...");
      const [fileContentErr, fileContent] = await promisedFn(
        () =>
          new Promise<string>((resolve, reject) => {
            fs.readFile(loadoutFilePath, "utf8", (err, data) => {
              err ? reject(err) : resolve(data);
            });
          })
      );
      if (fileContentErr) {
        return logger.loggedError(`Unable to read loadout file: ${fileContentErr.message}`);
      }

      loadoutContent = fileContent;
    } else if (fromPastebin) {
      const pastebinUrlMatch = PASTEBIN_ID_FROM_URL_REGEXP.exec(`${fromPastebin}`.trim());
      if (!pastebinUrlMatch) {
        return logger.loggedError(`Invalid Pastebin URL: ${fromPastebin}`);
      }

      const pasteId = `${pastebinUrlMatch[1]}`.trim();
      if (pasteId.length <= 0) {
        return logger.loggedError(`Unable to extract Paste ID from URL: ${fromPastebin}`);
      }

      const [pasteContentErr, pasteContent] = await pastebinService.getPasteById(pasteId);
      if (pasteContentErr) {
        return logger.loggedError(
          `Unable to read loadout from Pastebin: ${pasteContentErr.message}`
        );
      }

      loadoutContent = pasteContent;
    } else {
      return logger.loggedError(`Missing loadout source`);
    }

    if (editBeforeImport) {
      if (`${loadoutContent}`.trim().length <= 0) {
        return logger.loggedError(`Loading is empty`);
      }

      const [editorPathErr, editorPath] = configService.getAppConfig(AppConfigName.EditorPath);
      if (editorPathErr) {
        return logger.loggedError(`Unable to retrieve editor path: ${editorPathErr.message}`);
      }
      if (!editorPath || editorPath.trim().length <= 0) {
        return logger.loggedError(`Missing editor path`);
      }

      const [editedLoadoutContentErr, editedLoadoutContent] = await getEditedContent(
        logger,
        editorPath,
        `${loadoutContent}`.trim()
      );
      if (editedLoadoutContentErr) {
        return logger.loggedError(`Unable to edit loadout: ${editedLoadoutContentErr.message}`);
      }

      loadoutContent = editedLoadoutContent;
    }

    if (`${loadoutContent}`.trim().length <= 0) {
      return logger.loggedError(`Loading is empty`);
    }

    const loadoutLines = `${loadoutContent}`
      .trim()
      .split("\n")
      .map((line) => `${line}`.trim())
      .filter((line) => line.length > 0);

    const loadoutDataLines: (
      | { type: "LOADOUT_NAME"; loadoutName: string }
      | { type: "LOADOUT_EQUIP"; itemHash: number; itemInstanceId: string }
      | { type: "LOADOUT_EXTRA"; itemHash: number; itemInstanceId: string }
      | {
          type: "LOADOUT_SOCKET";
          itemHash: number;
          itemInstanceId: string;
          socketIndex: number;
          plugItemHash: number;
        }
    )[] = [];
    for (let lineIndex = 0; lineIndex < loadoutLines.length; lineIndex++) {
      const line = loadoutLines[lineIndex];
      const metaLineMatch = line.match(/^LOADOUT\s*\/\/(.*)$/);
      if (metaLineMatch) {
        loadoutDataLines.push({ type: "LOADOUT_NAME", loadoutName: `${metaLineMatch[1]}`.trim() });
      } else {
        const dataLineMatch = line.match(/^([^/]+)\s*\/\/([^/]*)\s*\/\/(.*)$/);
        if (dataLineMatch) {
          const dataType = `${dataLineMatch[1]}`.trim();
          const dataValue = `${dataLineMatch[2]}`.trim();

          if (dataType === "EQUIP") {
            const dataParts = dataValue.split(":", 2);
            const itemHash = parseInt(`${dataParts[0]}`.trim(), 10);
            const itemInstanceId = `${dataParts[1]}`.trim().replace(/\D/gi, "");

            loadoutDataLines.push({ type: "LOADOUT_EQUIP", itemHash, itemInstanceId });
          } else if (dataType === "EXTRA") {
            const dataParts = dataValue.split(":", 2);
            const itemHash = parseInt(`${dataParts[0]}`.trim(), 10);
            const itemInstanceId = `${dataParts[1]}`.trim().replace(/\D/gi, "");

            loadoutDataLines.push({ type: "LOADOUT_EXTRA", itemHash, itemInstanceId });
          } else if (dataType === "SOCKET") {
            const dataParts = dataValue.split("::", 3);
            const itemParts = `${dataParts[0]}`.trim().split(":", 2);
            const indexParts = `${dataParts[1]}`.trim().split(":", 2);
            const plugParts = `${dataParts[2]}`.trim().split(":", 2);
            const itemHash = parseInt(`${itemParts[0]}`.trim(), 10);
            const itemInstanceId = `${itemParts[1]}`.trim().replace(/\D/gi, "");
            const socketIndex = parseInt(`${indexParts[1]}`.trim(), 10);
            const plugItemHash = parseInt(`${plugParts[1]}`.trim(), 10);

            loadoutDataLines.push({
              type: "LOADOUT_SOCKET",
              itemHash,
              itemInstanceId,
              socketIndex,
              plugItemHash
            });
          }
        }
      }
    }

    const loadoutPlugItemHashes: number[] = [];
    for (let lineIndex = 0; lineIndex < loadoutLines.length; lineIndex++) {
      const line = loadoutDataLines[lineIndex];
      if (line.type === "LOADOUT_SOCKET") {
        loadoutPlugItemHashes.push(line.plugItemHash);
      }
    }

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving character descriptions ...");
    const [characterDescriptionsErr, characterDescriptions] =
      await characterDescriptionService.getDescriptions(sessionId);
    if (characterDescriptionsErr) {
      return logger.loggedError(
        `Unable to retrieve character descriptions: ${characterDescriptionsErr.message}`
      );
    }

    logger.info("Indexing items ...");
    const [allItemsErr, allItems] = await destiny2ComponentDataService.getProfileComponentsData(
      sessionId,
      characterInfo.membershipType,
      characterInfo.membershipId,
      resolveProfileCharacterItemsAndVaultItemsAndItemPlugHashes
    );
    if (allItemsErr) {
      return logger.loggedError(`Unable to index items: ${allItemsErr.message}`);
    }

    const allItemHashes = [
      ...Object.values(allItems.charactersItems)
        .map(({ equipped, unequipped }) => [...equipped, ...unequipped])
        .flat()
        .map((item) => item.itemHash),
      ...allItems.vaultItems.map((item) => item.itemHash),
      ...loadoutPlugItemHashes
    ];

    logger.info(`Indexing item definitions ...`);
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

    const characterItems = allItems.charactersItems[characterInfo.characterId];

    const otherCharactersItems = Object.keys(allItems.charactersItems)
      .filter((characterId) => characterId !== characterInfo.characterId)
      .reduce(
        (acc, characterId) => ({
          ...acc,
          [characterId]: allItems.charactersItems[characterId]
        }),
        {} as Record<
          string,
          { equipped: DestinyItemComponent[]; unequipped: DestinyItemComponent[] }
        >
      );

    const vaultItems = allItems.vaultItems;

    let loadoutName = "";
    const loadoutEquipments: LoadoutItem[] = [];
    const loadoutExtraEquipments: LoadoutItem[] = [];
    const loadoutPlugs: LoadoutPlug[] = [];

    for (let lineIndex = 0; lineIndex < loadoutLines.length; lineIndex++) {
      const line = loadoutDataLines[lineIndex];

      if (line.type === "LOADOUT_NAME") {
        loadoutName = line.loadoutName;
      } else if (line.type === "LOADOUT_EQUIP") {
        const [loadoutEquipmentErr, loadoutEquipment] = parseLoadoutItem(
          allItemDefinitions,
          line.itemHash,
          line.itemInstanceId
        );
        if (loadoutEquipmentErr) {
          return logger.loggedError(`Unable to serialize item: ${loadoutEquipmentErr.message}`);
        }

        loadoutEquipments.push(loadoutEquipment);
      } else if (line.type === "LOADOUT_EXTRA") {
        const [loadoutExtraEquipmentErr, loadoutExtraEquipment] = parseLoadoutItem(
          allItemDefinitions,
          line.itemHash,
          line.itemInstanceId
        );
        if (loadoutExtraEquipmentErr) {
          return logger.loggedError(
            `Unable to serialize extra item: ${loadoutExtraEquipmentErr.message}`
          );
        }

        loadoutExtraEquipments.push(loadoutExtraEquipment);
      } else if (line.type === "LOADOUT_SOCKET") {
        const [loadoutPlugErr, loadoutPlug] = parseLoadoutItem(
          allItemDefinitions,
          line.itemHash,
          line.itemInstanceId
        );
        if (loadoutPlugErr) {
          return logger.loggedError(`Unable to serialize plug item: ${loadoutPlugErr.message}`);
        }

        loadoutPlugs.push({
          itemType: loadoutPlug.itemType,
          itemBucket: loadoutPlug.itemBucket,
          itemHash: line.itemHash,
          itemInstanceId: line.itemInstanceId,
          socketIndex: line.socketIndex,
          plugItemHash: line.plugItemHash
        });
      }
    }

    logger.debug(`Loadout name: ${loadoutName}`);

    const loadoutActions: LoadoutAction[] = [];

    logger.info("Resolving transfer actions ...");
    const [equipmentTransferActions2Err, equipmentTransferActions2] = await resolveTransferActions(
      characterInfo.characterId,
      loadoutEquipments,
      characterItems,
      otherCharactersItems,
      vaultItems
    );
    if (equipmentTransferActions2Err) {
      return logger.loggedError(
        `Unable to resolve equipment transfer actions: ${equipmentTransferActions2Err.message}`
      );
    }
    equipmentTransferActions2.forEach((action) => loadoutActions.push(action));

    logger.info("Resolving extra transfer actions ...");
    const [extraEquipmentTransferActions2Err, extraEquipmentTransferActions2] =
      await resolveTransferActions(
        characterInfo.characterId,
        loadoutExtraEquipments,
        characterItems,
        otherCharactersItems,
        vaultItems
      );
    if (extraEquipmentTransferActions2Err) {
      return logger.loggedError(
        `Unable to resolve extra equipment transfer actions: ${extraEquipmentTransferActions2Err.message}`
      );
    }
    extraEquipmentTransferActions2.forEach((action) => loadoutActions.push(action));

    const exoticWeapon =
      loadoutEquipments.find((item) => item.itemType === "WEAPON" && item.isItemExotic) || null;
    let reEquipExoticWeapon = false;
    if (exoticWeapon) {
      const alreadyEquipped = !!characterItems.equipped.find(
        (equipped) => equipped.itemInstanceId === exoticWeapon.itemInstanceId
      );

      const alreadyUnEquipped = !!characterItems.unequipped.find(
        (equipped) => equipped.itemInstanceId === exoticWeapon.itemInstanceId
      );

      if (!alreadyEquipped) {
        if (!alreadyUnEquipped) {
          logger.info("Resolving de-exotic weapon actions ...");
          const [deExoticActionsErr2, deExoticActions2] = resolveDeExoticActions(
            allItemDefinitions,
            characterInfo.characterId,
            loadoutExtraEquipments,
            otherCharactersItems,
            vaultItems,
            exoticWeapon
          );
          if (deExoticActionsErr2) {
            return logger.loggedError(
              `Unable to resolve de-exotic weapon actions: ${deExoticActionsErr2.message}`
            );
          }
          deExoticActions2.forEach((action) => loadoutActions.push(action));
        }
        reEquipExoticWeapon = true;
      }
    }

    const exoticArmour =
      loadoutEquipments.find((item) => item.itemType === "ARMOUR" && item.isItemExotic) || null;
    let reEquipExoticArmour = false;
    if (exoticArmour) {
      const alreadyEquipped = !!characterItems.equipped.find(
        (equipped) => equipped.itemInstanceId === exoticArmour.itemInstanceId
      );

      const alreadyUnEquipped = !!characterItems.unequipped.find(
        (equipped) => equipped.itemInstanceId === exoticArmour.itemInstanceId
      );

      if (!alreadyEquipped) {
        if (!alreadyUnEquipped) {
          logger.info("Resolving de-exotic armour actions ...");
          const [deExoticActions2Err, deExoticActions2] = resolveDeExoticActions(
            allItemDefinitions,
            characterInfo.characterId,
            loadoutExtraEquipments,
            // It's not possible to de-exotic using other classes' armour
            // pieces, so we just pass in an empty collection here, so we'll
            // only use items in the vault.
            // We _can_ use other characters' inventory for de-exotic armour
            // after the `resolveDeExoticActions` function is updated to check
            // for armours' compatibility with the current character.
            {},
            vaultItems,
            exoticArmour
          );
          if (deExoticActions2Err) {
            return logger.loggedError(
              `Unable to resolve de-exotic armour actions: ${deExoticActions2Err.message}`
            );
          }
          deExoticActions2.forEach((action) => loadoutActions.push(action));
        }
        reEquipExoticArmour = true;
      }
    }

    logger.info("Resolving equip actions ...");
    const equipActions2 = resolveEquipActions(
      characterInfo.characterId,
      loadoutEquipments.filter((item) => !item.isItemExotic),
      characterItems.equipped
    );
    equipActions2.forEach((loadoutAction) => loadoutActions.push(loadoutAction));

    if (exoticWeapon && reEquipExoticWeapon) {
      loadoutActions.push({
        skip: false,
        type: "EQUIP",
        characterId: characterInfo.characterId,
        itemHash: exoticWeapon.itemHash,
        itemInstanceId: exoticWeapon.itemInstanceId,
        socketIndex: null,
        plugItemHash: null
      });
    }

    if (exoticArmour && reEquipExoticArmour) {
      loadoutActions.push({
        skip: false,
        type: "EQUIP",
        characterId: characterInfo.characterId,
        itemHash: exoticArmour.itemHash,
        itemInstanceId: exoticArmour.itemInstanceId,
        socketIndex: null,
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

    logger.info("Retrieving item socket indices ...");
    for (let plugItemIndex = 0; plugItemIndex < plugItemHashesAndTypes.length; plugItemIndex++) {
      const [itemHashStr, itemType] = plugItemHashesAndTypes[plugItemIndex];
      const itemHash = parseInt(itemHashStr, 10);

      if (itemType === "ARMOUR") {
        const [armourPlugItemSocketIndicesErr, armourPlugItemSocketIndices] =
          await plugService.getSocketIndices(
            sessionId,
            characterInfo.membershipType,
            characterInfo.membershipId,
            characterInfo.characterId,
            itemHash,
            "ARMOR MODS"
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

          const [socketIndicesErr, socketIndices] = await plugService.getSocketIndices(
            sessionId,
            characterInfo.membershipType,
            characterInfo.membershipId,
            characterInfo.characterId,
            itemHash,
            socketName
          );
          if (socketIndicesErr) {
            return logger.loggedError(
              `Unable to retrieve ${socketName.toLocaleLowerCase()} socket indices: ${
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

    logger.info("Resolving socket actions ...");
    const socketActions2 = resolveSocketActions(
      characterInfo.characterId,
      socketIndicesByItemHash,
      allItems.itemPlugHashes,
      loadoutPlugs
    );
    socketActions2.forEach((loadoutAction) => loadoutActions.push(loadoutAction));

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
      let actionResult: "Yes" | "No" | "Skip";
      let actionMessage: string;

      if (!dryRun) {
        if (loadoutAction.skip) {
          actionResult = "Skip";
          actionMessage = "";
        } else {
          logger.info(
            `Applying loadout action: ${describeLoadoutAction(
              allItemDefinitions,
              characterDescriptions,
              loadoutAction
            )} ...`
          );
          const loadoutActionErr = await applyLoadoutAction(
            destiny2ActionService,
            plugService,
            loadoutAction,
            sessionId,
            characterInfo.membershipType
          );
          if (loadoutActionErr) {
            actionResult = "No";
            actionMessage = loadoutActionErr.message;
          } else {
            actionResult = "Yes";
            actionMessage = "";
          }
        }
      } else {
        actionResult = "Skip";
        actionMessage = "";
      }

      const tableRow = [];
      if (!dryRun) {
        tableRow.push(actionResult);
      }
      tableRow.push(characterDescriptions[loadoutAction.characterId].asString);
      tableRow.push(loadoutAction.type);
      tableRow.push(allItemDefinitions[loadoutAction.itemHash || -1]?.displayProperties.name || "");
      if (verbose) {
        tableRow.push(`${loadoutAction.itemHash}:${loadoutAction.itemInstanceId}`);
      }
      tableRow.push(loadoutAction.socketIndex !== null ? `${loadoutAction.socketIndex + 1}` : "");
      tableRow.push(
        allItemDefinitions[loadoutAction.plugItemHash || -1]?.displayProperties.name || ""
      );
      if (verbose) {
        tableRow.push(loadoutAction.plugItemHash ? `${loadoutAction.plugItemHash}` : "");
      }
      if (!dryRun) {
        tableRow.push(actionMessage);
      }
      tableData.push(tableRow);
    }

    logger.log(
      makeTable2(tableData, { flexibleColumns: verbose ? [0, tableHeader.length - 1] : [0] })
    );
  }
};

export default cmd;
