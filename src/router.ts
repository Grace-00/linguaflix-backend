import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getRandomSentenceFromSubtitle } from "./utils.js";
import { sendEmailAsync } from "./mailjet.js";
import { __filename, __dirname } from "./helpers.js";
import { SHOW_FILE_PATH } from "./types.js";
import { translateText } from "./translateSentence.js";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

router.get("/health", (req: Request, res: Response) => {
  res.status(200).send("Server is running");
});

router.post("/submit-data", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
      nativeLanguage: z.string(),
      targetLanguage: z.string(),
      proficiencyLevel: z.string(),
      favoriteShow: z.string(),
    });

    const {
      name,
      email,
      nativeLanguage,
      targetLanguage,
      proficiencyLevel,
      favoriteShow,
    } = schema.parse(req.body);

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

    const filePathKey = `${favoriteShow}-${targetLanguage
      .slice(0, 2)
      .toLowerCase()}`;
    const filePath = SHOW_FILE_PATH.get(filePathKey);
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

    // First, fetch the sentence and then translate concurrently
    const sentence = await getRandomSentenceFromSubtitle(
      filePath,
      proficiencyLevel
    );

    if (!sentence) {
      return res.status(404).json({ error: "Subtitle not found" });
    }

    // Run the database operations as a transaction
    await prisma.$transaction([
      prisma.favoriteShow.create({
        data: {
          userId: user.id,
          showName: favoriteShow,
        },
      }),
      prisma.sentence.create({
        data: {
          userId: user.id,
          content: sentence,
        },
      }),
    ]);

    const [
      translatedSentence,
      translatePersonalisedIntro,
      translateTranslationIntro,
    ] = await Promise.all([
      translateText(sentence, targetLanguage, nativeLanguage),
      translateText(
        "Here is your personalized sentence",
        targetLanguage,
        nativeLanguage
      ),
      translateText("Here is the translation", targetLanguage, nativeLanguage),
    ]);

    sendEmailAsync(
      email,
      "Your Learning Sentence",
      `${translatePersonalisedIntro}: ${sentence}. ${translateTranslationIntro}: ${translatedSentence}`
    );

    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to save data" });
  }
});

export default router;
