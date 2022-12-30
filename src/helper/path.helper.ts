import path from "path";
import { fileURLToPath } from "url";

export const getRepoRootPath = (): string => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // This path resolution is done within the `build` directory, which contains the `src` directory.
  // So this path has to go one level higher than normal.
  return path.join(__dirname, "../../..");
};
