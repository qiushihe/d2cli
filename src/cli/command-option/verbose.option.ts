import { CommandOptionDefinition } from "../d2qdb.types";

export const verboseOption: CommandOptionDefinition = {
  flags: ["v", "verbose"],
  description: "Show additional information",
  defaultValue: false
};
