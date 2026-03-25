import { defineConfig } from 'vite';

export default defineConfig({
  // 빌드 결과물 → dist/ 폴더 (S3에 업로드할 대상)
  build: {
    outDir: 'dist',
  },
  // 개발 서버 프록시 (로컬에서 API 호출 시 CORS 회피)
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
