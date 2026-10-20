// Where generated links point. Defaults are the original project; forks set REPO_URL/SITE_URL (Node) or the page's meta tags (browser).
export const site = { repoUrl: "https://github.com/jollyrogercharter/charter", siteUrl: "https://jollyrogercharter.org" };

export function configureSite({ repoUrl, siteUrl } = {}) {
  const ok = (u) => typeof u === "string" && /^https?:\/\/[^\s"'<>]+$/.test(u);
  if (ok(repoUrl)) site.repoUrl = repoUrl.replace(/\/$/, "");
  if (ok(siteUrl)) site.siteUrl = siteUrl.replace(/\/$/, "");
  return site;
}
