import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Configuration Vite minimale pour Vue 3.
// "npm run build" génère le site statique optimisé dans le dossier /dist,
// qui sera ensuite servi par Nginx (voir front/Dockerfile, stage 2).
export default defineConfig({
  plugins: [vue()],
});
