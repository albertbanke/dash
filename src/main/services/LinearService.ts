import type { PullRequestInfo } from '@shared/types';

const TIMEOUT_MS = 15_000;
const LINEAR_API = 'https://api.linear.app/graphql';

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  state: string;
  priority: number;
  assignee?: string;
  labels: string[];
  description?: string;
}

export class LinearService {
  private static async request(
    apiKey: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const resp = await fetch(LINEAR_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Linear API ${resp.status}: ${text.slice(0, 200)}`);
      }

      const json = (await resp.json()) as { data?: unknown; errors?: Array<{ message: string }> };
      if (json.errors?.length) {
        throw new Error(`Linear API: ${json.errors[0].message}`);
      }

      return json.data;
    } finally {
      clearTimeout(timeout);
    }
  }

  static async testConnection(apiKey: string): Promise<boolean> {
    try {
      await this.request(apiKey, '{ viewer { id } }');
      return true;
    } catch {
      return false;
    }
  }

  static async searchIssues(
    apiKey: string,
    query: string,
    teamKey?: string,
  ): Promise<LinearIssue[]> {
    const filter = teamKey ? `, filter: { team: { key: { eq: "${teamKey}" } } }` : '';
    const trimmed = query.trim();

    // Use issueSearch for text queries, issues list for empty queries
    if (trimmed) {
      const gql = `
        query($query: String!) {
          issueSearch(query: $query${filter}, first: 20) {
            nodes {
              id identifier title url description
              priority
              state { name }
              assignee { name }
              labels { nodes { name } }
            }
          }
        }
      `;
      const data = (await this.request(apiKey, gql, { query: trimmed })) as {
        issueSearch: { nodes: RawIssue[] };
      };
      return data.issueSearch.nodes.map(mapIssue);
    } else {
      const gql = `
        query {
          issues(${filter ? `filter: { team: { key: { eq: "${teamKey}" } } }, ` : ''}first: 20, orderBy: updatedAt) {
            nodes {
              id identifier title url description
              priority
              state { name }
              assignee { name }
              labels { nodes { name } }
            }
          }
        }
      `;
      const data = (await this.request(apiKey, gql)) as {
        issues: { nodes: RawIssue[] };
      };
      return data.issues.nodes.map(mapIssue);
    }
  }

  static async getIssue(apiKey: string, identifier: string): Promise<LinearIssue> {
    const gql = `
      query($id: String!) {
        issue(id: $id) {
          id identifier title url description
          priority
          state { name }
          assignee { name }
          labels { nodes { name } }
        }
      }
    `;
    const data = (await this.request(apiKey, gql, { id: identifier })) as {
      issue: RawIssue;
    };
    return mapIssue(data.issue);
  }

  static async postBranchComment(
    apiKey: string,
    identifier: string,
    branch: string,
  ): Promise<void> {
    // Resolve internal UUID from identifier
    const issue = await this.getIssue(apiKey, identifier);
    const gql = `
      mutation($issueId: String!, $body: String!) {
        commentCreate(input: { issueId: $issueId, body: $body }) {
          success
        }
      }
    `;
    const body = `A task branch has been created for this issue:\n\n\`\`\`\n${branch}\n\`\`\``;
    await this.request(apiKey, gql, { issueId: issue.id, body });
  }

  static async createAttachment(
    apiKey: string,
    identifier: string,
    branch: string,
    repoUrl: string,
  ): Promise<void> {
    const issue = await this.getIssue(apiKey, identifier);
    const gql = `
      mutation($issueId: String!, $title: String!, $url: String!) {
        attachmentCreate(input: { issueId: $issueId, title: $title, url: $url }) {
          success
        }
      }
    `;
    const branchUrl = `${repoUrl.replace(/\.git$/, '')}/tree/${branch}`;
    await this.request(apiKey, gql, {
      issueId: issue.id,
      title: `Branch: ${branch}`,
      url: branchUrl,
    });
  }

  static async getPullRequestForBranch(
    apiKey: string,
    identifier: string,
  ): Promise<PullRequestInfo | null> {
    const issue = await this.getIssue(apiKey, identifier);
    const gql = `
      query($issueId: String!) {
        issue(id: $issueId) {
          attachments {
            nodes { title url }
          }
        }
      }
    `;
    const data = (await this.request(apiKey, gql, { issueId: issue.id })) as {
      issue: { attachments: { nodes: Array<{ title: string; url: string }> } };
    };

    // Find first attachment that looks like a PR URL
    const prAttachment = data.issue.attachments.nodes.find(
      (a) => /\/pull\/\d+/.test(a.url) || /\/pullrequest\/\d+/.test(a.url),
    );
    if (!prAttachment) return null;

    const prMatch =
      prAttachment.url.match(/\/pull\/(\d+)/) || prAttachment.url.match(/\/pullrequest\/(\d+)/);
    return {
      number: prMatch ? parseInt(prMatch[1], 10) : 0,
      title: prAttachment.title,
      url: prAttachment.url,
      provider: 'linear',
    };
  }
}

interface RawIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  description?: string;
  priority: number;
  state: { name: string };
  assignee?: { name: string };
  labels: { nodes: Array<{ name: string }> };
}

function mapIssue(raw: RawIssue): LinearIssue {
  return {
    id: raw.id,
    identifier: raw.identifier,
    title: raw.title,
    url: raw.url,
    description: raw.description,
    priority: raw.priority,
    state: raw.state?.name ?? '',
    assignee: raw.assignee?.name,
    labels: raw.labels?.nodes?.map((l) => l.name) ?? [],
  };
}
