import { Router, Request, Response } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { getRandomSentenceFromSubtitle } from "./utils.js";
import { sendEmailAsync } from "./mailjet.js";
import { SHOW_FILE_PATH } from "./types.js";
import { translateText } from "./translateSentence.js";
import { z } from "zod";
import logger from "./logger.js";

const prisma = new PrismaClient();
const router = Router();

const shouldLog = process.env.ENABLE_LOGGING === "true"; // Check if logging is enabled

// Configure CORS
const corsOptions = {
  origin: "https://linguaflix-frontend.vercel.app",
  optionsSuccessStatus: 200,
};

router.use(cors(corsOptions));

// Logging middleware
router.use((req, res, next) => {
  if (shouldLog) {
    logger.info(`Incoming request: ${req.method} ${req.url}`);
  }
  next();
});

router.get("/health", (req: Request, res: Response) => {
  res.status(200).send("Server is running");
});

router.post("/submit-data", async (req: Request, res: Response) => {
  const startTime = Date.now();
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

    if (shouldLog)
      logger.info(
        `Received data: ${JSON.stringify({
          name,
          email,
          nativeLanguage,
          targetLanguage,
          proficiencyLevel,
          favoriteShow,
        })}`
      );

    const validationTime = Date.now();
    if (shouldLog)
      logger.info(`Validation took ${validationTime - startTime}ms`);

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

    const filePathCheckTime = Date.now();
    if (shouldLog)
      logger.info(
        `File path check took ${filePathCheckTime - validationTime}ms`
      );

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

    const userUpsertTime = Date.now();
    if (shouldLog)
      logger.info(`User upsert took ${userUpsertTime - filePathCheckTime}ms`);

    const sentence = await getRandomSentenceFromSubtitle(
      filePath,
      proficiencyLevel
    );
    if (!sentence) {
      return res.status(404).json({ error: "Subtitle not found" });
    }

    const sentenceFetchTime = Date.now();
    if (shouldLog)
      logger.info(
        `Sentence fetch took ${sentenceFetchTime - userUpsertTime}ms`
      );

    await prisma.$transaction([
      prisma.favoriteShow.create({
        data: { userId: user.id, showName: favoriteShow },
      }),
      prisma.sentence.create({ data: { userId: user.id, content: sentence } }),
    ]);

    const transactionTime = Date.now();
    if (shouldLog)
      logger.info(`Transaction took ${transactionTime - sentenceFetchTime}ms`);

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

    const translationTime = Date.now();
    if (shouldLog)
      logger.info(`Translation took ${translationTime - transactionTime}ms`);

    sendEmailAsync(
      email,
      "Your Learning Sentence",
      `${translatePersonalisedIntro}: ${sentence}. ${translateTranslationIntro}: ${translatedSentence}`
    );

    const emailTime = Date.now();
    if (shouldLog)
      logger.info(`Email sending took ${emailTime - translationTime}ms`);

    res.status(201).json(user);
  } catch (error) {
    if (shouldLog) logger.error(`Error creating user: ${error}`);
    res.status(500).json({ error: "Failed to save data" });
  } finally {
    const endTime = Date.now();
    if (shouldLog)
      logger.info(`Total request processing time: ${endTime - startTime}ms`);
  }
});

export default router;
