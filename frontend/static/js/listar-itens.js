// frontend/static/js/listar-itens.js

// Estado de paginação
let currentPage = 1;
let pageSize    = 10;
const pageSizeOptions = [5, 10, 25, 50, 100];
// guarda estado da última busca
let searchNome = '';
let searchCategoria = '';

// 1) API de categorias
async function carregarCategorias() {
  const token = localStorage.getItem('token');
  const resp = await fetch(`/api/almoxarifado/categorias`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  if (resp.status === 401) {
    window.location = '/';
    return [];
  }
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// 2) API de itens
async function carregarListaItens(page=currentPage, size=pageSize) {
  const token = localStorage.getItem('token');
  const resp = await fetch(
    `/api/almoxarifado/itens/paginated?page=${page}&size=${size}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    }
  );
  if (resp.status === 401) {
    window.location = '/';
    return { items: [], total_pages: 0 };
  }
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  // Ordena itens alfabeticamente por nome
  data.items.sort((a, b) => a.nome_item_original.localeCompare(b.nome_item_original));
  return data;
}

async function buscarItens(nome, categoria, page=currentPage, size=pageSize) {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({ page, size });
  if (nome)      params.append('nome', nome);
  if (categoria) params.append('categoria', categoria);
  const resp = await fetch(`/api/almoxarifado/itens/buscar?${params}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  // Ordena itens da busca
  data.items.sort((a, b) => a.nome_item_original.localeCompare(b.nome_item_original));
  return data;
}

// 3) Templates HTML
function criarSearchBar() {
  return `
    <div class="row mb-3" id="search-bar">
      <div class="col-md-4">
        <input type="text" id="search-nome" class="form-control"
               placeholder="Buscar por nome">
      </div>
      <div class="col-md-4">
        <input type="text" id="search-categoria" class="form-control"
               placeholder="Buscar por categoria">
      </div>
      <div class="col-md-4 d-flex">
        <button id="btn-search" class="btn btn-primary me-2">Buscar</button>
        <button id="btn-clear-search" class="btn btn-secondary">Limpar</button>
      </div>
    </div>`;
}

function criarTabelaItens(itens, categoryMap) {
  let html = `
    <h3 class="mb-3">Lista de Itens</h3>
    <div class="table-responsive">
      <table class="table table-bordered table-striped">
        <thead class="table-secondary text-center">
          <tr>
            <th>ID</th><th>Nome</th><th>Descrição</th><th>Unidade de Medida</th><th>Quantidade</th>
            <th>Validade</th><th>Entrada</th><th>Marca</th><th>Categoria</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>`;
  itens.forEach(item => {
    const cat = categoryMap[item.categoria_id];
    const label = cat 
      ? `${item.categoria_id} – ${cat.nome_original.toUpperCase()}` 
      : item.categoria_id;
    html += `
      <tr>
        <td>${item.item_id}</td>
        <td>${item.nome_item_original}</td>
        <td>${item.descricao_item}</td>
        <td>${item.unidade_medida_item}</td>
        <td class="text-center">${item.quantidade_item}</td>
        <td class="text-center">${ item.data_validade_item 
            ? new Date(item.data_validade_item).toLocaleDateString() 
            : '-' }</td>
        <td class="text-center">${ item.data_entrada_item 
            ? new Date(item.data_entrada_item).toLocaleDateString() 
            : '-' }</td>
        <td>${item.marca_item||'-'}</td>
        <td class="text-center">${label}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-primary me-1 btn-editar" data-id="${item.item_id}">
            Editar
          </button>
          <button class="btn btn-sm btn-danger btn-deletar" data-id="${item.item_id}">
            Deletar
          </button>
        </td>
      </tr>`;
  });
  html += `</tbody></table></div>`;
  return html;
}

function criarControlesPaginacao(totalPages) {
  let html = `<nav><ul class="pagination justify-content-center">`;
  html += `<li class="page-item ${currentPage===1?'disabled':''}">
    <a class="page-link" href="#" data-action="prev">Anterior</a>
  </li>`;
  const start = Math.max(1, currentPage-2), end = Math.min(totalPages, currentPage+2);
  for (let p = start; p <= end; p++) {
    html += `<li class="page-item ${p===currentPage?'active':''}">
      <a class="page-link" href="#" data-page="${p}">${p}</a>
    </li>`;
  }
  html += `<li class="page-item ${currentPage===totalPages?'disabled':''}">
    <a class="page-link" href="#" data-action="next">Próximo</a>
  </li>`;
  html += `</ul></nav>
    <div class="d-flex justify-content-center my-2">
      <label class="me-2">Itens por página:</label>
      <select id="page-size-select" class="form-select w-auto">
        ${pageSizeOptions.map(opt =>
          `<option value="${opt}" ${opt===pageSize?'selected':''}>${opt}</option>`
        ).join('')}
      </select>
    </div>`;
  return html;
}

// 4) Carrega e renderiza tudo
async function renderizarListaItens() {
   try {
    // se tiver filtro, chama buscarItens, senão lista geral
    const data = (searchNome || searchCategoria)
      ? await buscarItens(searchNome, searchCategoria, currentPage, pageSize)
      : await carregarListaItens(currentPage, pageSize);

     const categorias = await carregarCategorias();
     const categoryMap= {};
     categorias.forEach(c => categoryMap[c.categoria_id] = c);

     const main = document.getElementById('main-content');
     main.innerHTML = 
       criarSearchBar() +
       criarTabelaItens(data.items, categoryMap) +
       criarControlesPaginacao(data.total_pages);

     bindSearch();
     bindPagination(data.total_pages);
     bindRowActions(categorias);
   } catch (err) {
     console.error(err);
     document.getElementById('main-content').innerHTML =
       `<div class="alert alert-warning">Erro: ${err.message}</div>`;
   }
 }

// 5) Bindings de busca
function bindSearch() {
  document.getElementById('btn-search').onclick = async e => {
    e.preventDefault();
    const nome = document.getElementById('search-nome').value.trim();
    const cat  = document.getElementById('search-categoria').value.trim();
    // atualiza estado de busca
    searchNome = nome;
    searchCategoria = cat;
    currentPage = 1;

    // re-renderiza via mesma função
    renderizarListaItens();
  };
  document.getElementById('btn-clear-search').onclick = e => {
     e.preventDefault();

    // limpa filtros
    searchNome = '';
    searchCategoria = '';
    currentPage = 1;
    pageSize = 10;
    renderizarListaItens();
  };
}

// 6) Bindings de paginação
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
  document.querySelectorAll('[data-page]').forEach(el => {
    el.onclick = e => {
      e.preventDefault();
      currentPage = +el.dataset.page;
      renderizarListaItens();
    };
   });
   document.getElementById('page-size-select').onchange = e => {
    pageSize = +e.target.value;
    currentPage = 1;
    renderizarListaItens();
  };
}

// 7) Bindings de ações nas linhas
function bindRowActions(categorias) {
  // deletar
  document.querySelectorAll('.btn-deletar').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Excluir este item?')) return;
      const id = btn.dataset.id;
      const token = localStorage.getItem('token');
      await fetch(`/api/almoxarifado/itens/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      renderizarListaItens();
    };
  });

  // editar
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.onclick = async e => {
      e.preventDefault();
      const id = btn.dataset.id;
      const token = localStorage.getItem('token');

      // 1) busca item
      const respItem = await fetch(`/api/almoxarifado/itens/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!respItem.ok) return alert('Erro ao carregar item');
      const item = await respItem.json();

      // 2) popula categorias no select de edição
      const sel = document.getElementById('edit-categoria_id');
      sel.innerHTML = '<option value="" disabled>Carregando...</option>';

      categorias.forEach(c => {
        const o = document.createElement('option');
        o.value       = c.categoria_id;
        o.textContent = `${c.categoria_id} – ${c.nome_categoria.toUpperCase()}`;
        sel.append(o);
      });

      sel.value = item.categoria_id;

      // 3) preenche demais campos
      const form = document.getElementById('form-editar-item');
      form.nome_item.value = item.nome_item_original;
      form.unidade_medida_item.value = item.unidade_medida_item;
      form.descricao_item.value = item.descricao_item;
      form.quantidade_item.value = item.quantidade_item;
      form.quantidade_minima_item.value = item.quantidade_minima_item || '';
      form.data_validade_item.value = item.data_validade_item?.split('T')[0] || '';
      form.data_entrada_item.value  = item.data_entrada_item?.slice(0,16) || '';
      form.marca_item.value         = item.marca_item || '';

      // 4) guarda id no botão salvar
      const saveBtn = document.getElementById('btn-salvar-editar-item');
      saveBtn.dataset.id = id;

      // 5) exibe modal
      new bootstrap.Modal(
        document.getElementById('modalEditarItem')
      ).show();
    };
  });

  // 8) salvar edição
  document.getElementById('btn-salvar-editar-item').onclick = async e => {
    const id = e.currentTarget.dataset.id;
    if (!id) return alert('ID de edição não definido');
    const form = document.getElementById('form-editar-item');
    const data = {
      nome_item:           form.nome_item.value,
      unidade_medida_item: form.unidade_medida_item.value,
      descricao_item:      form.descricao_item.value,
      quantidade_item:     Number(form.quantidade_item.value),
      categoria_id:        Number(form.categoria_id.value),
    };
    if (form.quantidade_minima_item.value)
      data.quantidade_minima_item = Number(form.quantidade_minima_item.value);
    if (form.data_validade_item.value)
      data.data_validade_item = form.data_validade_item.value;
    if (form.data_entrada_item.value)
      data.data_entrada_item = form.data_entrada_item.value;
    if (form.marca_item.value)
      data.marca_item = form.marca_item.value;

    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`/api/almoxarifado/itens/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!resp.ok) {
        const err = await resp.json();
        return alert('Erro ao salvar: ' + (err.detail||resp.status));
      }
      // fecha e atualiza
      bootstrap.Modal
        .getInstance(document.getElementById('modalEditarItem'))
        .hide();
      renderizarListaItens();
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar alterações.');
    }
  };
}

// 9) inicialização
const linkListar = document.getElementById('listar-item-link');
if (linkListar) {
  linkListar.addEventListener('click', e => {
    e.preventDefault();
    currentPage = 1;
    pageSize = 10;
    renderizarListaItens();
  });
}
