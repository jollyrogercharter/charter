export const TOOL = { name: "jrc", version: "0.1.0" };
export const SPEC_VERSION = "0.1";
export const SCHEMA_URL = "https://jollyrogercharter.org/spec/jrc-0.1.schema.json";

export const PILLARS = [
  { key: "code_rights", title: "Code and rights", asks: "Can anyone legally copy, modify, sell and fork the original work? Are licences and dependencies documented?" },
  { key: "development", title: "Reproducible development", asks: "Can a stranger rebuild it from public specs, decisions, agent/tool records, lockfiles, tests and build instructions?" },
  { key: "data", title: "User data and AT Protocol", asks: "Can people export, migrate and control their records? Mark not-applicable, with a reason, if the project holds no user data." },
  { key: "operations", title: "Operations and resiliency", asks: "Can someone else deploy, back up, restore, roll back and run it without secret steps?" },
  { key: "economics", title: "Economics and human attention", asks: "Are operating costs public, dated and sourced, with billed, estimated, donated and user-attention costs kept separate?" },
  { key: "governance", title: "Governance and stewardship", asks: "Can independent contributors propose changes, see decisions, and continue the work without the founder?" },
];
export const PILLAR_KEYS = PILLARS.map((p) => p.key);

export const STATUSES = ["not-started", "exploring", "partial", "evidenced", "not-applicable"];
export const ASSESSMENT_KINDS = ["self", "independent"];
export const VERIFICATION_LEVELS = ["self-reported", "independently-reproduced"];
export const EVIDENCE_KINDS = ["file", "url", "command"];

export const DISCLAIMER =
  "JRCv1 is a draft conformance standard, not a licence or a certification. This report checks the structure of the manifest and the local evidence it points to. It cannot confirm that statements are true, that URLs say what is claimed, or that a reviewer is independent. Claims are self-reported unless a named reviewer is recorded, and even then this tool has not verified the review.";
