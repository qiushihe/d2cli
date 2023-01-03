import { CommandOptionDefinition } from "../d2cli.types";

export type VerboseCommandOptions = {
  verbose: boolean;
};

export const verboseOption: CommandOptionDefinition = {
  flags: ["v", "verbose"],
  description: "Show additional information",
  defaultValue: false
};
