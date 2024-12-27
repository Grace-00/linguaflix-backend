import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getSentence } from "./utils.js";
import { sendEmail } from "./mailjet.js";
import { __filename, __dirname } from "./helpers.js";
import { SHOW_FILE_PATH } from "./types.js";
import { translateText } from "./translateSentence.js";

const prisma = new PrismaClient();
const router = Router();

router.get("/", (req: Request, res: Response) => {
  res
    .status(404)
    .json({ message: "heeelllooooo server! This API has not been found." });
});

router.post("/submit-data", async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      nativeLanguage,
      targetLanguage,
      proficiencyLevel,
      favoriteShow,
    } = req.body;
    const filePathKey = `${favoriteShow}-${targetLanguage
      .slice(0, 2)
      .toLowerCase()}`;
    const filePath = SHOW_FILE_PATH.get(filePathKey);

    // Log the incoming data
    console.log("Received data:", {
      name,
      email,
      nativeLanguage,
      targetLanguage,
      proficiencyLevel,
      favoriteShow,
    });

    if (
      !name ||
      !email ||
      !nativeLanguage ||
      !targetLanguage ||
      !proficiencyLevel ||
      !favoriteShow
    ) {
      return res.status(400).json({ error: "Data is required" });
    }

    // Check if the file path exists before proceeding
    if (!filePath) {
      return res.status(404).json({
        error:
          "Favorite show cannot be created because there's no found subtitle associated with it",
      });
    }

    // Check for existing user by email
    let user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        nativeLanguage,
        targetLanguage,
        proficiencyLevel,
        favoriteShow,
      },
      create: {
        name,
        email,
        nativeLanguage,
        targetLanguage,
        proficiencyLevel,
        favoriteShow,
      },
    });

    // Create a new favorite show entry linked to the user
    await prisma.favoriteShow.create({
      data: {
        userId: user.id,
        showName: favoriteShow,
      },
    });

    // Check if there are available subtitles for the selected target language
    if (!targetLanguage.slice(0, 2).toLowerCase()) {
      return res.status(404).json({
        error: `no found subtitle for the selected language: ${targetLanguage}`,
      });
    }

    // Fetch subtitle based on favoriteShow TODO: implement different target language
    const sentence = await getSentence(filePath, proficiencyLevel);

    if (!sentence) {
      return res.status(404).json({ error: "Subtitle not found" });
    }

    await prisma.sentence.create({
      data: {
        userId: user.id,
        content: sentence,
      },
    });

    console.log("Fetched subtitle:", sentence);

    const translatedSentence = await translateText(
      sentence,
      targetLanguage,
      nativeLanguage
    );

    const translatePersonalisedIntro = await translateText(
      "Here is your personalized sentence",
      targetLanguage,
      nativeLanguage
    );

    const translateTranslationIntro = await translateText(
      "Here is the translation",
      targetLanguage,
      nativeLanguage
    );

    // Send email
    await sendEmail(
      email,
      "Your Learning Sentence",
      `${translatePersonalisedIntro}: ${sentence}. ${translateTranslationIntro}: ${translatedSentence}`
    );

    console.log("Email sent to:", email);

    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to save data" });
  }
});

export default router;
