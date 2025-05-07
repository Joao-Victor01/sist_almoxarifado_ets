//frontend\static\js\logout.js

window.addEventListener('DOMContentLoaded', () => {
    const logoutLink = document.getElementById('logout-link');
    if (!logoutLink) return;
  
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
  
      // Tenta chamar o endpoint (opcional)
      try {
        await fetch('/api/almoxarifado/usuarios/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
      } catch (err) {
        console.warn('Logout no servidor falhou, mas continua no client', err);
      }
  
      // Limpa o token e volta para a tela de login
      localStorage.removeItem('token');
      window.location.href = '/';  // ou '/index.html'
    });
  });
  