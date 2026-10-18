import { readFileSync } from "node:fs";

export default () => JSON.parse(readFileSync("launch/costs.json", "utf8"));
