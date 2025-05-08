// frontend/static/js/auth.js
import { postJson } from './api.js';

export async function login(username, password) {
  const body = new URLSearchParams({ username, password });
  const resp = await fetch('/api/almoxarifado/usuarios/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    credentials: 'include',
    body: body.toString()
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || 'Falha ao autenticar');
  }
  const { access_token } = await resp.json();
  localStorage.setItem('token', access_token);
}

export function logout() {
  fetch('/api/almoxarifado/usuarios/logout', { method: 'POST' })
    .catch(() => {});
  localStorage.removeItem('token');
  window.location.href = '/';
}
