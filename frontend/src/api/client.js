const BASE = '/api';

function getToken() {
  return localStorage.getItem('carelink_token');
}

async function request(method, url, body, isForm = false) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Download a protected file and open it in a new tab (or download)
async function openProtectedFile(url, { download = false, filename = 'document' } = {}) {
  const token = getToken();
  const res = await fetch(BASE + url, {
    headers: token ? { Authorization: 'Bearer ' + token } : {}
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to load file');
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  if (download) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } else {
    window.open(blobUrl, '_blank');
    // Give browser time to load; then free memory
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  }
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
  upload: (url, formData) => request('POST', url, formData, true),
  openProtectedFile
};