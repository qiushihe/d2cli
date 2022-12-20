import baseX from "base-x";

const BASE_42 = baseX("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdgl");

export const base42EncodeString = (plainText: string): string => {
  const encoder = new TextEncoder();
  return BASE_42.encode(encoder.encode(plainText));
};

export const base42DecodeString = (encodedText: string): string => {
  const decoder = new TextDecoder();
  return decoder.decode(BASE_42.decode(encodedText));
};
