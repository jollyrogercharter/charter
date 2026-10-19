export const CHALLENGE_STEPS = [
  { id: "discover", title: "Find the source, rights and build specifications", how: "Starting from the public repository only, locate the licence, dependency inventory and build instructions. Note anything you had to ask for." },
  { id: "clean-build", title: "Build and test on a clean machine", how: "Fresh clone, fresh environment (container, VM or new user). Record the OS, runtime versions and the exact commands, plus their exit codes." },
  { id: "agent-workflow", title: "Reconstruct the development workflow", how: "Using the published specs, decisions and agent instructions, make a small change with any AI agent or none. Note missing context." },
  { id: "alternate-deploy", title: "Deploy to a different host", how: "Deploy to infrastructure the original team doesn't control. Record every assumption the docs didn't state." },
  { id: "costs", title: "Calculate what it costs to run", how: "From public records alone, estimate the operating cost. Keep billed, estimated, donated and user-attention costs separate. Unknown is a valid answer." },
  { id: "data-export", title: "Export and migrate a test user's data", how: "With dummy data only, export and import into another instance or compatible app. Mark not-applicable if the project holds no user data, and say why." },
  { id: "improve", title: "Propose a measurable improvement", how: "Open a PR that removes a blocker or reduces cost, with before-and-after numbers." },
  { id: "restore", title: "Restore from backup; explain releases and security response", how: "Restore a backup, or record that no procedure exists. Find the release, patch and vulnerability-reporting process." },
  { id: "founder-absence", title: "Continue without the founder", how: "List everything that still needs a specific person, such as accounts, keys, merge rights or decisions. These are the real findings." },
];

export function challengeMarkdown({ project = "PROJECT NAME", repository = "REPOSITORY URL", date = new Date().toISOString().slice(0, 10) } = {}) {
  const out = [
    `# Jolly Roger Challenge log: ${project}`,
    "",
    "> Could your software survive without you? Incomplete attempts are valid reports: what failed is the useful part.",
    "",
    `- **Project:** ${project}`,
    `- **Repository and exact commit:** ${repository} @ COMMIT`,
    `- **Attempted by:** NAME OR HANDLE (no email). Affiliated with the project? yes / no`,
    `- **Date started:** ${date}`,
    `- **Environment:** OS, CPU architecture, runtime versions`,
    "",
    "Status for each step: `not-attempted` · `passed` · `failed` · `blocked` · `not-applicable`.",
    "",
  ];
  CHALLENGE_STEPS.forEach((s, i) => {
    out.push(
      `## ${i + 1}. ${s.title}`,
      "",
      `*${s.how}*`,
      "",
      "- **Status:** not-attempted",
      "- **Commands run (with exit codes):**",
      "  ```",
      "  ",
      "  ```",
      "- **What worked:**",
      "- **Blockers or undocumented assumptions:**",
      "- **Evidence links (sanitized; no secrets or personal data):**",
      "",
    );
  });
  out.push(
    "## Summary",
    "",
    "- Steps passed: _ / 9 (excluding not-applicable)",
    "- Things that still need the original creator:",
    "- PRs or issues filed:",
    "",
    "File this log as an issue using the project's reproduction-challenge template, or attach it to your own repository.",
    "",
  );
  return out.join("\n");
}
