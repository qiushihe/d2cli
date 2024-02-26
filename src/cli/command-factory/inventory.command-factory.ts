import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { makeTable2 } from "~src/helper/table.helper";
import { CacheService } from "~src/service/cache/cache.service";
import { CharacterService } from "~src/service/character/character.service";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";

import { dataGetter } from "./inventory/data-getter";
import {
  sortTableByColumns,
  transformFrameColumn,
  transformSlotColumn,
  transformTierColumn
} from "./inventory/display";
import { itemsExcluder } from "./inventory/items-excluder";
import { itemsIncluder } from "./inventory/items-includer";
import { lightLevelTagger } from "./inventory/light-level-tagger";
import { slotTagger } from "./inventory/slot-tagger";
import { InventoryItem } from "./inventory/type";
import { weaponTagger } from "./inventory/weapon-tagger";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

type InventoryCommandOptions = {
  description: string;
  includeSlots?: string[] | null;
};

const itemsProcessor =
  (processors: ((items: InventoryItem[]) => InventoryItem[])[]) =>
  (inventoryItems: InventoryItem[]) => {
    let processedItems: InventoryItem[] = inventoryItems;
    for (const processItems of processors) {
      processedItems = processItems(processedItems);
    }
    return processedItems;
  };

export const inventoryCommand = (options: InventoryCommandOptions): CommandDefinition => {
  return {
    description: options.description,
    options: [sessionIdOption, verboseOption],
    action: async (_, opts, { app, logger }) => {
      const { session: sessionId, verbose } = opts as CmdOptions;
      logger.debug(`Session ID: ${sessionId}`);

      const getInventoryData = dataGetter(
        logger,
        app.resolve(ManifestDefinitionService),
        app.resolve(CacheService),
        app.resolve(CharacterService),
        app.resolve(CharacterDescriptionService),
        app.resolve(InventoryService)
      );

      const tagInventoryItemsSlot = slotTagger(logger);
      const excludeInventoryItems = itemsExcluder(["Emotes", "Subclass", "Unlabeled"]);
      const includeInventoryItems = itemsIncluder(options.includeSlots);
      const tagInventoryItemsLightLevel = lightLevelTagger([
        "Kinetic",
        "Energy",
        "Power",
        "Helmet",
        "Glove",
        "Chest",
        "Leg",
        "Class"
      ]);
      const tagInventoryItemsWeapon = weaponTagger(["Kinetic", "Energy", "Power"]);

      const [inventoryDataErr, inventoryData] = await getInventoryData(sessionId);
      if (inventoryDataErr) {
        return inventoryDataErr;
      }

      const {
        inventoryItems,
        itemInstances,
        itemDefinitions,
        intrinsicItemDefinitions,
        damageTypeDefinitions
      } = inventoryData;

      const processItems = itemsProcessor([
        (items) => tagInventoryItemsSlot(items, itemDefinitions),
        (items) => excludeInventoryItems(items),
        (items) => includeInventoryItems(items),
        (items) => tagInventoryItemsLightLevel(items, itemInstances),
        (items) =>
          tagInventoryItemsWeapon(
            items,
            itemDefinitions,
            intrinsicItemDefinitions,
            damageTypeDefinitions
          )
      ]);

      const processedInventoryItems = processItems(inventoryItems);

      const tableColumns = [
        "Slot",
        "Tier",
        "Weapon",
        "Frame",
        "Damage",
        "#",
        "Name",
        "Light",
        ...(verbose ? ["ID"] : [])
      ];

      const displayRows = processedInventoryItems.map((inventoryItem) => {
        const fields = [
          { name: "ID", value: `${inventoryItem.itemHash}:${inventoryItem.itemInstanceId}` }
        ];

        const displayTags = inventoryItem.tags.filter((tag) => {
          return tableColumns.find((column) => tag.startsWith(`${column}:`));
        });

        displayTags.forEach((displayTag) => {
          const tagParts = displayTag.split(":", 2);
          fields.push({ name: tagParts[0], value: tagParts[1] });
        });

        return fields;
      });

      const tableData: string[][] = [];

      tableData.push(tableColumns);

      const tableRows: string[][] = [];
      for (const displayRow of displayRows) {
        const tableRow: string[] = [];
        for (const tableColumn of tableColumns) {
          const displayColumn = displayRow.find(({ name }) => name === tableColumn);
          if (displayColumn) {
            tableRow.push(displayColumn.value);
          } else {
            tableRow.push("@@NO@DATA@@");
          }
        }
        tableRows.push(tableRow);
      }

      const emptyColumns = [];
      for (const columnIndex in tableColumns) {
        let isEmpty = true;
        for (const rowIndex in tableRows) {
          if (tableRows[rowIndex][columnIndex] !== "@@NO@DATA@@") {
            isEmpty = false;
          }
        }
        if (isEmpty) {
          emptyColumns.push(columnIndex);
        }
      }

      tableData.push(
        ...sortTableByColumns(tableColumns, tableRows, {
          ["Slot"]: transformSlotColumn,
          ["Tier"]: transformTierColumn,
          ["Frame"]: transformFrameColumn
        })
      );

      const cleanedUpTableData: string[][] = [];
      for (const rowIndex in tableData) {
        const columns = tableData[rowIndex];
        const cleanedUpColumns: string[] = [];

        for (const columnIndex in columns) {
          const column = tableData[rowIndex][columnIndex];

          if (!emptyColumns.includes(columnIndex)) {
            if (column === "@@NO@DATA@@") {
              cleanedUpColumns.push("");
            } else {
              cleanedUpColumns.push(column);
            }
          }
        }
        cleanedUpTableData.push(cleanedUpColumns);
      }

      logger.log(makeTable2(cleanedUpTableData));
    }
  };
};
