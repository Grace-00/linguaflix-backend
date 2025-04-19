import * as fs from "fs";
import nlp from "compromise";
import { getFilePath } from "./helpers.js";
import readline from "readline";
import { AnalyzedSentence, ProficiencyLevel, Threshold } from "./types.js";
import cache from "./cache.js";

const parseSrtFileStream = async (filePath: string): Promise<string[]> => {
  const absoluteFilePath = getFilePath(filePath);
  const fileStream = fs.createReadStream(absoluteFilePath, {
    encoding: "utf8",
  });

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity, // Handles \r\n and \n line endings
  });

  const subtitleLines: string[] = [];
  const annotationsRegex = /\[.*?\]|<.*?>|^- /g;
  const unwantedLinesRegex =
    /synced and corrected by|for www.addic7ed.com|^previously on/i;

  for await (const line of rl) {
    const cleaned = line.replace(annotationsRegex, "").trim();
    if (!unwantedLinesRegex.test(cleaned) && cleaned !== "") {
      subtitleLines.push(cleaned);
    }
  }

  return subtitleLines;
};

const cleanSubtitle = (subtitleLines: string[]): string => {
  const mergedSubtitles = subtitleLines.reduce<string[]>((acc, line) => {
    const cleaned = line
      .replace(/^\d+\s*$/g, "") // Remove standalone numbers (e.g., "1", "2")
      .replace(/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/g, "") // Remove timestamps
      .replace(/♪.*?♪|♪.*$/g, "") // Remove lines or parts starting/ending with ♪ TODO: remove music on multiline
      .replace(/\[.*?\]|<.*?>|^- /g, "") // Remove annotations and tags
      .trim();

    if (
      !cleaned.toLowerCase().includes("synced and corrected by") &&
      !cleaned.toLowerCase().includes("for www.addic7ed.com") &&
      !/^previously on/i.test(cleaned) &&
      cleaned !== ""
    ) {
      // Merge lines starting with lowercase
      if (acc.length && /^[a-z]/.test(cleaned)) {
        acc[acc.length - 1] += ` ${cleaned}`;
      } else {
        acc.push(cleaned);
      }
    }
    return acc;
  }, []); // Initialize as an empty array of strings

  return mergedSubtitles.join(" ").replace(/\s+/g, " ");
};

const analyzeSentenceAsync = (sentence: string): AnalyzedSentence => {
  const doc = nlp(sentence);
  return {
    terms: doc.terms().out("array"),
    nouns: doc.nouns().out("array"),
    verbs: doc.verbs().out("array"),
    complements: doc
      .adjectives()
      .out("array")
      .concat(doc.adverbs().out("array")),
    conjunctions: doc.conjunctions().out("array"),
  };
};

const filterSentencesAsync = async (
  sentences: string[],
  proficiencyLevel: string
): Promise<string | null> => {
  const thresholdsConfig: Record<ProficiencyLevel, Threshold> = {
    beginner: { maxLength: 8, maxComplexWords: 2 },
    intermediate: { minLength: 9, maxLength: 15, maxComplexWords: 4 },
  };

  const thresholds: Threshold =
    thresholdsConfig[proficiencyLevel as ProficiencyLevel];

  const preFilteredSentences = sentences.filter((sentence) => {
    const words = sentence.split(" ");
    return (
      words.length >= (thresholds.minLength || 0) &&
      words.length <= thresholds.maxLength
    );
  });

  const results = await Promise.all(
    preFilteredSentences.map(async (sentence) => {
      const result = await analyzeSentenceAsync(sentence);
      const { terms, nouns, verbs } = result;
      const complexWordCount = terms.filter(
        (word: string) => word.length > 6
      ).length;
      const isValid =
        terms.length >= (thresholds.minLength || 0) &&
        terms.length <= thresholds.maxLength &&
        complexWordCount <= thresholds.maxComplexWords &&
        nouns.length > 0 &&
        verbs.length > 0;
      return isValid ? sentence : null;
    })
  );

  const filteredSentences = results.filter(Boolean); // Remove null values

  if (filteredSentences.length > 0) {
    const randomIndex = Math.floor(Math.random() * filteredSentences.length);
    return filteredSentences[randomIndex];
  }

  return null;
};

export const getRandomSentenceFromSubtitle = async (
  filePath: string,
  proficiencyLevel: string
): Promise<{ sentence: string | null; fromCache: boolean }> => {
  const cacheKey = `subtitle:${filePath}`;

  // Step 1: Check if the processed sentences are already cached
  let sentences = cache.get<string[]>(cacheKey);
  let fromCache = true;

  if (!sentences) {
    // Step 2: Process the subtitle file if not cached
    const fileContent = await parseSrtFileStream(filePath);
    const cleanedSubtitle = cleanSubtitle(fileContent);
    sentences = cleanedSubtitle.split(
      /(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)/
    );

    // Step 3: Cache the processed sentences
    cache.set(cacheKey, sentences);
    fromCache = false;
  }

  // Step 4: Filter sentences based on proficiency level
  const sentence = await filterSentencesAsync(sentences, proficiencyLevel);

  return { sentence, fromCache };
};
