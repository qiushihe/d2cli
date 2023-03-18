import { CommandOptionDefinition } from "../d2cli.types";

export type SocketNumberCommandOptions = {
  socket: string;
};

export const socketNumberOption: CommandOptionDefinition = {
  flags: ["n", "socket <number>"],
  description: "The socket's number",
  defaultValue: ""
};

export type PlugHashCommandOptions = {
  plugHash: string;
};

export const plugIHashOption: CommandOptionDefinition = {
  flags: ["p", "plug-hash <identifier>"],
  description: "Item hash of the plug item",
  defaultValue: ""
};
