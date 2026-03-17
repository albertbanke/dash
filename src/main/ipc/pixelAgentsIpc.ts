import { ipcMain } from 'electron';
import { PixelAgentsService } from '../services/PixelAgentsService';
import type { PixelAgentsConfig } from '../services/PixelAgentsService';

export function registerPixelAgentsIpc(): void {
  ipcMain.handle('pixelAgents:start', async (_event, config: PixelAgentsConfig) => {
    try {
      await PixelAgentsService.start(config);
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('pixelAgents:stop', () => {
    try {
      PixelAgentsService.stop();
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('pixelAgents:getStatus', () => {
    try {
      return { success: true, data: PixelAgentsService.getStatus() };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('pixelAgents:readConfig', () => {
    try {
      return { success: true, data: PixelAgentsService.readEnvFile() };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
