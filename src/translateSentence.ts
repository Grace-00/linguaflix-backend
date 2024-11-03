import * as deepl from "deepl-node";
import "dotenv/config";
const TRANSLATE_API_KEY = process.env.TRANSLATE_API_KEY;

const sourceLangMap: { [key: string]: deepl.SourceLanguageCode } = {
  arabic: "ar",
  bulgarian: "bg",
  chinese: "zh",
  czech: "cs",
  danish: "da",
  dutch: "nl",
  english: "en",
  estonian: "et",
  finnish: "fi",
  french: "fr",
  german: "de",
  greek: "el",
  hungarian: "hu",
  indonesian: "id",
  italian: "it",
  japanese: "ja",
  korean: "ko",
  latvian: "lv",
  lithuanian: "lt",
  norwegian: "nb",
  polish: "pl",
  portuguese: "pt",
  romanian: "ro",
  russian: "ru",
  slovak: "sk",
  slovenian: "sl",
  spanish: "es",
  swedish: "sv",
  turkish: "tr",
  ukrainian: "uk",
  // keep in alphabetical order
};

export const targetLangMap: { [key: string]: deepl.TargetLanguageCode } = {
  arabic: "ar",
  bulgarian: "bg",
  "brazilian portuguese": "pt-BR",
  "british english": "en-GB",
  chinese: "zh",
  czech: "cs",
  danish: "da",
  dutch: "nl",
  english: "en-US",
  estonian: "et",
  finnish: "fi",
  french: "fr",
  german: "de",
  greek: "el",
  hungarian: "hu",
  indonesian: "id",
  italian: "it",
  japanese: "ja",
  korean: "ko",
  latvian: "lv",
  lithuanian: "lt",
  norwegian: "nb",
  polish: "pl",
  portuguese: "pt-PT",
  romanian: "ro",
  russian: "ru",
  slovak: "sk",
  slovenian: "sl",
  spanish: "es",
  swedish: "sv",
  turkish: "tr",
  ukrainian: "uk",
  // keep in alphabetical order
};

export const translateText = async (
  text: string,
  userSourceLang: string,
  userTargetLang: string
) => {
  try {
    if (!TRANSLATE_API_KEY) {
      throw new Error("Missing api key environment variable");
    }
    const translator = new deepl.Translator(TRANSLATE_API_KEY);
    const targetLang = targetLangMap[userTargetLang.toLowerCase().trim()];
    const sourceLang = sourceLangMap[userSourceLang.toLowerCase().trim()];

    if (!targetLang || !sourceLang) {
      throw new Error("Invalid lang detected");
    }

    const result = await translator.translateText(text, sourceLang, targetLang);
    return result.text;
  } catch (error) {
    console.error(error);
  }
};
