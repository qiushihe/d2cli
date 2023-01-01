import { CommandArgumentDefinition } from "~src/cli/d2qdb.types";

export const characterNumberArgument: CommandArgumentDefinition = {
  name: "character",
  description: [
    "Destiny 2 character number;",
    "This is the order the characters are displayed on the Destiny 2 character selection screen,",
    "with the first character being number 1"
  ].join(" "),
  isRequired: true
};
