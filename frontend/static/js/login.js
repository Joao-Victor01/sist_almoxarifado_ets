document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('form');
  
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
  
      const username = form.username.value;
      const password = form.password.value;
  
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
  
      try {
        const response = await fetch('/api/almoxarifado/usuarios/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData
        });
  
        if (!response.ok) {
          throw new Error('Falha no login');
        }
  
        const data = await response.json();
        const token = data.access_token;
  
        // Salva o token no localStorage
        localStorage.setItem('access_token', token);
  
        // Decodifica o token (payload)
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        const tipoUsuario = decodedPayload.tipo_usuario;
  
        if (tipoUsuario === 2) {
          window.location.href = '/dashboardAlmoxarifado';
        } else if (tipoUsuario === 1) {
          window.location.href = '/dashboardServidor';
        } else if (tipoUsuario === 3) {
          window.location.href = '/dashboardDirecao';
        } else {
          alert("Tipo de usuário não reconhecido.");
        }
  
      } catch (error) {
        alert('Erro no login: ' + error.message);
      }
    });
  });
  