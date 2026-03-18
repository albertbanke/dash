/** Convert a git remote URL (SSH or HTTPS) to a GitHub issue URL */
export function githubIssueUrl(remote: string, num: number): string | null {
  const ssh = remote.match(/git@github\.com:(.+?)(?:\.git)?$/);
  if (ssh) return `https://github.com/${ssh[1]}/issues/${num}`;
  const https = remote.match(/https:\/\/github\.com\/(.+?)(?:\.git)?$/);
  if (https) return `https://github.com/${https[1]}/issues/${num}`;
  return null;
}

/** Parse ADO org URL, project name, and repo name from a git remote URL. Returns null for non-ADO remotes. */
export function parseAdoRemote(
  remote: string,
): { organizationUrl: string; project: string; repository?: string } | null {
  // https://dev.azure.com/{org}/{project}/_git/{repo}
  const https = remote.match(
    /^https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+?)(?:\.git)?$/,
  );
  if (https) {
    return {
      organizationUrl: `https://dev.azure.com/${https[1]}`,
      project: decodeURIComponent(https[2]),
      repository: decodeURIComponent(https[3]),
    };
  }
  // Fallback without /_git/ segment
  const httpsNoGit = remote.match(/^https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)/);
  if (httpsNoGit) {
    return {
      organizationUrl: `https://dev.azure.com/${httpsNoGit[1]}`,
      project: decodeURIComponent(httpsNoGit[2]),
    };
  }

  // git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
  const ssh = remote.match(/^git@ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (ssh) {
    return {
      organizationUrl: `https://dev.azure.com/${ssh[1]}`,
      project: decodeURIComponent(ssh[2]),
      repository: decodeURIComponent(ssh[3]),
    };
  }
  // Fallback without repo
  const sshNoRepo = remote.match(/^git@ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)/);
  if (sshNoRepo) {
    return {
      organizationUrl: `https://dev.azure.com/${sshNoRepo[1]}`,
      project: decodeURIComponent(sshNoRepo[2]),
    };
  }

  // https://{org}.visualstudio.com/{project}/_git/{repo}
  const vs = remote.match(
    /^https:\/\/([^.]+)\.visualstudio\.com\/([^/]+)\/_git\/([^/]+?)(?:\.git)?$/,
  );
  if (vs) {
    return {
      organizationUrl: `https://dev.azure.com/${vs[1]}`,
      project: decodeURIComponent(vs[2]),
      repository: decodeURIComponent(vs[3]),
    };
  }
  // Fallback without /_git/ segment
  const vsNoGit = remote.match(/^https:\/\/([^.]+)\.visualstudio\.com\/([^/]+)/);
  if (vsNoGit) {
    return {
      organizationUrl: `https://dev.azure.com/${vsNoGit[1]}`,
      project: decodeURIComponent(vsNoGit[2]),
    };
  }

  return null;
}

/** Check if a git remote URL points to an ADO repository */
export function isAdoRemote(remote: string | null): boolean {
  if (!remote) return false;
  return parseAdoRemote(remote) !== null;
}

/** Get the display URL for a linked item */
export function linkedItemUrl(
  item: { provider: string; id: number | string; url: string },
  remote: string | null,
): string | null {
  if (item.url) return item.url;
  if (item.provider === 'github' && remote) return githubIssueUrl(remote, item.id as number);
  return null;
}
