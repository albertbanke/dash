import { ipcMain } from 'electron';
import { LinearService } from '../services/LinearService';
import { ConnectionConfigService } from '../services/ConnectionConfigService';

export function registerLinearIpc(): void {
  ipcMain.handle('linear:check-configured', async () => {
    try {
      return { success: true, data: ConnectionConfigService.isLinearConfigured() };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('linear:test-connection', async (_event, args: { apiKey: string }) => {
    try {
      const ok = await LinearService.testConnection(args.apiKey);
      return { success: true, data: ok };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle(
    'linear:save-config',
    async (_event, args: { apiKey: string; teamKey?: string }) => {
      try {
        ConnectionConfigService.saveLinearConfig(args.apiKey, args.teamKey);
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  );

  ipcMain.handle('linear:get-config', async () => {
    try {
      const config = ConnectionConfigService.getLinearConfig();
      return { success: true, data: config };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('linear:remove-config', async () => {
    try {
      ConnectionConfigService.removeLinearConfig();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('linear:search-issues', async (_event, args: { query: string }) => {
    try {
      const config = ConnectionConfigService.getLinearConfig();
      if (!config) return { success: false, error: 'Linear not configured' };
      const issues = await LinearService.searchIssues(config.apiKey, args.query, config.teamKey);
      return { success: true, data: issues };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('linear:get-issue', async (_event, args: { identifier: string }) => {
    try {
      const config = ConnectionConfigService.getLinearConfig();
      if (!config) return { success: false, error: 'Linear not configured' };
      const issue = await LinearService.getIssue(config.apiKey, args.identifier);
      return { success: true, data: issue };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle(
    'linear:post-branch-comment',
    async (_event, args: { identifier: string; branch: string }) => {
      try {
        const config = ConnectionConfigService.getLinearConfig();
        if (!config) return { success: false, error: 'Linear not configured' };
        await LinearService.postBranchComment(config.apiKey, args.identifier, args.branch);
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  );

  ipcMain.handle(
    'linear:create-attachment',
    async (_event, args: { identifier: string; branch: string; repoUrl: string }) => {
      try {
        const config = ConnectionConfigService.getLinearConfig();
        if (!config) return { success: false, error: 'Linear not configured' };
        await LinearService.createAttachment(
          config.apiKey,
          args.identifier,
          args.branch,
          args.repoUrl,
        );
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
  );

  ipcMain.handle('linear:get-pr-for-issue', async (_event, args: { identifier: string }) => {
    try {
      const config = ConnectionConfigService.getLinearConfig();
      if (!config) return { success: false, error: 'Linear not configured' };
      const pr = await LinearService.getPullRequestForBranch(config.apiKey, args.identifier);
      return { success: true, data: pr };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });
}
