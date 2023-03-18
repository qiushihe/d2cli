import { CommandOptionDefinition } from "../d2cli.types";

export type ItemIdentifierCommandOptions = {
  item: string;
};

export const itemIdentifierOption: CommandOptionDefinition = {
  flags: ["t", "item <identifier>"],
  description: [
    "Identifier of the item;",
    'Valid forms are: "[Item Hash]", ":[Item Instance Id]" or "[Item Hash]:[Item Instance Id]";',
    "Certain commands may require both, while other commands may function without one or another."
  ].join(" "),
  defaultValue: ""
};

export type ItemInstanceIdsCommandOptions = {
  itemInstanceIds: string;
};

export const itemInstanceIdsOption: CommandOptionDefinition = {
  flags: ["i", "item-instance-ids <instance-ids>"],
  description: 'Instance IDs of items (use "," to separate multiple values)',
  defaultValue: ""
};
