// frontend/static/js/login.js

// Ao carregar a página de login, limpa qualquer token anterior
window.addEventListener('DOMContentLoaded', () => {
  localStorage.removeItem('access_token');
});

// URL base da API (ajuste conforme seu ambiente)
const API_BASE = '/api/almoxarifado/usuarios';

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  // Preparar dados para OAuth2PasswordRequestForm
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);

  try {
    const response = await fetch(`${API_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    if (!response.ok) throw new Error('Usuário ou senha inválidos');

    const { access_token: token } = await response.json();

    // Armazenar token no localStorage (mesmo nome que validar-acesso.js vai ler)
    localStorage.setItem('access_token', token);

    // Decodificar payload do JWT
    const payload = JSON.parse(atob(token.split('.')[1]));
    const tipo = payload.tipo_usuario;

    // Redirecionar de acordo com tipo de usuário
    if (tipo === 1)      window.location.href = '/dashboardServidor';
    else if (tipo === 2) window.location.href = '/dashboardAlmoxarifado';
    else if (tipo === 3) window.location.href = '/dashboardDirecao';
    else                 alert('Tipo de usuário desconhecido');

  } catch (err) {
    alert(err.message);
  }
});
