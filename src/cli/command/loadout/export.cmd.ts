import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { loadoutNameOption } from "~src/cli/command-option/loadout.option";
import { LoadoutNameCommandOptions } from "~src/cli/command-option/loadout.option";
import { includeUnequippedOption } from "~src/cli/command-option/loadout.option";
import { IncludeUnequippedCommandOptions } from "~src/cli/command-option/loadout.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { getSubclassItems } from "~src/helper/inventory-bucket.helper";
import { groupInventoryItems } from "~src/helper/inventory-bucket.helper";
import { ArmourInventoryBucketHashes } from "~src/helper/inventory-bucket.helper";
import { LoadoutInventoryBuckets } from "~src/helper/loadout.helper";
import { serializeItem } from "~src/helper/loadout.helper";
import { serializeItemPlugs } from "~src/helper/loadout.helper";
import { SUBCLASS_SOCKET_NAMES } from "~src/helper/subclass.helper";
import { getLoadoutPlugRecords } from "~src/helper/subclass.helper";
import { LoadoutPlugRecord } from "~src/helper/subclass.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { Destiny2ItemService } from "~src/service/destiny2-item/destiny2-item.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2PlugService } from "~src/service/destiny2-plug/destiny2-plug.service";
import { LogService } from "~src/service/log/log.service";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

type CmdOptions = SessionIdCommandOptions &
  LoadoutNameCommandOptions &
  IncludeUnequippedCommandOptions;

const cmd: CommandDefinition = {
  description: "Export the currently equipped loadout",
  options: [sessionIdOption, loadoutNameOption, includeUnequippedOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:loadout:export");

    const { session: sessionId, loadoutName, includeUnequipped } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");

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

    const allItems: DestinyItemComponent[] = [];
    const extraItemHashes: number[] = [];

    if (includeUnequipped) {
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
        return logger.loggedError(
          `Unable to retrieve inventory items: ${inventoryItemsErr.message}`
        );
      }
      inventoryItems.forEach((item) => {
        allItems.push(item);
        extraItemHashes.push(item.itemHash);
      });
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
    equipmentItems.forEach((item) => allItems.push(item));

    const subclass = getSubclassItems(equipmentItems)[0];
    if (!subclass) {
      return logger.loggedError(`Unable to retrieve equipped subclass items`);
    }

    const [subclassPlugRecordsErr, subclassPlugRecords] = await getLoadoutPlugRecords(
      logger,
      itemDefinitions,
      destiny2ItemService,
      destiny2PlugService,
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

    const equipmentsByBucket = groupInventoryItems(allItems);
    const equipments = LoadoutInventoryBuckets.reduce(
      (acc, bucket) => [...acc, ...equipmentsByBucket[bucket]],
      [] as DestinyItemComponent[]
    );

    const equipmentsPlugRecords: Record<number, LoadoutPlugRecord[]> = {};

    for (let equipmentIndex = 0; equipmentIndex < equipments.length; equipmentIndex++) {
      const equipment = equipments[equipmentIndex];
      const equipmentDefinition = itemDefinitions[equipment.itemHash];

      if (ArmourInventoryBucketHashes.includes(equipment.bucketHash)) {
        const [equipmentPlugRecordsErr, equipmentPlugRecords] = await getLoadoutPlugRecords(
          logger,
          itemDefinitions,
          destiny2ItemService,
          destiny2PlugService,
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

        equipmentsPlugRecords[equipment.itemHash] = equipmentPlugRecords;
      }
    }

    const exportLines: string[] = [];

    exportLines.push(
      `LOADOUT // ${
        loadoutName ||
        `${
          itemDefinitions[subclass.itemHash]?.displayProperties.name || "UNKNOWN SUBCLASS"
        } Loadout`
      }`
    );

    exportLines.push(serializeItem(itemDefinitions, subclass, true));

    serializeItemPlugs(itemDefinitions, subclass, subclassPlugRecords).forEach((serialized) => {
      exportLines.push(serialized);
    });

    (
      [
        [equipments.filter((equipment) => !extraItemHashes.includes(equipment.itemHash)), true],
        [equipments.filter((equipment) => extraItemHashes.includes(equipment.itemHash)), false]
      ] as [DestinyItemComponent[], boolean][]
    ).forEach(([_equipments, equip]) => {
      _equipments.forEach((equipment) => {
        exportLines.push(serializeItem(itemDefinitions, equipment, equip));

        serializeItemPlugs(
          itemDefinitions,
          equipment,
          equipmentsPlugRecords[equipment.itemHash] || []
        ).forEach((serialized) => {
          exportLines.push(serialized);
        });
      });
    });

    console.log(exportLines.join("\n"));
  }
};

export default cmd;