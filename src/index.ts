import express, { Express } from "express";
import morgan from "morgan";
import cors from "cors";
import router from "./router.js";
import * as dotenv from "dotenv";
import config from "./config/index.js";
dotenv.config();
const app: Express = express();

app.use(cors()); //middleware to make sure that different ports can talk to each other
app.use(morgan("dev")); //middleware for logging on dev (ex. GET)
app.use(express.json()); //middleware that allows a client to send us json
app.use(express.urlencoded({ extended: true })); //middleware that allows query string to be encoded and decoded, to be in an object rather than strings
app.use("/api", router); //this is used to create modular routes

app.listen(config.port, () => {
  console.log(`[server]: Server is running at http://localhost:${config.port}`);
});
