// frontend/static/js/api.js

export async function postJson(url, data) {
    const token = localStorage.getItem('token');
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(data)
    });
    const payload = await resp.json();
    return { status: resp.status, payload };
  }
  
  export async function fetchJson(url, opts = {}) {
    const token = localStorage.getItem('token');
    const resp = await fetch(url, {
      ...opts,
      headers: {
        'Accept': 'application/json',
        ...(opts.headers || {}),
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    if (resp.status === 401) throw new Error('Unauthorized');
    const data = await resp.json();
    return data;
  }
  