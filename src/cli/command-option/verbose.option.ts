import { CommandOptionDefinition } from "../d2cli.types";

export const verboseOption: CommandOptionDefinition = {
  flags: ["v", "verbose"],
  description: "Show additional information",
  defaultValue: false
};
