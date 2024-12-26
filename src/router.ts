import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { filterSubtitle, getSentence } from "./utils.js";
import { sendEmail } from "./mailjet.js";
import fs from "fs/promises";
import { __filename, __dirname, subtitlesFolder } from "./helpers.js";
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

    // Check for existing user by email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    let user;

    //TODO: improve if else
    if (existingUser) {
      // If the user exists, update their information if needed
      user = await prisma.user.update({
        where: { email },
        data: {
          name,
          nativeLanguage,
          targetLanguage,
          proficiencyLevel,
          // favoriteShow is not updated directly here so that one user can have multiple
          // favorite tv shows
        },
      });

      // Don't store favoriteShow if there is no subtitle available for existing user
      if (!filePath) {
        return res.status(404).json({
          error:
            "Favorite show not created for existing user because there's no found file path associated to it",
        });
      } else {
        // Create a new favorite show entry linked to the existing user
        await prisma.favoriteShow.create({
          data: {
            userId: user.id,
            showName: favoriteShow,
          },
        });
      }
    } else {
      // Don't store favoriteShow if there is no subtitle available for new user
      if (!filePath) {
        return res.status(404).json({
          error:
            "Favorite show not created for the new user because there's no found file path associated to it",
        });
      } else {
        // If the user does not exist, create a new user
        user = await prisma.user.create({
          data: {
            name,
            email,
            nativeLanguage,
            targetLanguage,
            proficiencyLevel,
            favoriteShow,
          },
        });
        // Create a new favorite show entry for the new user
        await prisma.favoriteShow.create({
          data: {
            userId: user.id,
            showName: favoriteShow,
          },
        });
      }
    }

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
