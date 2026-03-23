// API 클라이언트
const API_BASE = window.API_BASE || '';

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok && res.status >= 500) throw new Error(data.error || `${res.status}`);
  return { status: res.status, data };
}

async function checkHealth() {
  try {
    const data = await apiGet('/api/health');
    return data.status === 'running';
  } catch {
    return false;
  }
}
