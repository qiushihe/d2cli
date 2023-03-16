import { CommandOptionDefinition } from "../../d2cli.types";

export type ItemCommandOptions = {
  itemId: string;
};

export const itemOption: CommandOptionDefinition = {
  flags: ["i", "item-id <id>"],
  description: [
    'Either the item hash itself, or both item hash and item instance ID in the format of "[hash]:[instance ID]";',
    "Specifying instance ID will show currently equipped mods"
  ].join(" "),
  defaultValue: ""
};
