import path from "path";
import { fileURLToPath } from "url";
import { targetLangMap } from "./translateSentence.js";

// Helper to get the directory name in ES module context
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const subtitlesFolder = path.join(__dirname, "../subtitles");

// Helper to resolve the absolute path
export const getFilePath = (relativePath: string): string => {
  return path.resolve(__dirname, relativePath);
};

export const shuffleArray = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
};
