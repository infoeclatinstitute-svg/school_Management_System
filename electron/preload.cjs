// ============================================================================
// Global College — Desktop Workstation Preload Script
// Exposes secure desktop capabilities and platform flags to the renderer
// ============================================================================

const { contextBridge } = require('electron');

try {
  contextBridge.exposeInMainWorld('desktopAPI', {
    isDesktop: true,
    platform: process.platform,
    version: '1.0.0',
  });
  contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
  });
} catch {
  // Fallback if contextIsolation is not enabled
  if (typeof window !== 'undefined') {
    window.desktopAPI = { isDesktop: true, platform: process.platform, version: '1.0.0' };
    window.electronAPI = { isElectron: true };
  }
}
