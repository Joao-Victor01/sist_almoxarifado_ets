// frontend/static/js/listar-itens.js

// Estado de paginação
let currentPage = 1;
let pageSize = 10;
const pageSizeOptions = [5, 10, 25, 50, 100];

// guarda estado da última busca
let searchNome = '';
let searchCategoriaDisplay = ''; // Usado para exibir no input e enviar ao backend
let allCategoriesCache = []; // Cache para todas as categorias

// 1) API de categorias
async function carregarCategorias() {
    // Retorna do cache se já carregado, evitando chamadas repetidas à API
    if (allCategoriesCache.length > 0) {
        return allCategoriesCache;
    }
    const token = localStorage.getItem('token');
    const resp = await fetch("/api/almoxarifado/categorias", {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    if (resp.status === 401) {
        window.location = '/'; // Redireciona para o login em caso de não autorizado
        return [];
    }
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    allCategoriesCache = data; // Armazena no cache
    return data;
}

//2) API de itens
async function carregarListItens(page = currentPage, size = pageSize) {
    const token = localStorage.getItem('token');
    const resp = await fetch(`/api/almoxarifado/itens/paginated?page=${page}&size=${size}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    if (resp.status === 401) {
        window.location = '/'; // Redireciona para o login em caso de não autorizado
        return { items: [], total_pages: 0 };
    }
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    const data = await resp.json();
    // Ordena itens alfabeticamente por nome para exibição consistente
    data.items.sort((a, b) => a.nome_item_original.localeCompare(b.nome_item_original));
    return data;
}

async function buscarItens(nome, categoria, page = currentPage, size = pageSize) {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ page, size });
    if (nome) params.append('nome', nome);
    // A API de backend já espera o nome da categoria como string para filtragem
    if (categoria) params.append('categoria', categoria);

    const resp = await fetch(`/api/almoxarifado/itens/buscar?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    if (resp.status === 401) {
        window.location = '/'; // Redireciona para o login em caso de não autorizado
        return { items: [], total_pages: 0 };
    }
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    const data = await resp.json();
    // Ordena itens da busca para exibição consistente
    data.items.sort((a, b) => a.nome_item_original.localeCompare(b.nome_item_original));
    return data;
}

//3) Templates HTML
// Função para criar a barra de busca HTML com o novo campo de categoria
function criarSearchBar() {
    return `
        <h3 class="mb-3">Lista de Itens</h3>
        <div class="card mb-3">
            <div class="card-header">Filtros de Busca</div>
            <div class="card-body">
                <form id="search-bar" class="row g-3 mb-0">
                    <div class="col-12 col-md">
                        <label for="search-nome" class="form-label">Nome</label>
                        <input type="text" id="search-nome" class="form-control" placeholder="Buscar por nome" value="${searchNome}">
                    </div>
                    <div class="col-12 col-md position-relative">
                        <label for="search-categoria-input" class="form-label">Categoria</label>
                        <input type="text" id="search-categoria-input" class="form-control" placeholder="Buscar ou selecionar categoria..." autocomplete="off" value="${searchCategoriaDisplay}">
                        <div id="categoria-suggestions" class="list-group position-absolute w-100 shadow-lg" style="z-index: 1000; display: none; max-height: 200px; overflow-y: auto;">
                            <!-- As sugestões de categoria serão inseridas aqui via JavaScript -->
                        </div>
                    </div>
                    <div class="col-12 col-md d-flex justify-content-end align-items-end">
                        <button id="btn-search" class="btn btn-primary me-2">Buscar</button>
                        <button id="btn-clear-search" class="btn btn-secondary">Limpar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

//  Adicionado parâmetro isReadOnly para controle de exibição de ações
function criarTabelaltens(itens, categoryMap, isReadOnly) {
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
                        ${!isReadOnly ? `<th>Ações</th>` : ''}
                    </tr>
                </thead>
                <tbody>
    `;

    itens.forEach(item => {
        const cat = categoryMap[item.categoria_id];
        // Exibe ID e nome original da categoria, se disponível
        const label = cat ? `${item.categoria_id} ${cat.nome_original.toUpperCase()}` : item.categoria_id;
        // Formatação de datas para exibição
        const dataValidade = item.data_validade_item ? new Date(item.data_validade_item).toLocaleDateString('pt-BR') : '-';
        const dataEntrada = item.data_entrada_item ? new Date(item.data_entrada_item).toLocaleDateString('pt-BR') : '-';

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
                ${!isReadOnly ? `
                    <td class="text-center">
                        <div class="d-flex flex-wrap justify-content-center gap-1">
                            <button class="btn btn-sm btn-primary btn-acoes btn-editar" data-id="${item.item_id}">
                                <i class="bi bi-pencil-square"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-danger btn-acoes btn-deletar" data-id="${item.item_id}">
                                <i class="bi bi-trash"></i> Deletar
                            </button>
                        </div>
                    </td>
                ` : ''}
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

// Função para criar os controles de paginação
function criarControlesPaginacao(totalPages) {
    let pageLinks = '';
    // Define o intervalo de páginas a serem exibidas na paginação
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    // Ajusta o intervalo para garantir que sempre 5 páginas sejam exibidas, se possível
    if (totalPages <= 5) {
        startPage = 1;
        endPage = totalPages;
    } else {
        if (currentPage <= 3) {
            startPage = 1;
            endPage = 5;
        } else if (currentPage + 2 > totalPages) {
            startPage = totalPages - 4;
            endPage = totalPages;
        }
    }

    // Adiciona link para a primeira página e reticências, se necessário
    if (startPage > 1) {
        pageLinks += `<li class="page-item"><a class="page-link" href="#" data-page="itens-1">1</a></li>`;
        if (startPage > 2) {
            pageLinks += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Adiciona os links para as páginas dentro do intervalo definido
    for (let i = startPage; i <= endPage; i++) {
        pageLinks += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="itens-${i}">${i}</a>
            </li>
        `;
    }

    // Adiciona link para a última página e reticências, se necessário
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pageLinks += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        pageLinks += `<li class="page-item"><a class="page-link" href="#" data-page="itens-${totalPages}">${totalPages}</a></li>`;
    }

    // Cria as opções para o select de tamanho de página
    const pageSizeSelectOptions = pageSizeOptions.map(opt => `
        <option value="${opt}" ${opt === pageSize ? 'selected' : ''}>${opt}</option>
    `).join('');

    return `
        <nav aria-label="Page navigation" id="itens-pagination-nav">
            <ul class="pagination justify-content-center">
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-action="itens-prev">Anterior</a>
                </li>
                ${pageLinks}
                <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-action="itens-next">Próximo</a>
                </li>
            </ul>
        </nav>
        <div class="d-flex justify-content-center my-2">
            <label class="me-2 align-self-center">Itens por página: </label>
            <select id="page-size-select" class="form-select w-auto">
                ${pageSizeSelectOptions}
            </select>
        </div>
    `;
}


//4) Carrega e renderiza tudo
//  Adicionado parâmetro isReadOnly
async function renderizarListItens(isReadOnly = false) {
    try {
        // Busca itens com base nos termos de busca ou lista todos paginados
        const data = (searchNome || searchCategoriaDisplay)
            ? await buscarItens(searchNome, searchCategoriaDisplay, currentPage, pageSize)
            : await carregarListItens(currentPage, pageSize);

        // Carrega (ou usa do cache) as categorias para mapeamento
        const categorias = await carregarCategorias();

        const categoryMap = {};
        categorias.forEach(c => categoryMap[c.categoria_id] = c);

        const main = document.getElementById('main-content');
        if (main) {
            // Renderiza a barra de busca, tabela de itens e controles de paginação
            main.innerHTML = `
                ${criarSearchBar()}
                ${criarTabelaltens(data.items, categoryMap, isReadOnly)}
                ${criarControlesPaginacao(data.total_pages)}
            `;

            // Vincula os eventos aos elementos recém-renderizados
            bindSearch();
            bindPagination(data.total_pages);

            if (!isReadOnly) {
                bindRowActions(categorias); // Vincula ações de linha apenas se não for modo leitura
            }
            bindCategorySearchDropdown(); // Vincula a lógica do dropdown de categoria
        } else {
            console.error("Elemento 'main-content' não encontrado em listar-itens.js.");
        }
    } catch (err) {
        console.error("Erro ao renderizar lista de itens:", err);
        const main = document.getElementById('main-content');
        if (main) {
            main.innerHTML = `<div class="alert alert-warning">Erro: ${err.message}</div>`;
        }
    }
}

// --- Funções para manipulação do campo de busca de categoria com sugestões ---

// Manipula a entrada do usuário e o foco no campo de busca de categoria
async function _handleCategoryInput(event) {
    const input = event.target;
    const searchTerm = input.value.trim().toLowerCase();
    const suggestionsContainer = document.getElementById('categoria-suggestions');

    // Se o evento é 'focus' ou o campo está vazio, exibe as primeiras categorias
    if (event.type === 'focus' || searchTerm.length === 0) {
        // Exibe as primeiras 10 categorias, ou todas se houver poucas
        _renderCategorySuggestions(allCategoriesCache.slice(0, 10));
        _showCategorySuggestions();
    } else if (searchTerm.length >= 3) { // Começa a filtrar após 3 caracteres
        const filtered = allCategoriesCache.filter(cat =>
            cat.nome_original.toLowerCase().includes(searchTerm)
        );
        _renderCategorySuggestions(filtered);
        _showCategorySuggestions();
    } else {
        _hideCategorySuggestions(); // Esconde se menos de 3 caracteres e não está focado
    }
}

// Renderiza as sugestões de categoria no contêiner
function _renderCategorySuggestions(categories) {
    const suggestionsContainer = document.getElementById('categoria-suggestions');
    suggestionsContainer.innerHTML = ''; // Limpa sugestões anteriores

    if (categories.length === 0) {
        suggestionsContainer.innerHTML = '<div class="list-group-item text-muted">Nenhuma categoria encontrada.</div>';
        return;
    }

    categories.forEach(cat => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'list-group-item list-group-item-action';
        item.textContent = cat.nome_original;
        // Armazena o nome original no dataset para fácil acesso ao selecionar
        item.dataset.categoryName = cat.nome_original;

        item.addEventListener('click', (e) => {
            e.preventDefault(); // Previne o comportamento padrão do botão
            _selectCategorySuggestion(item.dataset.categoryName);
            _hideCategorySuggestions(); // Esconde o contêiner de sugestões
        });
        suggestionsContainer.appendChild(item);
    });
}

// Atualiza o campo de input e a variável de estado ao selecionar uma sugestão
function _selectCategorySuggestion(categoryName) {
    const input = document.getElementById('search-categoria-input');
    input.value = categoryName;
    searchCategoriaDisplay = categoryName; // Atualiza a variável de estado
}

// Esconde o contêiner de sugestões
function _hideCategorySuggestions() {
    document.getElementById('categoria-suggestions').style.display = 'none';
}

// Mostra o contêiner de sugestões
function _showCategorySuggestions() {
    document.getElementById('categoria-suggestions').style.display = 'block';
}

// --- Fim das funções de manipulação do campo de busca de categoria ---


// 5) Bindings de busca
// Vincula eventos aos botões de busca e limpeza
function bindSearch() {
    document.getElementById('btn-search')?.addEventListener('click', e => {
        e.preventDefault();
        const nome = document.getElementById('search-nome').value.trim();
        // Pega o valor do novo input de categoria
        const categoria = document.getElementById('search-categoria-input').value.trim();

        searchNome = nome;
        searchCategoriaDisplay = categoria; // Atualiza o estado da categoria
        currentPage = 1; // Reseta para a primeira página
        renderizarListItens(); // Renderiza a lista com os novos filtros
    });

    document.getElementById('btn-clear-search')?.addEventListener('click', e => {
        e.preventDefault();
        searchNome = '';
        searchCategoriaDisplay = ''; // Limpa o estado da categoria
        currentPage = 1;
        pageSize = 10;
        renderizarListItens(); // Renderiza a lista sem filtros
    });
}

// NEW: Binding para o dropdown de busca de categoria
// Vincula os eventos de foco, input e blur ao campo de busca de categoria
function bindCategorySearchDropdown() {
    const searchCategoriaInput = document.getElementById('search-categoria-input');
    if (searchCategoriaInput) {
        // Remove listeners antigos para evitar duplicação em re-renderizações
        searchCategoriaInput.removeEventListener('focus', _handleCategoryInput);
        searchCategoriaInput.removeEventListener('input', _handleCategoryInput);
        searchCategoriaInput.removeEventListener('blur', () => setTimeout(_hideCategorySuggestions, 100));

        // Adiciona novos listeners
        searchCategoriaInput.addEventListener('focus', _handleCategoryInput);
        searchCategoriaInput.addEventListener('input', _handleCategoryInput);
        // Usa um pequeno timeout para permitir que o clique em uma sugestão seja processado
        // antes que o evento 'blur' esconda a lista de sugestões.
        searchCategoriaInput.addEventListener('blur', () => setTimeout(_hideCategorySuggestions, 100));
    }
}


//6) Bindings de paginação
// Vincula eventos aos controles de paginação
function bindPagination(totalPages) {
    const itensPaginationNav = document.getElementById('itens-pagination-nav');
    const pageSizeSelect = document.getElementById('page-size-select');

    if (!itensPaginationNav) {
        console.warn("Elemento 'itens-pagination-nav' não encontrado para bindPagination.");
        return;
    }

    const handlePaginationClick = (e) => {
        e.preventDefault();
        const clickedPageLink = e.target.closest('a[data-page^="itens-"]');
        const clickedActionButton = e.target.closest('a[data-action^="itens-"]');

        if (clickedPageLink) {
            const pageValue = clickedPageLink.dataset.page.split('-')[1];
            const newPage = parseInt(pageValue);
            if (!isNaN(newPage) && newPage !== currentPage) {
                currentPage = newPage;
                renderizarListItens(); // Re-renderiza a lista para a nova página
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
                renderizarListItens(); // Re-renderiza a lista para a nova página
                return;
            }
        }
    };

    const handlePageSizeChange = (e) => {
        pageSize = parseInt(e.target.value);
        currentPage = 1; // Reseta para a primeira página ao mudar o tamanho da página
        renderizarListItens(); // Re-renderiza a lista
    };

    // Remove e adiciona listeners para evitar duplicação
    itensPaginationNav.removeEventListener('click', handlePaginationClick);
    if (pageSizeSelect) {
        pageSizeSelect.removeEventListener('change', handlePageSizeChange);
    }

    itensPaginationNav.addEventListener('click', handlePaginationClick);
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', handlePageSizeChange);
    }
}

//7) Bindings de ações nas linhas
// Vincula eventos aos botões de editar e deletar em cada linha da tabela
function bindRowActions(categorias) {
    // Listener para o botão de deletar item
    document.querySelectorAll('.btn-deletar').forEach(btn => {
        btn.onclick = async () => {
            if (!confirm('Excluir este item?')) return; // Confirmação antes de deletar
            const id = btn.dataset.id;
            const token = localStorage.getItem('token');
            try {
                const resp = await fetch(`/api/almoxarifado/itens/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!resp.ok) {
                    const error = await resp.json();
                    // Verifica se o erro é devido a vínculo com retirada_item
                    const matches = error.detail?.match(/retirada_item\.DETALH: Chave \(item_id\)=\((\d+)\)/);
                    if (matches && matches[1]) {
                        throw new Error(`Item vinculado à retirada ID: ${matches[1]}. Não pode ser excluído.`);
                    }
                    throw new Error(error.detail || 'Erro ao excluir item');
                }
                renderizarListItens(); // Re-renderiza a lista após exclusão bem-sucedida
            } catch (err) {
                console.error("Erro ao deletar item:", err);
                if (err.message.includes('retirada_item')) {
                    alert('Item vinculado a uma ou mais retiradas.\n\nPrimeiro exclua as retiradas relacionadas.');
                } else {
                    alert(err.message);
                }
            }
        };
    });

    // Listener para o botão de editar item
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.onclick = async e => {
            e.preventDefault();
            const id = btn.dataset.id;
            const token = localStorage.getItem('token');

            // 1) Busca os detalhes do item a ser editado
            const respItem = await fetch(`/api/almoxarifado/itens/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!respItem.ok) return alert('Erro ao carregar item');
            const item = await respItem.json();

            // 2) Popula o select de categorias no modal de edição
            const sel = document.getElementById('edit-categoria_id');
            sel.innerHTML = `<option value="" disabled>Carregando...</option>`;
            categorias.forEach(c => {
                const o = document.createElement('option');
                o.value = c.categoria_id;
                o.textContent = `${c.categoria_id} ${c.nome_original.toUpperCase()}`;
                sel.append(o);
            });
            sel.value = item.categoria_id; // Pré-seleciona a categoria atual do item

            // 3) Preenche os demais campos do formulário de edição
            const form = document.getElementById('form-editar-item');
            form.nome_item.value = item.nome_item_original;
            form.unidade_medida_item.value = item.unidade_medida_item;
            form.descricao_item.value = item.descricao_item;
            form.quantidade_item.value = item.quantidade_item;
            form.quantidade_minima_item.value = item.quantidade_minima_item || '';
            // Formata datas para o formato de input (YYYY-MM-DD ou YYYY-MM-DDTHH:MM)
            form.data_validade_item.value = item.data_validade_item?.split('T')[0] || '';
            form.data_entrada_item.value = item.data_entrada_item?.slice(0, 16) || '';
            form.marca_item.value = item.marca_item || '';

            // 4) Armazena o ID do item no botão de salvar para uso posterior
            const saveBtn = document.getElementById('btn-salvar-editar-item');
            saveBtn.dataset.id = id;

            // 5) Exibe o modal de edição
            new bootstrap.Modal(
                document.getElementById('modalEditarItem')
            ).show();
        };
    });
}

//8) salvar edição
// Listener para o botão de salvar alterações no modal de edição de item
document.getElementById('btn-salvar-editar-item')?.addEventListener('click', async e => {
    const id = e.currentTarget.dataset.id;
    if (!id) return alert('ID de edição não definido');

    const form = document.getElementById('form-editar-item');
    if (!form.checkValidity()) {
        form.reportValidity(); // Exibe validação do formulário se inválido
        return;
    }

    // Coleta os dados do formulário
    const data = {
        nome_item: form.nome_item.value.trim(),
        unidade_medida_item: form.unidade_medida_item.value.trim(),
        descricao_item: form.descricao_item.value.trim(),
        quantidade_item: Number(form.quantidade_item.value),
        categoria_id: Number(form.categoria_id.value),
    };

    // Adiciona campos opcionais se preenchidos
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
            method: 'PUT', // Usa PUT para atualizar o item
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.detail || `Erro HTTP: ${resp.status}`);
        }
        // Esconde o modal e re-renderiza a lista de itens
        bootstrap.Modal.getInstance(document.getElementById('modalEditarItem')).hide();
        renderizarListItens();
    } catch (err) {
        console.error("Erro ao salvar item:", err);
        alert('Erro ao salvar: ' + err.message);
    }
});

// 9) inicialização
// Listener para o link de navegação que lista os itens
const linkListar = document.getElementById('listar-item-link');
if (linkListar) {
    linkListar.addEventListener('click', e => {
        e.preventDefault();
        currentPage = 1;
        pageSize = 10;
        renderizarListItens(); // Chama a renderização inicial da lista
    });
}

// EXPOR A FUNÇÃO GLOBALMENTE para que outros módulos possam chamá-la
window.renderizarListItens = renderizarListItens;
