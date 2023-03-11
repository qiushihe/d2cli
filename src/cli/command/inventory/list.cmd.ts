import { getSelectedCharacterInfo } from "~src/cli/command-helper/current-character.helper";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { CharacterInventoryBuckets } from "~src/service/destiny2-inventory/destiny2-inventory.types";
import { Destiny2ItemService } from "~src/service/destiny2-item/destiny2-item.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyItemInstanceComponent } from "~type/bungie-api/destiny/entities/items.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

import { sessionIdOption } from "../../command-option/session-id.option";
import { SessionIdCommandOptions } from "../../command-option/session-id.option";
import { verboseOption } from "../../command-option/verbose.option";
import { VerboseCommandOptions } from "../../command-option/verbose.option";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions & { allItems: boolean };

const CharacterInventoryBucketLabels: Record<CharacterInventoryBuckets, string> = {
  [CharacterInventoryBuckets.KineticWeapon]: "Kinetic Weapon",
  [CharacterInventoryBuckets.EnergyWeapon]: "Energy Weapon",
  [CharacterInventoryBuckets.PowerWeapon]: "Power Weapon",
  [CharacterInventoryBuckets.Ghost]: "Ghost",
  [CharacterInventoryBuckets.Vehicle]: "Vehicle",
  [CharacterInventoryBuckets.Ship]: "Ship",
  [CharacterInventoryBuckets.Helmet]: "Helmet",
  [CharacterInventoryBuckets.Gauntlet]: "Gauntlet",
  [CharacterInventoryBuckets.ChestArmour]: "Chest Armour",
  [CharacterInventoryBuckets.LegArmour]: "Leg Armour",
  [CharacterInventoryBuckets.ClassItem]: "Class Item"
};

const CharacterInventoryBucketOrder = [
  CharacterInventoryBuckets.KineticWeapon,
  CharacterInventoryBuckets.EnergyWeapon,
  CharacterInventoryBuckets.PowerWeapon,
  CharacterInventoryBuckets.Helmet,
  CharacterInventoryBuckets.Gauntlet,
  CharacterInventoryBuckets.ChestArmour,
  CharacterInventoryBuckets.LegArmour,
  CharacterInventoryBuckets.ClassItem,
  CharacterInventoryBuckets.Ghost,
  CharacterInventoryBuckets.Vehicle,
  CharacterInventoryBuckets.Ship
];

const getItemInfo = (
  itemDefinition: DestinyInventoryItemDefinition | null,
  itemInstance: DestinyItemInstanceComponent | null
): { label: string; powerLevel: string } => {
  if (itemDefinition) {
    if (itemInstance && itemInstance.primaryStat) {
      return {
        label: itemDefinition.displayProperties.name || "UNKNOWN",
        powerLevel: `${itemInstance.primaryStat.value || "N/A"}`
      };
    } else {
      return { label: itemDefinition.displayProperties.name || "UNKNOWN", powerLevel: "N/A" };
    }
  } else {
    return { label: "UNKNOWN", powerLevel: "N/A" };
  }
};

const cmd: CommandDefinition = {
  description: "List items in character inventory",
  options: [
    sessionIdOption,
    verboseOption,
    {
      flags: ["a", "all-items"],
      description: "Show un-equipped items in addition to equipped items"
    }
  ],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:inventory:list");

    const { session: sessionId, verbose, allItems: showAllItems } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2ItemService =
      AppModule.getDefaultInstance().resolve<Destiny2ItemService>("Destiny2ItemService");

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to character info: ${characterInfoErr.message}`);
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

    const destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");

    const [equipmentItemsErr, equipmentItems] = await fnWithSpinner(
      "Retrieving equipment items ...",
      () =>
        destiny2InventoryService.getEquipmentItemsBySlot(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId
        )
    );
    if (equipmentItemsErr) {
      return logger.loggedError(`Unable to retrieve equipment items: ${equipmentItemsErr.message}`);
    }

    let inventoryItems: Record<CharacterInventoryBuckets, DestinyItemComponent[]> =
      destiny2InventoryService.getEmptySlots();
    if (showAllItems) {
      const [inventoryItemsErr, _inventoryItems] = await fnWithSpinner(
        "Retrieving inventory items ...",
        () =>
          destiny2InventoryService.getInventoryItemsBySlot(
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
      inventoryItems = _inventoryItems;
    }

    const itemInstanceById: Record<string, DestinyItemInstanceComponent> = {};
    const itemInstanceErrorById: Record<string, Error> = {};

    if (verbose) {
      const itemInstanceIds = [
        ...Object.values(equipmentItems).flat(),
        ...Object.values(inventoryItems).flat()
      ].map((item) => item.itemInstanceId);
      for (
        let itemInstanceIdIndex = 0;
        itemInstanceIdIndex < itemInstanceIds.length;
        itemInstanceIdIndex++
      ) {
        const itemInstanceId = itemInstanceIds[itemInstanceIdIndex];

        const [itemInstanceErr, itemInstance] = await fnWithSpinner(
          `Fetching item instance ${itemInstanceIdIndex + 1} of ${itemInstanceIds.length} ...`,
          () =>
            destiny2ItemService.getItemInstance(
              sessionId,
              characterInfo.membershipType,
              characterInfo.membershipId,
              itemInstanceId
            )
        );
        if (itemInstanceErr) {
          itemInstanceErrorById[itemInstanceId] = itemInstanceErr;
        } else {
          itemInstanceById[itemInstanceId] = itemInstance;
        }
      }
    }

    const tableData: string[][] = [];

    if (verbose) {
      if (showAllItems) {
        tableData.push([
          "Slot",
          "Equipped",
          "Power Level",
          "Hash",
          "Instance ID",
          "Inventory",
          "Power Level",
          "Hash",
          "Instance ID"
        ]);
      } else {
        tableData.push(["Slot", "Equipped", "Power Level", "Hash", "Instance ID"]);
      }
    } else {
      if (showAllItems) {
        tableData.push([
          "Slot",
          "Equipped",
          "Hash",
          "Instance ID",
          "Inventory",
          "Hash",
          "Instance ID"
        ]);
      } else {
        tableData.push(["Slot", "Equipped", "Hash", "Instance ID"]);
      }
    }

    const buckets = Object.values(CharacterInventoryBuckets).sort(
      (a, b) => CharacterInventoryBucketOrder.indexOf(a) - CharacterInventoryBucketOrder.indexOf(b)
    );

    for (let bucketNameIndex = 0; bucketNameIndex < buckets.length; bucketNameIndex++) {
      const bucket = buckets[bucketNameIndex];
      const bucketLabel = CharacterInventoryBucketLabels[bucket];

      const equipmentBucketItems = equipmentItems[bucket];
      const inventoryBucketItems = inventoryItems[bucket];

      const equippedItem = equipmentBucketItems[0];
      const equippedItemInfo = getItemInfo(
        itemDefinitions[equippedItem.itemHash] || null,
        itemInstanceById[equippedItem.itemInstanceId] || null
      );

      const unEquippedItemLabels: string[] = [];
      const unEquippedItemHashes: string[] = [];
      const unEquippedItemInstanceIds: string[] = [];
      const unEquippedItemPowerLevels: string[] = [];
      if (showAllItems) {
        for (
          let unEquippedItemIndex = 0;
          unEquippedItemIndex < inventoryBucketItems.length;
          unEquippedItemIndex++
        ) {
          const unEquippedItem = inventoryBucketItems[unEquippedItemIndex];
          const unEquippedItemInfo = getItemInfo(
            itemDefinitions[unEquippedItem.itemHash] || null,
            itemInstanceById[unEquippedItem.itemInstanceId] || null
          );

          unEquippedItemLabels.push(unEquippedItemInfo.label);
          unEquippedItemHashes.push(`${unEquippedItem.itemHash}`);
          unEquippedItemInstanceIds.push(unEquippedItem.itemInstanceId);
          unEquippedItemPowerLevels.push(unEquippedItemInfo.powerLevel);
        }
      }

      if (verbose) {
        if (showAllItems) {
          tableData.push([
            bucketLabel,
            equippedItemInfo.label,
            equippedItemInfo.powerLevel.padStart(4, " "),
            `${equippedItem.itemHash}`,
            equippedItem.itemInstanceId,
            unEquippedItemLabels.join("\n"),
            unEquippedItemPowerLevels.map((lvl) => lvl.padStart(4, " ")).join("\n"),
            unEquippedItemHashes.join("\n"),
            unEquippedItemInstanceIds.join("\n")
          ]);
        } else {
          tableData.push([
            bucketLabel,
            equippedItemInfo.label,
            equippedItemInfo.powerLevel.padStart(4, " "),
            `${equippedItem.itemHash}`,
            equippedItem.itemInstanceId
          ]);
        }
      } else {
        if (showAllItems) {
          tableData.push([
            bucketLabel,
            equippedItemInfo.label,
            `${equippedItem.itemHash}`,
            equippedItem.itemInstanceId,
            unEquippedItemLabels.join("\n"),
            unEquippedItemHashes.join("\n"),
            unEquippedItemInstanceIds.join("\n")
          ]);
        } else {
          tableData.push([
            bucketLabel,
            equippedItemInfo.label,
            `${equippedItem.itemHash}`,
            equippedItem.itemInstanceId
          ]);
        }
      }
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
