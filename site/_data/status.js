import { readFileSync } from "node:fs";

export default () => JSON.parse(readFileSync("launch/status.json", "utf8"));
