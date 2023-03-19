import { CommandOptionDefinition } from "../d2cli.types";

export type LoadoutNameCommandOptions = {
  loadoutName: string;
};

export const loadoutNameOption: CommandOptionDefinition = {
  flags: ["loadout-name <str>"],
  description: "Name of the loadout to store in the export",
  defaultValue: ""
};

export type IncludeUnequippedCommandOptions = {
  includeUnequipped: string;
};

export const includeUnequippedOption: CommandOptionDefinition = {
  flags: ["include-unequipped"],
  description: "Include unequipped items in the export",
  defaultValue: ""
};
