type ShowFilePathMap = Map<string, string>;

export const SHOW_FILE_PATH: ShowFilePathMap = new Map([
  ["Station 19-en", "../subtitles/station-19-s07e01-en.srt"],
  ["Station 19-it", "../subtitles/station-19-s01e01-it.srt"],
  ["9-1-1-en", "../subtitles/9-1-1-s08e01-en.srt"],
]);

export type ProficiencyLevel = "beginner" | "intermediate";

export type Threshold = {
  maxLength: number;
  maxComplexWords: number;
  minLength?: number;
};

export type AnalyzedSentence = {
  terms: string[];
  nouns: string[];
  verbs: string[];
  complements: string[];
  conjunctions: string[];
};
