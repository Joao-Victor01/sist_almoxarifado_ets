// Estado de paginação
let currentPage = 1;
let pageSize = 10;
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
async function carregarListItens(page = currentPage, size = pageSize) {
    const token = localStorage.getItem('token');
    const resp = await fetch(`/api/almoxarifado/itens/paginated?page=${page}&size=${size}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

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

async function buscarItens(nome, categoria, page = currentPage, size = pageSize) {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ page, size });

    if (nome) params.append('nome', nome);
    if (categoria) params.append('categoria', categoria);

    const resp = await fetch(`/api/almoxarifado/itens/buscar?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    if (resp.status === 401) {
        window.location = '/';
        return { items: [], total_pages: 0 };
    }

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // Ordena itens da busca
    data.items.sort((a, b) => a.nome_item_original.localeCompare(b.nome_item_original));
    return data;
}

// 3) Templates HTML
function criarSearchBar() {
    return `
        <h3 class="mb-3">Lista de Itens</h3>

        <div class="card mb-3">
          <div class="card-header">Filtros de Busca</div>
          <div class="card-body">
            <form id="search-bar" class="row g-3 mb-0">

              <!-- Agora, cada coluna usa "col-12 col-md" para que empilhem em telas < md -->
              <div class="col-12 col-md">
                <label for="search-nome" class="form-label">Nome</label>
                <input
                  type="text"
                  id="search-nome"
                  class="form-control"
                  placeholder="Buscar por nome"
                  value="${searchNome}"
                >
              </div>

              <div class="col-12 col-md">
                <label for="search-categoria" class="form-label">Categoria</label>
                <input
                  type="text"
                  id="search-categoria"
                  class="form-control"
                  placeholder="Buscar por categoria"
                  value="${searchCategoria}"
                >
              </div>

              <!-- Botões também acompanham col-12 col-md, empilham antes de encolher -->
              <div class="col-12 col-md d-flex justify-content-end align-items-end">
                <button id="btn-search" class="btn btn-primary me-2">Buscar</button>
                <button id="btn-clear-search" class="btn btn-secondary">Limpar</button>
              </div>

            </form>
          </div>
        </div>`;
}


function criarTabelaItens(itens, categoryMap) {
    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-striped">
                <thead class="table-secondary text-center">
                    <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th>Descrição</th>
                        <th>Unidade de Medida</th>
                        <th>Quantidade</th>
                        <th>Validade</th>
                        <th>Entrada</th>
                        <th>Marca</th>
                        <th>Categoria</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>`;

    itens.forEach(item => {
        const cat = categoryMap[item.categoria_id];
        const label = cat
            ? `${item.categoria_id} ${cat.nome_original.toUpperCase()}`
            : item.categoria_id;

        const dataValidade = item.data_validade_item 
            ? new Date(item.data_validade_item).toLocaleDateString() 
            : '-';
            
        const dataEntrada = item.data_entrada_item 
            ? new Date(item.data_entrada_item).toLocaleDateString() 
            : '-';

        html += `
            <tr>
                <td>${item.item_id}</td>
                <td>${item.nome_item_original}</td>
                <td>${item.descricao_item || '-'}</td>
                <td>${item.unidade_medida_item}</td>
                <td class="text-center">${item.quantidade_item}</td>
                <td class="text-center">${dataValidade}</td>
                <td class="text-center">${dataEntrada}</td>
                <td>${item.marca_item || '-'}</td>
                <td class="text-center">${label}</td>
                <td class="text-center">
                    <!-- restauramos btn-editar e btn-deletar, mantendo btn-acoes -->
                    <div class="d-flex flex-wrap justify-content-center gap-1">
                      <button 
                        class="btn btn-sm btn-primary btn-editar btn-acoes" 
                        data-id="${item.item_id}"
                      >
                        <i class="bi bi-pencil-square"></i> Editar
                      </button>
                      <button 
                        class="btn btn-sm btn-danger btn-deletar btn-acoes" 
                        data-id="${item.item_id}"
                      >
                        <i class="bi bi-trash"></i> Deletar
                      </button>
                    </div>
                </td>
            </tr>`;
    });

    html += `
                </tbody>
            </table>
        </div>`;

    return html;
}



function criarControlesPaginacao(totalPages) {
    let html = `
        <nav aria-label="Page navigation" id="itens-pagination-nav">
          <ul class="pagination justify-content-center">`;

    html += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
              <a class="page-link" href="#" data-action="itens-prev">Anterior</a>
            </li>`;

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let p = start; p <= end; p++) {
        html += `
            <li class="page-item ${p === currentPage ? 'active' : ''}">
              <a class="page-link" href="#" data-page="itens-${p}">${p}</a>
            </li>`;
    }

    html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
              <a class="page-link" href="#" data-action="itens-next">Próximo</a>
            </li>
          </ul>
        </nav>

        <div class="d-flex justify-content-center my-2">
          <label class="me-2">Itens por página:</label>
          <select id="page-size-select" class="form-select w-auto">
            ${pageSizeOptions
              .map(opt => `<option value="${opt}" ${opt === pageSize ? 'selected' : ''}>${opt}</option>`)
              .join('')}
          </select>
        </div>`;

    return html;
}

// 4) Carrega e renderiza tudo
async function renderizarListItens() {
    try {
        // se tiver filtro, chama buscarItens, senão lista geral
        const data = (searchNome || searchCategoria)
            ? await buscarItens(searchNome, searchCategoria, currentPage, pageSize)
            : await carregarListItens(currentPage, pageSize);

        const categorias = await carregarCategorias();
        const categoryMap = {};
        categorias.forEach(c => categoryMap[c.categoria_id] = c);

        const main = document.getElementById('main-content');
        if (main) {
            main.innerHTML = `
                ${criarSearchBar()}
                ${criarTabelaItens(data.items, categoryMap)}
                ${criarControlesPaginacao(data.total_pages)}
            `;

            bindSearch();
            bindPagination(data.total_pages);
            bindRowActions(categorias);

        } else {
            console.error("Elemento 'main-content' não encontrado em listar-itens.js");
        }
    } catch (err) {
        console.error(err);
        const main = document.getElementById('main-content');
        if (main) {
            main.innerHTML = `<div class="alert alert-warning">Erro: ${err.message}</div>`;
        }
    }
}

// 5) Bindings de busca
function bindSearch() {
    document.getElementById('btn-search')?.addEventListener('click', e => {
        e.preventDefault();
        const nome = document.getElementById('search-nome').value.trim();
        const cat = document.getElementById('search-categoria').value.trim();

        // atualiza estado de busca
        searchNome = nome;
        searchCategoria = cat;
        currentPage = 1;

        // re-renderiza via mesma função
        renderizarListItens();
    });

    document.getElementById('btn-clear-search')?.addEventListener('click', e => {
        e.preventDefault();

        // limpa filtros
        searchNome = '';
        searchCategoria = '';
        currentPage = 1;
        pageSize = 10;

        renderizarListItens();
    });
}

// 6) Bindings de paginação
function bindPagination(totalPages) {
    const itensPaginationNav = document.getElementById('itens-pagination-nav');
    const pageSizeSelect = document.getElementById('page-size-select');

    if (!itensPaginationNav) {
        console.warn("Elemento 'itens-pagination-nav' não encontrado para bindPagination.");
        return;
    }

    // Nova abordagem para evitar duplicação de eventos
    const handlePaginationClick = (e) => {
        e.preventDefault();

        const clickedPageLink = e.target.closest('a[data-page^="itens-"]');
        const clickedActionButton = e.target.closest('a[data-action^="itens-"]');

        if (clickedPageLink) {
            const pageValue = clickedPageLink.dataset.page.split('-')[1];
            const newPage = parseInt(pageValue);
            if (!isNaN(newPage) && newPage !== currentPage) {
                currentPage = newPage;
                renderizarListItens();
            }
            return;
        }

        if (clickedActionButton) {
            const action = clickedActionButton.dataset.action;
            let newPage = currentPage;

            if (action === 'itens-prev') {
                if (newPage > 1) newPage--;
            } else if (action === 'itens-next') {
                if (newPage < totalPages) newPage++;
            }

            if (newPage !== currentPage) {
                currentPage = newPage;
                renderizarListItens();
            }
            return;
        }
    };

    const handlePageSizeChange = (e) => {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        renderizarListItens();
    };

    // Remover listeners antigos se existirem
    itensPaginationNav.removeEventListener('click', handlePaginationClick);
    if (pageSizeSelect) {
        pageSizeSelect.removeEventListener('change', handlePageSizeChange);
    }

    // Adicionar novos listeners
    itensPaginationNav.addEventListener('click', handlePaginationClick);
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', handlePageSizeChange);
    }
}

// 7) Bindings de ações nas linhas
function bindRowActions(categorias) {
    // deletar
    document.querySelectorAll('.btn-deletar').forEach(btn => {
        btn.onclick = async () => {
            if (!confirm('Excluir este item?')) return;
            const id = btn.dataset.id;
            const token = localStorage.getItem('token');

            try {
                const resp = await fetch(`/api/almoxarifado/itens/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!resp.ok) {
                    const error = await resp.json();
                    const matches = error.detail?.match(/retirada_item\.DETALH: Chave \(item_id\)=\((\d+)\)/);
                    if (matches && matches[1]) {
                        throw new Error(`Item vinculado à retirada ID: ${matches[1]}. Não pode ser excluído.`);
                    }
                    throw new Error(error.detail || 'Erro ao excluir item');
                }
                renderizarListItens();

            } catch (err) {
                console.error(err);
                if (err.message.includes('retirada_item')) {
                    alert('Item vinculado a uma ou mais retiradas.\n\nPrimeiro exclua as retiradas relacionadas.');
                } else {
                    alert(err.message);
                }
            }
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
                o.value = c.categoria_id;
                o.textContent = `${c.categoria_id} ${c.nome_original.toUpperCase()}`;
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
            form.data_entrada_item.value = item.data_entrada_item?.slice(0, 16) || '';
            form.marca_item.value = item.marca_item || '';

            // 4) guarda id no botão salvar
            const saveBtn = document.getElementById('btn-salvar-editar-item');
            saveBtn.dataset.id = id;

            // 5) exibe modal
            new bootstrap.Modal(
                document.getElementById('modalEditarItem')
            ).show();
        };
    });
}

// 8) salvar edição
document.getElementById('btn-salvar-editar-item')?.addEventListener('click', async e => {
    const id = e.currentTarget.dataset.id;
    if (!id) return alert('ID de edição não definido');

    const form = document.getElementById('form-editar-item');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {
        nome_item: form.nome_item.value.trim(),
        unidade_medida_item: form.unidade_medida_item.value.trim(),
        descricao_item: form.descricao_item.value.trim(),
        quantidade_item: Number(form.quantidade_item.value),
        categoria_id: Number(form.categoria_id.value),
    };

    // Campos opcionais
    if (form.quantidade_minima_item.value.trim())
        data.quantidade_minima_item = Number(form.quantidade_minima_item.value);
    if (form.data_validade_item.value.trim())
        data.data_validade_item = form.data_validade_item.value;
    if (form.data_entrada_item.value.trim())
        data.data_entrada_item = form.data_entrada_item.value;
    if (form.marca_item.value.trim())
        data.marca_item = form.marca_item.value.trim();

    try {
        const token = localStorage.getItem('token');
        const resp = await fetch(`/api/almoxarifado/itens/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.detail || `Erro HTTP ${resp.status}`);
        }

        bootstrap.Modal.getInstance(document.getElementById('modalEditarItem')).hide();
        renderizarListItens();

    } catch (err) {
        console.error(err);
        alert('Erro ao salvar: ' + err.message);
    }
});

// 9) inicialização
const linkListar = document.getElementById('listar-item-link');
if (linkListar) {
    linkListar.addEventListener('click', e => {
        e.preventDefault();
        currentPage = 1;
        pageSize = 10;
        renderizarListItens();
    });
}

// EXPOR A FUNÇÃO GLOBALMENTE
window.renderizarListItens = renderizarListItens;
