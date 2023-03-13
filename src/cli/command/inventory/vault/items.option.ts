import { CommandOptionDefinition } from "../../../d2cli.types";

export type ItemsCommandOptions = {
  itemInstanceIds: string;
};

export const itemsOption: CommandOptionDefinition = {
  flags: ["i", "item-instance-ids <ids>"],
  description: 'Instance IDs of items (use "," to separate multiple values)',
  defaultValue: ""
};
