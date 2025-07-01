window.addEventListener('DOMContentLoaded', () => {
  const logoutLink = document.getElementById('logout-link');
  if (!logoutLink) return;

  logoutLink.addEventListener('click', async (e) => {
    e.preventDefault();

    try {
      await fetch('/api/almoxarifado/usuarios/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.warn('Logout no servidor falhou, mas continua no client', err);
    }

    // 1) Limpa o token do localStorage
    localStorage.removeItem('token');

    // 2) Apaga o cookie access_token
    document.cookie = [
      'access_token=',
      'path=/',
      'Max-Age=0',
      'SameSite=Lax'
    ].join('; ');

    // 3) Redireciona pra tela de login
    window.location.href = '/';
  });
});
