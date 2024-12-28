import path from "path";
import { fileURLToPath } from "url";

// Helper to get the directory name in ES module context
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const subtitlesFolder = path.join(__dirname, "../subtitles");

// Helper to resolve the absolute path
export const getFilePath = (relativePath: string): string => {
  return path.resolve(__dirname, relativePath);
};
