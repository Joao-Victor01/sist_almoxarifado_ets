// Estado de paginação
let currentPage = 1;
let pageSize    = 10;
const pageSizeOptions = [5, 10, 25, 50, 100];

// 1) Funções auxiliares
async function carregarCategorias() {
  const token = localStorage.getItem('token');
  const resp = await fetch(`/api/almoxarifado/categorias`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  if (resp.status === 401) return window.location = '/';
  if (!resp.ok) throw new Error(resp.status);
  return resp.json();
}

// 2) Funções de template
function criarSearchBar() {
  return `
    <div class="row mb-3" id="search-bar">
      <div class="col-md-4">
        <input type="text" id="search-nome" class="form-control"
               placeholder="Buscar por nome (total ou parcial)">
      </div>
      <div class="col-md-4">
        <input type="text" id="search-categoria" class="form-control"
               placeholder="Buscar por categoria (total ou parcial)">
      </div>
      <div class="col-md-4 d-flex">
        <button id="btn-search" class="btn btn-primary me-2">Buscar</button>
        <button id="btn-clear-search" class="btn btn-secondary">Limpar</button>
      </div>
    </div>`;
}

function criarTabelaItens(itens, categoryMap) {
  let html = `
    <h3 class="mb-3">Lista de Itens do Almoxarifado</h3>
    <div class="table-responsive">
      <table class="table table-bordered table-striped">
        <thead class="table-secondary text-center">
          <tr>
            <th>Nome</th><th>Descrição</th><th>Unidade</th><th>Quantidade</th>
            <th>Validade</th><th>Entrada</th><th>Marca</th><th>Categoria</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
  `;
  itens.forEach(item => {
    const cat = categoryMap[item.categoria_id];
    const catLabel = cat ? `${item.categoria_id} - ${cat.nome_categoria}` : item.categoria_id;
    html += `
      <tr>
        <td>${item.nome_item}</td>
        <td>${item.descricao_item}</td>
        <td>${item.unidade_medida_item}</td>
        <td class="text-center">${item.quantidade_item}</td>
        <td class="text-center">${ item.data_validade_item ? new Date(item.data_validade_item).toLocaleDateString() : '-' }</td>
        <td class="text-center">${ item.data_entrada_item  ? new Date(item.data_entrada_item).toLocaleDateString()  : '-' }</td>
        <td>${item.marca_item || '-'}</td>
        <td class="text-center">${catLabel}</td>
        <td class="text-center">
          <a href="#" class="btn btn-sm btn-primary me-1 btn-editar" data-id="${item.item_id}">Editar</a>
          <button class="btn btn-sm btn-danger btn-deletar" data-id="${item.item_id}">Deletar</button>
        </td>
      </tr>
    `;
  });
  html += `</tbody></table></div>`;
  return html;
}

function criarControlesPaginacao(totalPages) {
  let html = `<nav><ul class="pagination justify-content-center">`;
  html += `<li class="page-item ${currentPage===1?'disabled':''}"><a class="page-link" href="#" data-action="prev">Anterior</a></li>`;
  const start = Math.max(1, currentPage-2), end = Math.min(totalPages, currentPage+2);
  for(let p=start; p<=end; p++){
    html += `<li class="page-item ${p===currentPage?'active':''}"><a class="page-link" href="#" data-page="${p}">${p}</a></li>`;
  }
  html += `<li class="page-item ${currentPage===totalPages?'disabled':''}"><a class="page-link" href="#" data-action="next">Próximo</a></li>`;
  html += `</ul></nav>
    <div class="d-flex justify-content-center my-2">
      <label class="me-2">Itens por página:</label>
      <select id="page-size-select" class="form-select w-auto">
        ${pageSizeOptions.map(opt => `<option value="${opt}" ${opt===pageSize?'selected':''}>${opt}</option>`).join('')}
      </select>
    </div>`;
  return html;
}

// 3) Chamadas à API
async function carregarListaItens(page=currentPage, size=pageSize) {
  const token = localStorage.getItem('token');
  const resp = await fetch(`/api/almoxarifado/itens/paginated?page=${page}&size=${size}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept':'application/json' }
  });
  if (resp.status===401) return window.location='/';
  if (!resp.ok) throw new Error(resp.status);
  return resp.json();
}

async function buscarItens(nome, categoria, page=currentPage, size=pageSize) {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('size', size);
  if (nome)      params.append('nome', nome);
  if (categoria) params.append('categoria', categoria);
  const resp = await fetch(`/api/almoxarifado/itens/buscar?${params}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept':'application/json' }
  });
  if (!resp.ok) throw new Error(resp.status);
  return resp.json();  // retorna PaginatedItems
}

// 4) Binds e renderização
async function renderizarListaItens() {
  try {
    const data = await carregarListaItens();
    const categorias = await carregarCategorias();
    const categoryMap = {};
    categorias.forEach(c => categoryMap[c.categoria_id] = c);

    const main = document.getElementById('main-content');
    main.innerHTML = criarSearchBar()
                   + criarTabelaItens(data.items, categoryMap)
                   + criarControlesPaginacao(data.total_pages);
    bindSearch();
    bindRowActions();
    bindPagination(data.total_pages);
  } catch (err) {
    console.error(err);
    document.getElementById('main-content').innerHTML =
      `<div class="alert alert-warning">Erro: ${err.message}</div>`;
  }
}

function bindSearch() {
  document.getElementById('btn-search').onclick = async e => {
    e.preventDefault();
    const nome = document.getElementById('search-nome').value.trim();
    const cat  = document.getElementById('search-categoria').value.trim();
    
    const data = await buscarItens(nome, cat, currentPage, pageSize);
    const categorias = await carregarCategorias();
    const categoryMap = {};
    categorias.forEach(c => categoryMap[c.categoria_id] = c);

    const main = document.getElementById('main-content');
    main.innerHTML = criarSearchBar()
                   + criarTabelaItens(data.items, categoryMap)
                   + criarControlesPaginacao(data.total_pages);
    bindRowActions();
    bindPagination(data.total_pages);
    bindSearch();
  };

  document.getElementById('btn-clear-search').onclick = e => {
    e.preventDefault();
    currentPage = 1;
    pageSize   = 10;
    renderizarListaItens();
  };
}

function bindPagination(totalPages) {
  document.querySelector('[data-action="prev"]').onclick = e => {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      renderizarListaItens();
    }
  };
  document.querySelector('[data-action="next"]').onclick = e => {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      renderizarListaItens();
    }
  };
  document.querySelectorAll('[data-page]').forEach(el =>
    el.onclick = e => {
      e.preventDefault();
      currentPage = +el.dataset.page;
      renderizarListaItens();
    }
  );
  document.getElementById('page-size-select').onchange = e => {
    pageSize = +e.target.value;
    currentPage = 1;
    renderizarListaItens();
  };
}

function bindRowActions() {
  document.querySelectorAll('.btn-deletar').forEach(btn =>
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (!confirm('Excluir?')) return;
      const token = localStorage.getItem('token');
      await fetch(`/api/almoxarifado/itens/${id}`, {
        method:'DELETE', headers:{ 'Authorization':`Bearer ${token}` }
      });
      renderizarListaItens();
    }
  );
  document.querySelectorAll('.btn-editar').forEach(btn =>
    btn.onclick = async () => {
      // lógica de editar
    }
  );
}

// 5) Inicialização
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('listar-item-link').onclick = e => {
    e.preventDefault();
    currentPage = 1;
    pageSize    = 10;
    renderizarListaItens();
  };
});
