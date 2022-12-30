const RESET = "\x1b[0m";
const BG_RED = "\x1b[41m";
const BG_GREEN = "\x1b[42m";
const BG_YELLOW = "\x1b[43m";
const BG_BLUE = "\x1b[44m";
const BG_GRAY = "\x1b[100m";

export const bgRed = (msg: string) => `${BG_RED}${msg}${RESET}`;
export const bgGreen = (msg: string) => `${BG_GREEN}${msg}${RESET}`;
export const bgYellow = (msg: string) => `${BG_YELLOW}${msg}${RESET}`;
export const bgBlue = (msg: string) => `${BG_BLUE}${msg}${RESET}`;
export const bgGray = (msg: string) => `${BG_GRAY}${msg}${RESET}`;
