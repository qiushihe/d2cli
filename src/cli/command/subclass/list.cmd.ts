import { getSelectedCharacterInfo } from "~src/cli/command-helper/current-character.helper";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { Destiny2ItemService } from "~src/service/destiny2-item/destiny2-item.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2PlugService } from "~src/service/destiny2-plug/destiny2-plug.service";
import { SocketName } from "~src/service/destiny2-plug/destiny2-plug.service.types";
import { LogService } from "~src/service/log/log.service";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

import { sessionIdOption } from "../../command-option/session-id.option";
import { SessionIdCommandOptions } from "../../command-option/session-id.option";
import { verboseOption } from "../../command-option/verbose.option";
import { VerboseCommandOptions } from "../../command-option/verbose.option";
import { getSubclassItems } from "./inventory-bucket";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions & { showAll: boolean };

type SubclassPlugRecord = {
  name: string;
  itemHash: number;
  isEquipped: boolean;
};

type SubclassRecord = {
  name: string;
  itemHash: number;
  itemInstanceId: string;
  isEquipped: boolean;
  sockets: Record<string, SubclassPlugRecord[][]>;
};

const SOCKET_NAMES = ["ABILITIES", "SUPER", "ASPECTS", "FRAGMENTS"];

const cmd: CommandDefinition = {
  description: "List subclass of the current character",
  options: [
    sessionIdOption,
    verboseOption,
    {
      flags: ["a", "show-all"],
      description: "Show all subclasses",
      defaultValue: false
    }
  ],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:subclass:list");

    const { session: sessionId, verbose, showAll } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");

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

    const [equipmentItemsErr, equipmentItems] = await fnWithSpinner(
      "Retrieving equipment items ...",
      () =>
        destiny2InventoryService.getEquipmentItems(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId
        )
    );
    if (equipmentItemsErr) {
      return logger.loggedError(`Unable to retrieve equipment items: ${equipmentItemsErr.message}`);
    }

    const [inventoryItemsErr, inventoryItems] = await fnWithSpinner(
      "Retrieving inventory items ...",
      () =>
        destiny2InventoryService.getInventoryItems(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId
        )
    );
    if (inventoryItemsErr) {
      return logger.loggedError(`Unable to retrieve inventory items: ${inventoryItemsErr.message}`);
    }

    const subclassRecords: SubclassRecord[] = [];

    const equippedSubclasses = getSubclassItems(equipmentItems);
    const unequippedSubclasses = getSubclassItems(inventoryItems);
    const allSubclasses = [...equippedSubclasses, ...unequippedSubclasses];
    const equippedSubclassHashes = equippedSubclasses.map((subclass) => subclass.itemHash);

    const subclassNameByItemHash: Record<number, string> = {};

    for (let subClassIndex = 0; subClassIndex < allSubclasses.length; subClassIndex++) {
      const subclass = allSubclasses[subClassIndex];
      const subClassIsEquipped = equippedSubclassHashes.includes(subclass.itemHash);

      if (!subClassIsEquipped && !showAll) {
        continue;
      }

      const subclassDefinition = itemDefinitions[subclass.itemHash];
      const subclassName = subclassDefinition ? subclassDefinition.displayProperties.name : "N/A";

      const subclassRecord: SubclassRecord = {
        name: subclassName,
        itemHash: subclass.itemHash,
        itemInstanceId: subclass.itemInstanceId,
        isEquipped: subClassIsEquipped,
        sockets: {}
      };

      subclassNameByItemHash[subclass.itemHash] = subclassName;

      const [equippedPlugHashesErr, equippedPlugHashes] = await fnWithSpinner(
        `Retrieving ${subclassName} equipped plug hashes ...`,
        () =>
          destiny2ItemService.getItemEquippedPlugHashes(
            sessionId,
            characterInfo.membershipType,
            characterInfo.membershipId,
            subclass.itemInstanceId
          )
      );
      if (equippedPlugHashesErr) {
        return logger.loggedError(
          `Unable to retrieve ${subclassName} equipped plug hashes: ${equippedPlugHashesErr.message}`
        );
      }

      for (let socketNameIndex = 0; socketNameIndex < SOCKET_NAMES.length; socketNameIndex++) {
        const socketName = SOCKET_NAMES[socketNameIndex] as SocketName;

        const [socketIndicesErr, socketIndices] = await fnWithSpinner(
          `Fetching ${subclassName} ${socketName.toLocaleLowerCase()} socket indices ...`,
          () =>
            destiny2PlugService.getSocketIndices(
              sessionId,
              characterInfo.membershipType,
              characterInfo.membershipId,
              characterInfo.characterId,
              subclass.itemHash,
              socketName
            )
        );
        if (socketIndicesErr) {
          return logger.loggedError(
            `Unable to fetch ${socketName.toLocaleLowerCase()} socket indices for ${subclassName}: ${
              socketIndicesErr.message
            }`
          );
        }

        const [plugItemHashesErr, plugItemHashes] = await fnWithSpinner(
          `Retrieving ${subclassName} available ${socketName.toLocaleLowerCase()} items ...`,
          () =>
            destiny2PlugService.getPlugItemHashes(
              sessionId,
              characterInfo.membershipType,
              characterInfo.membershipId,
              characterInfo.characterId,
              subclass.itemHash,
              socketName
            )
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
          const slotPlugRecords: SubclassPlugRecord[] = [];
          const slotPlugItemHashes = plugItemHashes[index];
          const equippedPlugItemHash = equippedPlugHashes[socketIndices[index]] || -1;

          for (let plugItemIndex = 0; plugItemIndex < slotPlugItemHashes.length; plugItemIndex++) {
            const plugItemHash = slotPlugItemHashes[plugItemIndex];
            const plugItemDefinition = itemDefinitions[plugItemHash];

            const plugRecord: SubclassPlugRecord = {
              name: plugItemDefinition
                ? plugItemDefinition.displayProperties.name
                : `Plug: ${plugItemHash}`,
              itemHash: plugItemHash,
              isEquipped: equippedPlugItemHash === plugItemHash
            };

            slotPlugRecords.push(plugRecord);
          }

          subclassRecord.sockets[socketName].push(slotPlugRecords);
        }
      }

      subclassRecords.push(subclassRecord);
    }

    const tableData: string[][] = [];

    const basicHeaders = [
      "Subclass",
      "Super",
      "Ability",
      "Movement",
      "Melee",
      "Grenade",
      "Aspect",
      "Fragment"
    ];
    tableData.push(basicHeaders);

    subclassRecords.forEach((record) => {
      const subClassName = subclassNameByItemHash[record.itemHash];

      const subClassNameValue = [
        record.isEquipped ? `> ${subClassName}` : `  ${subClassName}`,
        ...(verbose ? [`  - ${record.itemHash}`, `  - ${record.itemInstanceId}`] : [])
      ].join("\n");

      const superValue = record.sockets["SUPER"]
        .map((records) =>
          records
            .map((record) =>
              [
                record.isEquipped ? `> ${record.name}` : `  ${record.name}`,
                ...(verbose ? [`  - ${record.itemHash}`] : [])
              ].join("\n")
            )
            .join("\n")
        )
        .join("\n");

      const classAbilityValue = record.sockets["ABILITIES"][0]
        .map((record) =>
          [
            record.isEquipped ? `> ${record.name}` : `  ${record.name}`,
            ...(verbose ? [`  - ${record.itemHash}`] : [])
          ].join("\n")
        )
        .join("\n");

      const movementAbilityValue = record.sockets["ABILITIES"][1]
        .map((record) =>
          [
            record.isEquipped ? `> ${record.name}` : `  ${record.name}`,
            ...(verbose ? [`  - ${record.itemHash}`] : [])
          ].join("\n")
        )
        .join("\n");

      const meleeAbilityValue = record.sockets["ABILITIES"][2]
        .map((record) =>
          [
            record.isEquipped ? `> ${record.name}` : `  ${record.name}`,
            ...(verbose ? [`  - ${record.itemHash}`] : [])
          ].join("\n")
        )
        .join("\n");

      const grenadeAbilityValue = record.sockets["ABILITIES"][3]
        .map((record) =>
          [
            record.isEquipped ? `> ${record.name}` : `  ${record.name}`,
            ...(verbose ? [`  - ${record.itemHash}`] : [])
          ].join("\n")
        )
        .join("\n");

      const equippedAspectHashes = record.sockets["ASPECTS"].map(
        (records) => records.find((record) => record.isEquipped)?.itemHash || null
      );

      const aspectsValue = record.sockets["ASPECTS"][0]
        .map((record) =>
          [
            equippedAspectHashes.includes(record.itemHash)
              ? `> ${record.name}`
              : `  ${record.name}`,
            ...(verbose ? [`  - ${record.itemHash}`] : [])
          ].join("\n")
        )
        .join("\n");

      const equippedFragmentHashes = record.sockets["FRAGMENTS"].map(
        (records) => records.find((record) => record.isEquipped)?.itemHash || null
      );

      const fragmentsValue = record.sockets["FRAGMENTS"][0]
        .map((record) =>
          [
            equippedFragmentHashes.includes(record.itemHash)
              ? `> ${record.name}`
              : `  ${record.name}`,
            ...(verbose ? [`  - ${record.itemHash}`] : [])
          ].join("\n")
        )
        .join("\n");

      const subclassColumns = [
        subClassNameValue,
        superValue,
        classAbilityValue,
        movementAbilityValue,
        meleeAbilityValue,
        grenadeAbilityValue,
        aspectsValue,
        fragmentsValue
      ];

      tableData.push(subclassColumns);
    });

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
