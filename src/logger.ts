import * as os from "os";
import { createLogger, format } from "winston";
import { Syslog } from "winston-syslog";

const papertrail = new Syslog({
  host: process.env.PAPERTRAIL_HOST,
  port: process.env.PAPERTRAIL_PORT
    ? parseInt(process.env.PAPERTRAIL_PORT, 10)
    : undefined,
  localhost: os.hostname(),
  eol: "\n",
});

const logger = createLogger({
  format: format.simple(),
  level: "info",
  transports: [papertrail],
});

logger.info("hello papertrail");

export default logger;
