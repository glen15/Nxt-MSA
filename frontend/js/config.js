// API 서버 URL 설정
// 빌드 시: VITE_API_BASE 환경변수로 주입 (예: VITE_API_BASE=http://3.39.x.x:3000)
// 개발 시: 빈 문자열 (Vite dev server 프록시 사용)
window.API_BASE = import.meta.env.VITE_API_BASE || '';
