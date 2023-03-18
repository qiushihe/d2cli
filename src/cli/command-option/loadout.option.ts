import { CommandOptionDefinition } from "../d2cli.types";

export type LoadoutNameCommandOptions = {
  loadoutName: string;
};

export const loadoutNameOption: CommandOptionDefinition = {
  flags: ["loadout-name <str>"],
  description: "Name of the loadout to store in the snapshot",
  defaultValue: ""
};
