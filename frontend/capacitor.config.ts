import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stanzamalaga.erp',
  appName: 'Stanza Malaga',
  webDir: 'dist',
  server: {
    // Apunta al servidor de desarrollo de Vite en tu PC
    url: 'http://10.0.2.2:30001',
    cleartext: true,
    allowNavigation: ['100.109.99.110', '192.168.0.107', '10.0.2.2', 'localhost']
  }
};

export default config;