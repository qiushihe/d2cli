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
  craftedValue,
  frameSortValue,
  slotSortValue,
  sortTableByColumns,
  tierSortValue,
  transformDataColumn,
  transformHeaderColumn
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
  hideStaticColumns: (column: string) => boolean;
  slots: string[] | null;
  filter: (items: InventoryItem[]) => InventoryItem[];
  group: (items: InventoryItem[]) => InventoryItem[][];
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
      const includeInventoryItems = itemsIncluder(options.slots);
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

      const tableData: string[][] = [];

      const tableColumns = [
        "Slot",
        "Tier",
        "Weapon",
        "Frame",
        "Damage",
        "Crafted",
        "Name",
        "Light",
        ...(verbose ? ["ID"] : [])
      ];

      const tableDisplayColumns = tableColumns
        .map(transformHeaderColumn)
        .map((val) => val.toLocaleUpperCase());

      tableData.push(tableDisplayColumns);

      const rowsGroups: string[][][] = [];

      const displayItemsGroups = options.group(options.filter(processItems(inventoryItems)));

      for (const displayItems of displayItemsGroups) {
        const displayRows = displayItems.map((inventoryItem) => {
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
        rowsGroups.push(tableRows);
      }

      const hideColumnIndices: number[] = [];
      for (let columnIndex = 0; columnIndex < tableColumns.length; columnIndex++) {
        let isEmpty = true;
        let isStatic = true;

        let lastColumnValue: string | null = null;
        for (const tableRows of rowsGroups) {
          for (const rowIndex in tableRows) {
            if (tableRows[rowIndex][columnIndex] !== "@@NO@DATA@@") {
              isEmpty = false;
            }

            if (lastColumnValue === null) {
              lastColumnValue = tableRows[rowIndex][columnIndex];
            } else if (lastColumnValue !== tableRows[rowIndex][columnIndex]) {
              isStatic = false;
            }
          }
        }

        // Hide empty columns
        if (isEmpty) {
          hideColumnIndices.push(columnIndex);
        }

        // Hide static columns
        if (isStatic && options.hideStaticColumns(tableColumns[columnIndex])) {
          hideColumnIndices.push(columnIndex);
        }
      }

      for (let groupIndex = 0; groupIndex < rowsGroups.length; groupIndex++) {
        const tableRows = rowsGroups[groupIndex];

        tableData.push(
          ...transformDataColumn(
            tableColumns,
            sortTableByColumns(tableColumns, tableRows, {
              ["Slot"]: slotSortValue,
              ["Tier"]: tierSortValue,
              ["Frame"]: frameSortValue
            }),
            { ["Crafted"]: craftedValue }
          )
        );

        if (groupIndex < rowsGroups.length - 1) {
          tableData.push(tableDisplayColumns.map(() => ""));
          tableData.push(tableDisplayColumns);
        }
      }

      const cleanedUpTableData: string[][] = [];
      for (const rowIndex in tableData) {
        const columns = tableData[rowIndex];
        const cleanedUpColumns: string[] = [];

        for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
          const column = tableData[rowIndex][columnIndex];

          if (!hideColumnIndices.includes(columnIndex)) {
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
