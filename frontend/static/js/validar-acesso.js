
(function () {
    // Decodifica o token JWT
    function decodeJWT(token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = atob(payloadBase64);
        return JSON.parse(decodedPayload);
      } catch (e) {
        return null;
      }
    }
  
    // Mapeamento de páginas para tipos de usuário permitidos
    const pageRoles = {
      'dashboardServidor': 1,
      'dashboardAlmoxarifado': 2,
      'dashboardDirecao': 3
    };
  
    // Função principal de verificação
    function checkAuthAndRedirect() {
      const token = localStorage.getItem("access_token");
      
      // Redireciona se não tiver token
      if (!token) {
        alert("Você precisa estar logado.");
        window.location.href = "/";
        return;
      }
  
      // Verifica token válido
      const data = decodeJWT(token);
      if (!data || !data.tipo_usuario) {
        alert("Token inválido.");
        localStorage.removeItem("access_token");
        window.location.href = "/";
        return;
      }
  
      // Obtém a página atual
      const currentPage = window.location.pathname.split('/').pop();
      const requiredRole = Object.keys(pageRoles).find(page => currentPage.includes(page));
  
      // Verifica se a página requer autorização específica
      if (requiredRole && data.tipo_usuario !== pageRoles[requiredRole]) {
        const roleNames = {
          1: 'servidor',
          2: 'almoxarifado',
          3: 'direção'
        };
        
        alert(`Acesso negado. Apenas ${roleNames[pageRoles[requiredRole]]} pode acessar esta área.`);
        window.location.href = "/";
        return;
      }
  
      // Log opcional do usuário autenticado
      console.log("Usuário autenticado:", data.sub);
    }
  
    // Executa a verificação quando o script é carregado
    checkAuthAndRedirect();
  })();