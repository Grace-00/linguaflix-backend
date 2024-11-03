import merge from "lodash.merge";
import local from "./local.js";
import prod from "./prod.js";

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const stage = process.env.STAGE || "local";
let envConfig;

if (stage === "production") {
  envConfig = prod;
} else {
  envConfig = local;
}

const defaultConfig = {
  stage,
  dbUrl: process.env.DATABASE_URL,
  port: process.env.PORT,
  logging: false,
};

export default merge(defaultConfig, envConfig);
