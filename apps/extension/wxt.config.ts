import { defineConfig } from 'wxt';

export default defineConfig({
  // Use port 3001 to avoid colliding with the Next.js web app on port 3000
  dev: {
    server: { port: 3001 },
  },
  manifest: {
    name: 'IsThatSlop',
    version: '0.1.0',
    description: 'Alerts you to AI-flagged content sources',
    permissions: ['alarms', 'storage', 'unlimitedStorage', 'activeTab', 'tabs'],
    host_permissions: ['https://isthatslop.com/*', 'http://localhost:3000/*', '<all_urls>'],
    icons: {
      16: '/icons/icon-neutral-16.png',
      32: '/icons/icon-neutral-32.png',
      48: '/icons/icon-neutral-48.png',
    },
    action: {
      default_icon: {
        16: '/icons/icon-neutral-16.png',
        32: '/icons/icon-neutral-32.png',
        48: '/icons/icon-neutral-48.png',
      },
    },
  },
});
