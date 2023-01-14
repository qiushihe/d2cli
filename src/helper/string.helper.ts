import baseX from "base-x";

const BASE_42 = baseX("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdgl");
const BASE_62 = baseX("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");

export const base42EncodeString = (plainText: string): string => {
  return BASE_42.encode(new TextEncoder().encode(plainText));
};

export const base42DecodeString = (encodedText: string): string => {
  return new TextDecoder().decode(BASE_42.decode(encodedText));
};

export const base62EncodeString = (plainText: string): string => {
  return BASE_62.encode(new TextEncoder().encode(plainText));
};

export const base62DecodeString = (encodedText: string): string => {
  return new TextDecoder().decode(BASE_62.decode(encodedText));
};

export const removeCharacterAtIndex = (str: string, index: number) => {
  return str.slice(0, index) + str.slice(index + 1);
};

export const replaceRange = (str: string, start: number, end: number, replacement: string) => {
  return str.substring(0, start) + replacement + str.substring(end);
};
