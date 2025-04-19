import NodeCache from "node-cache";

// default TTL (time-to-live) of 24 hours (86400 seconds)
const cache = new NodeCache({ stdTTL: 86400, checkperiod: 120 });

export default cache;
