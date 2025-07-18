// frontend/static/js/listar-categorias.js

// Estado de paginação e busca
let currentPageCat = 1;
let pageSizeCat    = 10;
let searchCat      = '';

// APIs
async function carregarCategoriasPag(page = currentPageCat, size = pageSizeCat) {
  const token = localStorage.getItem('token');
  const resp = await fetch(
    `/api/almoxarifado/categorias/paginated?page=${page}&size=${size}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    }
  );
  if (!resp.ok) throw new Error(resp.status);
  return resp.json();
}

async function buscarCategorias(nome, page = currentPageCat, size = pageSizeCat) {
  const token  = localStorage.getItem('token');
  const params = new URLSearchParams({ page, size });
  if (nome) params.append('nome', nome);
  const resp = await fetch(`/api/almoxarifado/categorias/buscar?${params}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  if (!resp.ok) throw new Error(resp.status);
  return resp.json();
}

// Renderização
async function renderizarCategorias() {
  const main = document.getElementById('main-content');
  const data = searchCat
    ? await buscarCategorias(searchCat, currentPageCat, pageSizeCat)
    : await carregarCategoriasPag(currentPageCat, pageSizeCat);

  main.innerHTML = `
    <!-- Título -->
    <h3 class="mb-3">Lista de Categorias</h3>

    <!-- Card de Filtros de Busca -->
    <div class="card mb-3">
      <div class="card-header">Filtros de Busca</div>
      <div class="card-body">
        <form id="search-bar" class="row g-3 mb-0">

          <!-- Coluna 1: campo de texto empilha em telas < md -->
          <div class="col-12 col-md">
            <label for="search-categoria-nome" class="form-label">Nome da Categoria</label>
            <input
              type="text"
              id="search-categoria-nome"
              class="form-control"
              placeholder="Buscar por nome"
              value="${searchCat}"
            >
          </div>

          <!-- Coluna 2: botões empilham em telas < md -->
          <div class="col-12 col-md d-flex justify-content-end align-items-end">
            <button type="button" id="btn-search-cat" class="btn btn-primary me-2">Buscar</button>
            <button type="button" id="btn-clear-search-cat" class="btn btn-secondary">Limpar</button>
          </div>

        </form>
      </div>
    </div>

    <!-- Tabela de Categorias -->
    <div class="table-responsive">
      <table class="table table-bordered table-striped">
        <thead class="table-secondary text-center">
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Descrição</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((c) => `
            <tr>
              <td class="text-center">${c.categoria_id}</td>
              <td>${c.nome_original}</td>
              <td>${c.descricao_categoria || '-'}</td>
              <td class="text-center">
                <!-- Container flex para igualar largura e espaçar verticalmente -->
                <div class="d-flex flex-wrap justify-content-center gap-1">
                  <button
                    class="btn btn-sm btn-primary btn-acoes btn-editar-cat"
                    data-id="${c.categoria_id}"
                  >
                    Editar
                  </button>
                  <button
                    class="btn btn-sm btn-danger btn-acoes btn-deletar-cat"
                    data-id="${c.categoria_id}"
                  >
                    Deletar
                  </button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <!-- Paginação -->
    <nav>
      <ul class="pagination justify-content-center">
        <li class="page-item ${currentPageCat === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" data-action="prev-cat">Anterior</a>
        </li>
        ${(() => {
          const pages = [];
          const start = Math.max(1, currentPageCat - 2);
          const end = Math.min(data.total_pages, currentPageCat + 2);
          for (let p = start; p <= end; p++) {
            pages.push(`
              <li class="page-item ${p === currentPageCat ? 'active' : ''}">
                <a class="page-link" href="#" data-page-cat="${p}">${p}</a>
              </li>`);
          }
          return pages.join('');
        })()}
        <li class="page-item ${currentPageCat === data.total_pages ? 'disabled' : ''}">
          <a class="page-link" href="#" data-action="next-cat">Próximo</a>
        </li>
      </ul>
    </nav>

    <!-- Controle de itens por página -->
    <div class="d-flex justify-content-center my-2">
      <label class="me-2">Categorias por página:</label>
      <select id="page-size-cat" class="form-select w-auto">
        ${[5,10,25,50,100].map(opt => `
          <option value="${opt}" ${opt === pageSizeCat ? 'selected' : ''}>${opt}</option>`
        ).join('')}
      </select>
    </div>
  `;

  bindCategoriaActions();
  bindPaginationCat(data.total_pages);
}

// Ações
function bindCategoriaActions() {
  const main = document.getElementById('main-content');

  document.getElementById('btn-search-cat').onclick = (e) => {
    e.preventDefault();
    searchCat = document.getElementById('search-categoria-nome').value.trim();
    currentPageCat = 1;
    renderizarCategorias();
  };
  
  document.getElementById('btn-clear-search-cat').onclick = (e) => {
    e.preventDefault();
    searchCat = '';
    currentPageCat = 1;
    renderizarCategorias();
  };

  main.querySelectorAll('.btn-editar-cat').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/almoxarifado/categorias/${id}`, {
        headers: {'Authorization': `Bearer ${token}`, 'Accept': 'application/json'}
      });
      if (!res.ok) return alert('Erro ao carregar categoria');
      const cat = await res.json();

      // Popula modal de edição
      document.getElementById('edit-nome_categoria').value = cat.nome_original;
      document.getElementById('edit-descricao_categoria').value = cat.descricao_categoria || '';
      const saveBtn = document.getElementById('btn-salvar-editar-categoria');
      saveBtn.dataset.id = id;

      // Exibe modal
      new bootstrap.Modal(document.getElementById('modalEditarCategoria')).show();
    };
  });

  main.querySelectorAll('.btn-deletar-cat').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Excluir categoria?')) return;

      const id    = btn.dataset.id;
      const token = localStorage.getItem('token');
      const resp  = await fetch(
        `/api/almoxarifado/categorias/${id}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!resp.ok) {
        // Tenta ler o detalhe retornado pelo FastAPI
        let err;
        try {
          const body = await resp.json();
          err = body.detail || resp.statusText;
        } catch {
          err = resp.statusText;
        }
        return alert(`Erro ao excluir categoria:\n${err}`);
      }

      // Só re-renderiza se deu sucesso
      renderizarCategorias();
    };
  });
}

// Salvar edição
document.getElementById('btn-salvar-editar-categoria').onclick = async e => {
  const id = e.currentTarget.dataset.id;
  if (!id) return alert('ID não definido');
  const form = document.getElementById('form-editar-categoria');
  if (!form.checkValidity()) return form.reportValidity();

  const data = {
    nome_categoria: form.nome_categoria.value,
    descricao_categoria: form.descricao_categoria.value || undefined
  };
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/almoxarifado/categorias/${id}`, {
    method: 'PUT',
    headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${token}` },
    body: JSON.stringify(data)
  });
  if (!res.ok) return alert('Erro ao salvar categoria');

  bootstrap.Modal.getInstance(document.getElementById('modalEditarCategoria')).hide();
  renderizarCategorias();
};

// Paginação
function bindPaginationCat(totalPages) {
  const main = document.getElementById('main-content');
  main.querySelector('[data-action="prev-cat"]').onclick = e => {
    e.preventDefault();
    if (currentPageCat > 1) {
      currentPageCat--;
      renderizarCategorias();
    }
  };
  main.querySelector('[data-action="next-cat"]').onclick = e => {
    e.preventDefault();
    if (currentPageCat < totalPages) {
      currentPageCat++;
      renderizarCategorias();
    }
  };
  main.querySelectorAll('[data-page-cat]').forEach(el => {
    el.onclick = e => {
      e.preventDefault();
      currentPageCat = +el.dataset.pageCat;
      renderizarCategorias();
    };
  });
  document.getElementById('page-size-cat').onchange = e => {
    pageSizeCat = +e.target.value;
    currentPageCat = 1;
    renderizarCategorias();
  };
}

// Inicialização
document.getElementById('listar-categoria-link')?.addEventListener('click', e => {
  e.preventDefault();
  currentPageCat = 1;
  renderizarCategorias();
});
document.getElementById('listar-categoria-link-quick')?.addEventListener('click', e => {
  e.preventDefault();
  currentPageCat = 1;
  renderizarCategorias();
});
