// Estado de paginação
let currentPage = 1;
let pageSize = 10;

// Itens permitidos no seletor
const pageSizeOptions = [5, 10, 25, 50, 100];

// Função para carregar a página de itens paginados
async function carregarListaItens(page = currentPage, size = pageSize) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Sessão expirada. Faça login novamente.');
    window.location.href = '/';
    return null;
  }

  const url = `/api/almoxarifado/itens/paginated?page=${page}&size=${size}`;
  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  if (resp.status === 401) {
    alert('Sessão expirada. Faça login novamente.');
    localStorage.removeItem('token');
    window.location.href = '/';
    return null;
  }
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  return resp.json(); // { items: [...], total: X, page: Y, size: Z, total_pages: W }
}

// Gera o HTML da tabela a partir do array de itens
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
        <td class="text-center">${item.data_validade_item
          ? new Date(item.data_validade_item).toLocaleDateString()
          : '-'}</td>
        <td class="text-center">${item.data_entrada_item
          ? new Date(item.data_entrada_item).toLocaleDateString()
          : '-'}</td>
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

// Gera os controles de paginação
function criarControlesPaginacao(totalPages) {
  let html = `<nav aria-label="Paginação"><ul class="pagination justify-content-center">`;

  // Botão Anterior
  html += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-action="prev">Anterior</a>
    </li>`;

  // Números de página (até 5 em torno da currentPage)
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  for (let p = startPage; p <= endPage; p++) {
    html += `
      <li class="page-item ${p === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${p}">${p}</a>
      </li>`;
  }

  // Botão Próximo
  html += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-action="next">Próximo</a>
    </li>
  `;

  html += `</ul></nav>`;

  // Seletor de quantidade
  html += `
    <div class="d-flex justify-content-center align-items-center my-2">
      <label for="page-size-select" class="me-2">Itens por página:</label>
      <select id="page-size-select" class="form-select w-auto">
        ${pageSizeOptions.map(opt =>
          `<option value="${opt}" ${opt === pageSize ? 'selected' : ''}>${opt}</option>`
        ).join('')}
      </select>
    </div>
  `;

  return html;
}

// Renderiza tabela + controles na tela
async function renderizarListaItens() {
  try {
    const data = await carregarListaItens();
    if (!data) return;

    const { items, total_pages } = data;
    const main = document.getElementById('main-content');
    main.innerHTML = criarTabelaItens(items)
                   + criarControlesPaginacao(total_pages);

    // Vincula eventos aos controles de paginação
    document.querySelectorAll('[data-action="prev"]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        if (currentPage > 1) {
          currentPage--;
          renderizarListaItens();
        }
      });
    });
    document.querySelectorAll('[data-action="next"]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        if (currentPage < data.total_pages) {
          currentPage++;
          renderizarListaItens();
        }
      });
    });
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        const p = Number(el.getAttribute('data-page'));
        if (p !== currentPage) {
          currentPage = p;
          renderizarListaItens();
        }
      });
    });
    document.getElementById('page-size-select').addEventListener('change', e => {
      pageSize = Number(e.target.value);
      currentPage = 1;
      renderizarListaItens();
    });

  } catch (err) {
    console.error('Erro ao renderizar itens:', err);
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="alert alert-warning">
        Não foi possível carregar a lista de itens (${err.message}).
      </div>
    `;
  }
}

// Dispara o carregamento quando o usuário clica no menu
document.addEventListener('DOMContentLoaded', () => {
  const link = document.getElementById('listar-item-link');
  if (link) {
    link.addEventListener('click', e => {
      e.preventDefault();
      currentPage = 1;
      pageSize = 10;
      renderizarListaItens();
    });
  }
});
