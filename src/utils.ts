import * as fs from "fs";
import nlp from "compromise";
import SrtParser from "srt-parser-2";
import { getFilePath, shuffleArray } from "./helpers.js";

// Helper function to read the SRT file
const readSrtFile = async (filePath: string): Promise<string> => {
  const absoluteFilePath = getFilePath(filePath);
  return fs.promises.readFile(absoluteFilePath, "utf8");
};

// Helper function to parse the SRT content
const parseSrtData = (fileContent: string): Array<{ text: string }> => {
  const parser = new SrtParser();
  return parser.fromSrt(fileContent);
};

// Helper function to clean subtitle text
const cleanSubtitleText = (srtData: Array<{ text: string }>): string => {
  const subtitleText = srtData.map((entry) => entry.text);
  return cleanSubtitle(subtitleText);
};

const cleanSubtitle = (subtitleLines: string[]): string => {
  // Step 1: Remove sound effects in square brackets, HTML tags, and unwanted phrases
  let cleanedSubtitles = subtitleLines.map((line) => {
    return line
      .replace(/\[.*?\]/g, "") // Remove [anything] (like sound effects or character names)
      .replace(/<.*?>/g, "") // Remove <anything> (like HTML tags)
      .replace(/^- /g, "") // Remove hyphens that indicate dialogue breaks
      .trim(); // Trim leading/trailing spaces
  });

  // Step 2: Remove lines containing unwanted phrases like "Synced and corrected by", "for www.addic7ed.com", and "Previously on"
  cleanedSubtitles = cleanedSubtitles.filter((line) => {
    return (
      !line.toLowerCase().includes("synced and corrected by") &&
      !line.toLowerCase().includes("for www.addic7ed.com") &&
      !/^previously on/i.test(line) && // Remove lines starting with "Previously on"
      line.trim() !== ""
    ); // Remove empty lines
  });

  // Step 3: Merge lines where the next line doesn’t start with a capital letter
  const mergedSubtitles: string[] = [];
  cleanedSubtitles.forEach((line, index) => {
    if (index > 0 && /^[a-z]/.test(line)) {
      // If the current line starts with a lowercase letter, append it to the previous one
      mergedSubtitles[mergedSubtitles.length - 1] += ` ${line.trim()}`;
    } else {
      mergedSubtitles.push(line.trim());
    }
  });

  // Step 4: Join all cleaned and merged lines into a single paragraph
  return mergedSubtitles.join(" ").replace(/\s+/g, " "); // Replace multiple spaces with a single space
};

// Helper function to extract sentences from cleaned text
const extractSentences = (cleanedText: string): string[] => {
  const doc = nlp(cleanedText);
  return doc.sentences().out("array");
};

// Function to determine if a sentence is simple enough for a beginner level
const isBeginnerLevelSentence = (sentence: string): boolean => {
  const maxLength = 8; // Max words for a beginner sentence
  const maxComplexWords = 2; // Max complex words allowed

  // Use Compromise to tokenize and analyze the sentence
  const doc = nlp(sentence);
  const words = doc.terms().out("array");

  // Check sentence length
  if (words.length > maxLength) return false;

  // Check for complex words
  const complexWordCount = words.filter(
    (word: string) => word.length > 6
  ).length;
  if (complexWordCount > maxComplexWords) return false;

  // Check for nouns, verbs, and complements (adjectives or adverbs)
  const nouns = doc.nouns().out("array");
  const verbs = doc.verbs().out("array");
  const complements = doc
    .adjectives()
    .out("array")
    .concat(doc.adverbs().out("array"));

  return nouns.length > 0 && verbs.length > 0 && complements.length > 0;
};

const isIntermediateLevelSentence = (sentence: string): boolean => {
  const minLength = 9; // Minimum words for an intermediate sentence
  const maxLength = 15; // Maximum words for an intermediate sentence
  const maxComplexWords = 4; // Maximum complex words allowed

  // Use Compromise to analyze the sentence
  const doc = nlp(sentence);
  const words = doc.terms().out("array");

  // Check sentence length
  if (words.length < minLength || words.length > maxLength) return false;

  // Check for complex words
  const complexWordCount = words.filter(
    (word: string) => word.length > 6
  ).length;
  if (complexWordCount > maxComplexWords) return false;

  // Extract nouns, verbs, complements (adjectives or adverbs), and conjunctions
  const nouns = doc.nouns().out("array");
  const verbs = doc.verbs().out("array");
  const complements = doc
    .adjectives()
    .out("array")
    .concat(doc.adverbs().out("array"));
  const conjunctions = doc.conjunctions().out("array");

  // Check for the required POS for an intermediate-level sentence
  const POSValueForIntermediateLevel =
    nouns.length >= 0 ||
    verbs.length >= 0 ||
    complements.length >= 0 ||
    conjunctions.length >= 0;

  return POSValueForIntermediateLevel;
};

// Helper function to filter beginner-level sentences
const filterBeginnerSentences = (sentences: string[]): string[] => {
  return sentences.filter(isBeginnerLevelSentence);
};

// Helper function to filter intermediate-level sentences
const filterIntermediateSentences = (sentences: string[]): string[] => {
  return sentences.filter((sentence) => isIntermediateLevelSentence(sentence));
};

// Main function to extract a sentence
export const getSentence = async (
  filePath: string,
  proficiencyLevel: string
): Promise<string | null> => {
  const fileContent = await readSrtFile(filePath);
  const srtData = parseSrtData(fileContent);
  const cleanedSubtitleText = cleanSubtitleText(srtData);
  const sentences = extractSentences(cleanedSubtitleText);

  let filteredSentences: string[] = [];
  switch (proficiencyLevel) {
    case "beginner":
      filteredSentences = filterBeginnerSentences(sentences);
      break;
    case "intermediate":
      filteredSentences = filterIntermediateSentences(sentences);
      break;
  }

  const shuffledArrayOfSentences = shuffleArray(filteredSentences);
  //return a random sentence from the the shuffled array of sentences
  const randomIndex = Math.floor(
    Math.random() * shuffledArrayOfSentences.length
  );

  return shuffledArrayOfSentences.length > 0
    ? shuffledArrayOfSentences[randomIndex]
    : null;
};
