import { CommandOptionDefinition } from "../d2cli.types";

export type ItemIdCommandOptions = {
  itemId: string;
};

export const itemIdOption: CommandOptionDefinition = {
  flags: ["i", "item-id <id>"],
  description:
    'Either the item hash itself, or both item hash and item instance ID in the format of "[hash]:[instance ID]";',
  defaultValue: ""
};

export type ItemInstanceIdsCommandOptions = {
  itemInstanceIds: string;
};

export const itemInstanceIdsOption: CommandOptionDefinition = {
  flags: ["i", "item-instance-ids <ids>"],
  description: 'Instance IDs of items (use "," to separate multiple values)',
  defaultValue: ""
};
