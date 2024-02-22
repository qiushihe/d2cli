import {
  SessionIdCommandOptions,
  sessionIdOption,
  VerboseCommandOptions,
  verboseOption
} from "~src/cli/command-option/cli.option";
import { CommandDefinition, CommandOptionDefinition } from "~src/cli/d2cli.types";
import { getItemNameAndPowerLevel, ItemNameAndPowerLevel } from "~src/helper/item.helper";
import { makeTable2 } from "~src/helper/table.helper";
import { CacheService } from "~src/service/cache/cache.service";
import { CharacterService } from "~src/service/character/character.service";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";

import {
  getDataSource,
  sortTableByColumns,
  transformFrameColumn,
  transformSlotColumn,
  transformTierColumn
} from "./all-weapons.data";

export type ExcludeExoticCommandOptions = {
  excludeExotic: boolean;
};

export const excludeExoticOption: CommandOptionDefinition = {
  flags: ["ee", "exclude-exotic"],
  description: "Exclude exotic weapons from the report",
  defaultValue: false
};

export type DamageBeforeFrameCommandOptions = {
  damageBeforeFrame: boolean;
};

export const damageBeforeFrameOption: CommandOptionDefinition = {
  flags: ["df", "damage-before-frame"],
  description: "Show weapon damage before frame",
  defaultValue: false
};

type CmdOptions = SessionIdCommandOptions &
  VerboseCommandOptions &
  ExcludeExoticCommandOptions &
  DamageBeforeFrameCommandOptions;

const findTagPrefixedValue = (tags: string[], prefix: string) =>
  tags.find((tag) => tag.split(":", 2)[0] === prefix)?.split(":", 2)[1] || "N/A";

const cmd: CommandDefinition = {
  description: "Report of all weapons across all characters and in vault",
  options: [sessionIdOption, verboseOption, excludeExoticOption, damageBeforeFrameOption],
  action: async (_, opts, { app, logger }) => {
    const { session: sessionId, verbose, excludeExotic, damageBeforeFrame } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const dataSource = getDataSource(
      logger,
      app.resolve(ManifestDefinitionService),
      app.resolve(CacheService),
      app.resolve(CharacterService),
      app.resolve(CharacterDescriptionService),
      app.resolve(InventoryService)
    );

    const [reportDataErr, reportData] = await dataSource.getReportData(sessionId);
    if (reportDataErr) {
      return reportDataErr;
    }

    const { reportItems, allItemInstances, allItemDefinitions } = reportData;

    const tableData: string[][] = [];

    tableData.push([
      ...(excludeExotic ? [] : ["Tier"]),
      "Slot",
      "Type",
      ...(damageBeforeFrame ? ["Damage", "Frame"] : ["Frame", "Damage"]),
      "Item",
      "Light",
      ...(verbose ? ["ID"] : [])
    ]);

    const tableRows: string[][] = [];
    for (const reportItem of reportItems) {
      const itemDefinition =
        allItemDefinitions[`${reportItem.itemHash}:${reportItem.itemInstanceId}`];

      const itemInfo: ItemNameAndPowerLevel = getItemNameAndPowerLevel(
        itemDefinition || null,
        allItemInstances[reportItem.itemInstanceId] || null
      );

      const tierValue = findTagPrefixedValue(reportItem.tags, "Tier");
      if (excludeExotic && tierValue === "Exotic") {
        continue;
      }

      tableRows.push([
        ...(excludeExotic ? [] : [tierValue]),
        findTagPrefixedValue(reportItem.tags, "Slot"),
        findTagPrefixedValue(reportItem.tags, "Type"),
        ...(damageBeforeFrame
          ? [
              findTagPrefixedValue(reportItem.tags, "Damage"),
              findTagPrefixedValue(reportItem.tags, "Frame")
            ]
          : [
              findTagPrefixedValue(reportItem.tags, "Frame"),
              findTagPrefixedValue(reportItem.tags, "Damage")
            ]),
        itemInfo.label,
        itemInfo.powerLevel,
        ...(verbose ? [`${reportItem.itemHash}:${reportItem.itemInstanceId}`] : [])
      ]);
    }

    tableData.push(
      ...sortTableByColumns(
        tableRows,
        excludeExotic
          ? { 0: transformSlotColumn, [damageBeforeFrame ? 3 : 2]: transformFrameColumn }
          : {
              0: transformTierColumn,
              1: transformSlotColumn,
              [damageBeforeFrame ? 4 : 3]: transformFrameColumn
            }
      )
    );
    logger.log(makeTable2(tableData));
  }
};

export default cmd;
