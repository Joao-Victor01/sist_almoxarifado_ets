// frontend/static/js/login.js

window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const body = new URLSearchParams({ username, password });

    try {
      const resp = await fetch('/api/almoxarifado/usuarios/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'include',
        body: body.toString()
      });

      if (!resp.ok) {
        const err = await resp.json();
        alert(err.detail || 'Falha ao autenticar');
        return;
      }

      const { access_token } = await resp.json();

     // ── Grava o JWT como cookie para o backend ler ──
     document.cookie = [
       `access_token=${access_token}`,
       'path=/',
       'max-age=' + 60 * 60 * 24,       // 1 dia
       'SameSite=Lax'                   // ou 'None; Secure' se for cross-site
     ].join('; ');

      // opcional: continua guardando no localStorage
      localStorage.setItem('token', access_token);

      const payload = JSON.parse(atob(access_token.split('.')[1]));
      const tipo = payload.tipo_usuario;

      if (tipo === 1)       window.location.href = '/dashboardServidor';
      else if (tipo === 2)  window.location.href = '/dashboardAlmoxarifado';
      else if (tipo === 3)  window.location.href = '/dashboardDirecao';
      else                  alert('Tipo de usuário desconhecido.');

    } catch (error) {
      alert('Erro de conexão com o servidor.');
    }
  });
});
