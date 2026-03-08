import type { AzureDevOpsConfig, AzureDevOpsWorkItem } from '@shared/types';

const TIMEOUT_MS = 15_000;
const API_VERSION = '7.1';

export class AzureDevOpsService {
  private static authHeader(pat: string): string {
    return 'Basic ' + Buffer.from(':' + pat).toString('base64');
  }

  private static async request(
    config: AzureDevOpsConfig,
    path: string,
    options?: { method?: string; body?: unknown; contentType?: string },
  ): Promise<unknown> {
    const baseUrl = config.organizationUrl.replace(/\/+$/, '');
    const separator = path.includes('?') ? '&' : '?';
    const url = `${baseUrl}/${path}${separator}api-version=${API_VERSION}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const resp = await fetch(url, {
        method: options?.method ?? 'GET',
        headers: {
          Authorization: this.authHeader(config.pat),
          'Content-Type': options?.contentType ?? 'application/json',
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`ADO API ${resp.status}: ${text.slice(0, 200)}`);
      }

      return await resp.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  static async testConnection(config: AzureDevOpsConfig): Promise<boolean> {
    try {
      await this.request(config, `${config.project}/_apis/wit/queries`, { method: 'GET' });
      return true;
    } catch {
      return false;
    }
  }

  static async searchWorkItems(
    config: AzureDevOpsConfig,
    query: string,
  ): Promise<AzureDevOpsWorkItem[]> {
    const sanitized = query.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '');
    // Endpoint is project-scoped, so no need to filter by TeamProject
    const wiql = sanitized
      ? `SELECT [System.Id] FROM WorkItems WHERE [System.Title] CONTAINS '${sanitized}' ORDER BY [System.ChangedDate] DESC`
      : `SELECT [System.Id] FROM WorkItems WHERE [System.State] <> 'Closed' AND [System.State] <> 'Removed' ORDER BY [System.ChangedDate] DESC`;

    const wiqlResult = (await this.request(config, `${config.project}/_apis/wit/wiql`, {
      method: 'POST',
      body: { query: wiql },
    })) as { workItems?: { id: number }[] };

    const ids = wiqlResult.workItems?.map((w) => w.id).slice(0, 20) ?? [];
    if (ids.length === 0) return [];

    return this.getWorkItemsByIds(config, ids);
  }

  static async getWorkItem(config: AzureDevOpsConfig, id: number): Promise<AzureDevOpsWorkItem> {
    const result = (await this.request(
      config,
      `${config.project}/_apis/wit/workitems/${id}?$expand=none`,
    )) as { id: number; fields: Record<string, unknown>; _links: { html: { href: string } } };

    return this.mapWorkItem(result);
  }

  static async postBranchComment(
    config: AzureDevOpsConfig,
    workItemId: number,
    branch: string,
  ): Promise<void> {
    const comment = `A task branch has been created for this work item:\n\n<code>${branch}</code>`;

    await this.request(config, `${config.project}/_apis/wit/workitems/${workItemId}`, {
      method: 'PATCH',
      contentType: 'application/json-patch+json',
      body: [
        {
          op: 'add',
          path: '/fields/System.History',
          value: comment,
        },
      ],
    });
  }

  private static async getWorkItemsByIds(
    config: AzureDevOpsConfig,
    ids: number[],
  ): Promise<AzureDevOpsWorkItem[]> {
    const idsParam = ids.join(',');
    const fields =
      'System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo,System.Tags,System.Description';
    const result = (await this.request(
      config,
      `${config.project}/_apis/wit/workitems?ids=${idsParam}&fields=${fields}`,
    )) as {
      value: Array<{
        id: number;
        fields: Record<string, unknown>;
        _links: { html: { href: string } };
      }>;
    };

    return result.value.map((item) => this.mapWorkItem(item));
  }

  private static mapWorkItem(raw: {
    id: number;
    fields: Record<string, unknown>;
    _links: { html: { href: string } };
  }): AzureDevOpsWorkItem {
    const fields = raw.fields;
    const assignedTo = fields['System.AssignedTo'] as
      | { displayName?: string; uniqueName?: string }
      | undefined;
    const tags = fields['System.Tags'] as string | undefined;

    return {
      id: raw.id,
      title: (fields['System.Title'] as string) ?? '',
      state: (fields['System.State'] as string) ?? '',
      type: (fields['System.WorkItemType'] as string) ?? '',
      url: raw._links?.html?.href ?? '',
      assignedTo: assignedTo?.displayName ?? assignedTo?.uniqueName,
      tags: tags
        ? tags
            .split(';')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      description: fields['System.Description'] as string | undefined,
    };
  }
}
