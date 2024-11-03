import * as dotenv from "dotenv";
import Mailjet from "node-mailjet";
dotenv.config();

const mailjet = new Mailjet.Client({
  apiKey: process.env.MAILJET_API_KEY,
  apiSecret: process.env.MAILJET_API_SECRET,
});

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    const request = mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_SENDER,
            Name: "Linguaflix",
          },
          To: [
            {
              Email: to,
              Name: "Recipient",
            },
          ],
          Subject: subject,
          TextPart: text,
        },
      ],
    });

    const response = await request;
    const sanitizedResponse = JSON.parse(JSON.stringify(response.body));
    console.log("Email sent:", sanitizedResponse);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
