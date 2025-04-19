import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getRandomSentenceFromSubtitle } from "./utils.js";
import { sendEmailAsync } from "./mailjet.js";
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

    console.log(
      `Received data: ${JSON.stringify({
        name,
        email,
        nativeLanguage,
        targetLanguage,
        proficiencyLevel,
        favoriteShow,
      })}`
    );

    const filePathKey = `${favoriteShow}-${targetLanguage
      .slice(0, 2)
      .toLowerCase()}`;
    const filePath = SHOW_FILE_PATH.get(filePathKey);
    if (!filePath) {
      return res.status(404).json({
        error:
          "Favorite show cannot be created because there's no found subtitle associated with it",
      });
    }

    const user = await prisma.user.upsert({
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

    const { sentence, fromCache } = await getRandomSentenceFromSubtitle(
      filePath,
      proficiencyLevel
    );
    if (!sentence) {
      return res.status(404).json({ error: "Subtitle not found" });
    }

    console.log(
      `Subtitle sentences retrieved for ${filePath}. Source: ${
        fromCache ? "Cache" : "Freshly Processed"
      }`
    );

    await prisma.$transaction([
      prisma.favoriteShow.create({
        data: { userId: user.id, showName: favoriteShow },
      }),
      prisma.sentence.create({ data: { userId: user.id, content: sentence } }),
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
    res.status(500).json({ error: "Failed to save data" });
  }
});

export default router;
