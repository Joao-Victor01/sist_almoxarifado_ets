// Função para carregar a lista de itens
async function carregarListaItens() {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Sessão expirada. Faça login novamente.');
      window.location.href = '/login.html';
      return;
    }
  
    try {
      const response = await fetch('/api/almoxarifado/itens/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
  
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
  
      return await response.json();
    } catch (err) {
      console.error('Erro ao buscar itens:', err);
      throw err;
    }
  }
  
  // Função para criar a tabela de itens
  function criarTabelaItens(itens) {
    let html = `
      <h3 class="mb-3">Lista de Itens do Almoxarifado</h3>
      <div class="table-responsive">
        <table class="table table-bordered table-striped">
          <thead class="table-secondary text-center">
            <tr>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Unidade</th>
              <th>Quantidade</th>
              <th>Validade</th>
              <th>Entrada</th>
              <th>Marca</th>
            </tr>
          </thead>
          <tbody>
    `;
  
    itens.forEach(item => {
      html += `
        <tr>
          <td>${item.nome_item}</td>
          <td>${item.descricao_item}</td>
          <td>${item.unidade_medida_item}</td>
          <td class="text-center">${item.quantidade_item}</td>
          <td class="text-center">
            ${item.data_validade_item
              ? new Date(item.data_validade_item).toLocaleDateString()
              : '-'}
          </td>
          <td class="text-center">
            ${item.data_entrada_item
              ? new Date(item.data_entrada_item).toLocaleDateString()
              : '-'}
          </td>
          <td>${item.marca_item || '-'}</td>
        </tr>
      `;
    });
  
    html += `
          </tbody>
        </table>
      </div>
    `;
  
    return html;
  }
  
  // Função para mostrar erro
  function mostrarErroCarregamento(mensagem) {
    return `
      <div class="alert alert-warning">
        Não foi possível carregar a lista de itens (${mensagem}).
      </div>
    `;
  }
  
  // Configura o evento de clique
  document.addEventListener('DOMContentLoaded', () => {
    const link = document.getElementById('listar-item-link');
    const mainContent = document.getElementById('main-content');
  
    if (link) {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
  
        try {
          const itens = await carregarListaItens();
          mainContent.innerHTML = criarTabelaItens(itens);
        } catch (err) {
          console.error('Erro:', err);
          mainContent.innerHTML = mostrarErroCarregamento(err.message);
        }
      });
    }
  });