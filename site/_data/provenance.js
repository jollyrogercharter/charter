import { readFileSync } from "node:fs";

export default () => JSON.parse(readFileSync("provenance/launch-manifest.json", "utf8"));
