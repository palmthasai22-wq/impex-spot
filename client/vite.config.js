import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://impex-spot-api-production.up.railway.app',
changeOrigin: true,
secure: false,
},
'/uploads': {
target: 'https://impex-spot-api-production.up.railway.app',
changeOrigin: true,
secure: false,
},
'/socket.io': {
target: 'https://impex-spot-api-production.up.railway.app',
ws: true,
changeOrigin: true,
secure: false,
}
}
}
});