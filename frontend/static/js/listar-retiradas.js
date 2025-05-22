// frontend/static/js/listar-retiradas-refatorado.js

// -----------------------------------------------------------------------------
// 0. CONFIGURAÇÃO E CONSTANTES
// -----------------------------------------------------------------------------
const CONFIG = {
    API_BASE_URL: '/api/almoxarifado',
    STATUS_MAP: {
        1: 'PENDENTE',
        2: 'AUTORIZADA',
        3: 'CONCLUÍDA',
        4: 'NEGADA'
    },
    STATUS_MAP_UPDATE: {
        AUTORIZADA: 2,
        NEGADA: 4
    },
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
    MAIN_CONTENT_ID: 'main-content',
    MODAL_DETALHE_ITEM_ID: 'modalDetalheItem',
    MODAL_VER_DETALHES_RETIRADA_ID: 'modalVerDetalhesRetirada',
    MODAL_AUTORIZAR_RETIRADA_ID: 'modalAutorizarRetirada',
};

// -----------------------------------------------------------------------------
// 1. UTILITIES
// -----------------------------------------------------------------------------
const Utils = {
    getToken: () => localStorage.getItem('token'),
    formatDate: (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR') : 'N/A',
    formatDateTime: (dateString) => dateString ? new Date(dateString).toLocaleString('pt-BR') : 'N/A',
    getElement: (selector) => document.querySelector(selector),
    getElements: (selector) => document.querySelectorAll(selector),
    getValue: (selector) => Utils.getElement(selector)?.value || '',
    setValue: (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    },
    setText: (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },
    hideModal: (modalId) => {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();
        }
    },
    showModal: (modalId) => {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            new bootstrap.Modal(modalElement).show();
        }
    }
};

// -----------------------------------------------------------------------------
// 2. API SERVICE
// -----------------------------------------------------------------------------
const ApiService = {
    _fetch: async function(endpoint, options = {}) {
        const token = Utils.getToken();
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        };
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, { ...options, headers });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Erro na requisição: ${response.statusText}` }));
                throw new Error(errorData.detail || `Falha na operação (${response.status})`);
            }
            return response.status === 204 ? null : response.json(); // Handle 204 No Content
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error; // Re-throw para ser tratado pelo chamador
        }
    },

    getUsuarioById: async (id) => {
        if (!id) return 'N/A';
        try {
            const u = await ApiService._fetch(`/usuarios/${id}`);
            return u.nome_usuario;
        } catch { return `#${id}`; }
    },

    getSetorById: async (id) => {
        if (!id) return 'N/A';
        try {
            const s = await ApiService._fetch(`/setores/${id}`);
            return s.nome_setor;
        } catch { return `#${id}`; }
    },

    fetchAllRetiradas: (page, pageSize, filters) => {
        const params = new URLSearchParams({ page, page_size: pageSize });
        for (const key in filters) {
            if (filters[key]) params.append(key, filters[key]);
        }
        const endpoint = Object.values(filters).some(val => val) ?
            `/retiradas/search?${params.toString()}` :
            `/retiradas/paginated?${params.toString()}`;
        return ApiService._fetch(endpoint);
    },

    fetchRetiradasPendentes: (page, pageSize) => {
        const params = new URLSearchParams({ page, page_size: pageSize });
        return ApiService._fetch(`/retiradas/pendentes/paginated?${params.toString()}`);
    },

    updateRetiradaStatus: (id, status, detalheStatus) => {
        return ApiService._fetch(`/retiradas/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status, detalhe_status: detalheStatus })
        });
    },

    buildLookupMaps: async (retiradas) => {
        const userIds = [...new Set(retiradas.map(r => r.usuario_id).filter(Boolean))];
        const setorIds = [...new Set(retiradas.map(r => r.setor_id).filter(Boolean))];

        const usuariosArr = await Promise.all(userIds.map(id => ApiService.getUsuarioById(id).then(name => [id, name])));
        const setoresArr = await Promise.all(setorIds.map(id => ApiService.getSetorById(id).then(name => [id, name])));

        return {
            usuarioMap: Object.fromEntries(usuariosArr),
            setorMap: Object.fromEntries(setoresArr)
        };
    }
};

// -----------------------------------------------------------------------------
// 3. UI MANAGER & TEMPLATES
// -----------------------------------------------------------------------------
const Templates = {
    alert: (message, type) => `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`,

    pagination: (currentPage, totalPages, actionPrefix, pageSize, pageSizeOptions) => {
        if (totalPages <= 0) return '';
        let pageLinks = '';
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (totalPages <= 5) {
            startPage = 1; endPage = totalPages;
        } else {
            if (currentPage <= 3) { startPage = 1; endPage = 5; }
            else if (currentPage + 2 >= totalPages) { startPage = totalPages - 4; endPage = totalPages; }
        }

        if (startPage > 1) {
            pageLinks += `<li class="page-item"><a class="page-link" href="#" data-action="${actionPrefix}-page" data-page="1">1</a></li>`;
            if (startPage > 2) pageLinks += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        for (let i = startPage; i <= endPage; i++) {
            pageLinks += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-action="${actionPrefix}-page" data-page="${i}">${i}</a>
                </li>`;
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pageLinks += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            pageLinks += `<li class="page-item"><a class="page-link" href="#" data-action="${actionPrefix}-page" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        const pageSizeSelectOptions = pageSizeOptions.map(size =>
            `<option value="${size}" ${size === pageSize ? 'selected' : ''}>${size}</option>`
        ).join('');

        return `
            <nav aria-label="Page navigation">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-action="${actionPrefix}-prev">Anterior</a>
                    </li>
                    ${pageLinks}
                    <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-action="${actionPrefix}-next">Próximo</a>
                    </li>
                </ul>
            </nav>
            <div class="d-flex justify-content-center my-2">
                <label class="me-2 align-self-center">Itens por página:</label>
                <select class="form-select w-auto" data-action="${actionPrefix}-pagesize">
                    ${pageSizeSelectOptions}
                </select>
            </div>`;
    },

    itemList: (items, onOpenDetail) => items.map(i => `
        <button type="button" class="list-group-item list-group-item-action item-detail-trigger"
            data-item='${JSON.stringify(i.item)}' data-qtd-retirada="${i.quantidade_retirada}">
            ${i.item.nome_item_original} — ${i.quantidade_retirada}
        </button>
    `).join(''),

    historicoFilters: (filters) => `
        <div class="card mb-4">
            <div class="card-header">Filtros de Busca</div>
            <div class="card-body">
                <form id="form-filter-historico">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label for="filterStatus" class="form-label">Status</label>
                            <select class="form-select" id="filterStatus">
                                <option value="">Todos</option>
                                <option value="PENDENTE" ${filters.status === 'PENDENTE' ? 'selected' : ''}>Pendente</option>
                                <option value="AUTORIZADA" ${filters.status === 'AUTORIZADA' ? 'selected' : ''}>Autorizada</option>
                                <option value="CONCLUIDA" ${filters.status === 'CONCLUIDA' ? 'selected' : ''}>Concluída</option>
                                <option value="NEGADA" ${filters.status === 'NEGADA' ? 'selected' : ''}>Negada</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label for="filterSolicitante" class="form-label">Solicitante</label>
                            <input type="text" class="form-control" id="filterSolicitante" value="${filters.solicitante || ''}">
                        </div>
                        <div class="col-md-3">
                            <label for="filterStartDate" class="form-label">Data Inicial</label>
                            <input type="date" class="form-control" id="filterStartDate" value="${filters.start_date || ''}">
                        </div>
                        <div class="col-md-3">
                            <label for="filterEndDate" class="form-label">Data Final</label>
                            <input type="date" class="form-control" id="filterEndDate" value="${filters.end_date || ''}">
                        </div>
                        <div class="col-12">
                            <button type="submit" class="btn btn-primary">Buscar</button>
                            <button type="button" class="btn btn-secondary ms-2" id="btn-clear-filters">Limpar Filtros</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>`,

    table: (headers, rowsHtml, noDataMessage = "Nenhum item encontrado.") => `
        <div class="table-responsive">
            <table class="table table-bordered table-striped">
                <thead class="table-secondary">
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rowsHtml || `<tr><td colspan="${headers.length}" class="text-center">${noDataMessage}</td></tr>`}
                </tbody>
            </table>
        </div>`
};

const UIManager = {
    showAlert: (message, type = 'success') => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = Templates.alert(message, type);
        const mainContent = document.getElementById(CONFIG.MAIN_CONTENT_ID);
        if (mainContent) {
            mainContent.prepend(wrapper.firstChild);
        } else {
            console.error(`Elemento '${CONFIG.MAIN_CONTENT_ID}' não encontrado para exibir alerta.`);
        }
        // Auto-remove alert after 5 seconds
        setTimeout(() => {
            const alertElement = mainContent?.querySelector('.alert');
            if (alertElement) {
                const bsAlert = bootstrap.Alert.getOrCreateInstance(alertElement);
                if(bsAlert) bsAlert.close();
            }
        }, 5000);
    },

    render: (containerId, html) => {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = html;
        else console.error(`Container #${containerId} não encontrado para renderização.`);
    },

    openItemDetailModal: (item, qtdRetirada) => {
        Utils.setText('itemNome', item.nome_item_original);
        Utils.setText('itemEstoque', item.quantidade_item);
        Utils.setText('itemQtdRetirada', qtdRetirada);
        Utils.setText('itemEstoqueMin', item.quantidade_minima_item);
        Utils.setText('itemValidade', Utils.formatDate(item.data_validade_item));
        Utils.showModal(CONFIG.MODAL_DETALHE_ITEM_ID);
    },

    renderItemListInModal: (containerId, itens) => {
        const html = Templates.itemList(itens);
        UIManager.render(containerId, html);
        Utils.getElements(`#${containerId} .item-detail-trigger`).forEach(btn => {
            btn.onclick = () => {
                const item = JSON.parse(btn.dataset.item);
                const qtdRetirada = btn.dataset.qtdRetirada;
                UIManager.openItemDetailModal(item, qtdRetirada);
            };
        });
    },

    fillDetalhesRetiradaModal: (r) => {
        Utils.setValue('detalheRetiradaId', r.retirada_id);
        Utils.setValue('detalheStatus', CONFIG.STATUS_MAP[r.status]);
        Utils.setValue('detalheSetor', r.setor_nome || '—');
        Utils.setValue('detalheUsuario', r.usuario_nome || '—');
        Utils.setValue('detalheSolicitadoPor', r.solicitado_localmente_por || '—');
        Utils.setValue('detalheAutorizadoPor', r.autorizado_por || '—');
        Utils.setValue('detalheData', Utils.formatDateTime(r.data_solicitacao));
        Utils.setValue('detalheJustificativa', r.justificativa || '');
        Utils.setValue('detalheStatusDesc', r.detalhe_status || '—');
        UIManager.renderItemListInModal('detalheItens', r.itens);
        Utils.showModal(CONFIG.MODAL_VER_DETALHES_RETIRADA_ID);
    },

    fillAutorizarRetiradaModal: (r) => {
        Utils.setValue('autorizarRetiradaId', r.retirada_id);
        Utils.setValue('autorizarSetor', r.setor_nome || '');
        Utils.setValue('autorizarUsuario', r.usuario_nome);
        Utils.setValue('autorizarJustificativa', r.justificativa || '');
        Utils.setValue('autorizarData', Utils.formatDateTime(r.data_solicitacao));
        Utils.setValue('autorizarDetalheStatus', ''); // Limpa o campo
        UIManager.renderItemListInModal('autorizarItens', r.itens);

        Utils.getElement('#btn-confirmar-autorizar-retirada').dataset.id = r.retirada_id;
        Utils.getElement('#btn-confirmar-negar-retirada').dataset.id = r.retirada_id;
        Utils.showModal(CONFIG.MODAL_AUTORIZAR_RETIRADA_ID);
    }
};

// -----------------------------------------------------------------------------
// 4. STATE MANAGER
// -----------------------------------------------------------------------------
const StateManager = {
    historico: {
        items: [],
        currentPage: 1,
        totalPages: 1,
        pageSize: CONFIG.DEFAULT_PAGE_SIZE,
        filters: {},
        isLoading: false,
    },
    pendentes: {
        items: [],
        currentPage: 1,
        totalPages: 1,
        pageSize: CONFIG.DEFAULT_PAGE_SIZE,
        isLoading: false,
    },
    // Funções para atualizar o estado de forma segura poderiam ser adicionadas aqui
    // Ex: updateHistoricoState(newData), updatePendentesState(newData)
};

// -----------------------------------------------------------------------------
// 5. CONTROLLERS (Lógica de cada View)
// -----------------------------------------------------------------------------
const HistoricoController = {
    async loadAndRender(page = 1, filters = StateManager.historico.filters, pageSize = StateManager.historico.pageSize) {
        if (StateManager.historico.isLoading) return;
        StateManager.historico.isLoading = true;
        console.log(`Historico: Carregando page=${page}, pageSize=${pageSize}, filters:`, filters);

        try {
            const data = await ApiService.fetchAllRetiradas(page, pageSize, filters);
            const { usuarioMap } = await ApiService.buildLookupMaps(data.items);

            StateManager.historico.items = data.items.map(r => ({
                ...r,
                usuario_nome: r.solicitado_localmente_por || usuarioMap[r.usuario_id] || 'N/A'
            }));
            StateManager.historico.currentPage = data.current_page;
            StateManager.historico.totalPages = data.total_pages;
            StateManager.historico.pageSize = pageSize; // O backend pode retornar um page_size diferente do solicitado
            StateManager.historico.filters = filters;

            this.renderView();
        } catch (error) {
            UIManager.showAlert(error.message || 'Falha ao carregar histórico.', 'danger');
        } finally {
            StateManager.historico.isLoading = false;
        }
    },

    renderView: () => {
        const { items, currentPage, totalPages, pageSize, filters } = StateManager.historico;
        const tableHeaders = ['ID', 'Usuário', 'Data', 'Status', 'Ações'];
        const tableRows = items.map(r => `
            <tr>
                <td>${r.retirada_id}</td>
                <td>${r.usuario_nome}</td>
                <td>${Utils.formatDate(r.data_solicitacao)}</td>
                <td>${CONFIG.STATUS_MAP[r.status]}</td>
                <td>
                    <button class="btn btn-sm btn-primary btn-detalhes-retirada" data-id="${r.retirada_id}">
                        Ver detalhes
                    </button>
                </td>
            </tr>
        `).join('');

        const mainHtml = `
            <h3 class="mb-3">Histórico de Retiradas</h3>
            ${Templates.historicoFilters(filters)}
            ${Templates.table(tableHeaders, tableRows, "Nenhum histórico de retirada encontrado.")}
            ${Templates.pagination(currentPage, totalPages, 'historico', pageSize, CONFIG.PAGE_SIZE_OPTIONS)}
        `;
        UIManager.render(CONFIG.MAIN_CONTENT_ID, mainHtml);
        HistoricoController.bindEvents();
    },

    bindEvents: () => {
        // Filtros
        const form = Utils.getElement('#form-filter-historico');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const newFilters = {
                    status: Utils.getValue('#filterStatus'),
                    solicitante: Utils.getValue('#filterSolicitante'),
                    start_date: Utils.getValue('#filterStartDate'),
                    end_date: Utils.getValue('#filterEndDate'),
                };
                HistoricoController.loadAndRender(1, newFilters, StateManager.historico.pageSize);
            };
        }
        const btnClear = Utils.getElement('#btn-clear-filters');
        if (btnClear) {
            btnClear.onclick = () => {
                Utils.getElement('#form-filter-historico').reset(); // Limpa o formulário visualmente
                HistoricoController.loadAndRender(1, {}, StateManager.historico.pageSize);
            };
        }

        // Paginação
        Utils.getElements('[data-action^="historico-"]').forEach(el => {
            el.onclick = (e) => {
                e.preventDefault();
                const action = e.currentTarget.dataset.action;
                let newPage = StateManager.historico.currentPage;
                let newPageSize = StateManager.historico.pageSize;

                if (action === 'historico-prev') newPage--;
                else if (action === 'historico-next') newPage++;
                else if (action === 'historico-page') newPage = parseInt(e.currentTarget.dataset.page);
                else if (action === 'historico-pagesize') {
                    newPageSize = parseInt(e.currentTarget.value);
                    newPage = 1; // Reset to first page on page size change
                }
                HistoricoController.loadAndRender(newPage, StateManager.historico.filters, newPageSize);
            };
        });

        // Detalhes da Retirada
        Utils.getElements('.btn-detalhes-retirada').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.dataset.id);
                const retirada = StateManager.historico.items.find(r => r.retirada_id === id);
                if (retirada) UIManager.fillDetalhesRetiradaModal(retirada);
            };
        });
    }
};

const PendentesController = {
    async loadAndRender(page = 1, pageSize = StateManager.pendentes.pageSize) {
        if (StateManager.pendentes.isLoading) return;
        StateManager.pendentes.isLoading = true;
        console.log(`Pendentes: Carregando page=${page}, pageSize=${pageSize}`);

        try {
            const data = await ApiService.fetchRetiradasPendentes(page, pageSize);
            const { usuarioMap, setorMap } = await ApiService.buildLookupMaps(data.items);

            StateManager.pendentes.items = data.items.map(r => ({
                ...r,
                usuario_nome: r.solicitado_localmente_por || usuarioMap[r.usuario_id] || 'N/A',
                setor_nome: setorMap[r.setor_id] || 'N/A'
            }));
            StateManager.pendentes.currentPage = data.current_page;
            StateManager.pendentes.totalPages = data.total_pages;
            StateManager.pendentes.pageSize = pageSize;

            this.renderView();
        } catch (error) {
            UIManager.showAlert(error.message || 'Falha ao carregar retiradas pendentes.', 'danger');
        } finally {
            StateManager.pendentes.isLoading = false;
        }
    },

    renderView: () => {
        const { items, currentPage, totalPages, pageSize } = StateManager.pendentes;
        const tableHeaders = ['ID', 'Usuário', 'Setor', 'Data', 'Ações'];
        const tableRows = items.map(r => `
            <tr>
                <td>${r.retirada_id}</td>
                <td>${r.usuario_nome}</td>
                <td>${r.setor_nome}</td>
                <td>${Utils.formatDate(r.data_solicitacao)}</td>
                <td>
                    <button class="btn btn-sm btn-success btn-autorizar-negar-trigger" data-id="${r.retirada_id}">
                        Autorizar/Negar
                    </button>
                    <button class="btn btn-sm btn-info btn-detalhes-retirada" data-id="${r.retirada_id}">
                        Ver detalhes
                    </button>
                </td>
            </tr>
        `).join('');

        const mainHtml = `
            <h3 class="mb-3">Retiradas Pendentes</h3>
            ${Templates.table(tableHeaders, tableRows, "Nenhuma retirada pendente encontrada.")}
            ${Templates.pagination(currentPage, totalPages, 'pendentes', pageSize, CONFIG.PAGE_SIZE_OPTIONS)}
        `;
        UIManager.render(CONFIG.MAIN_CONTENT_ID, mainHtml);
        PendentesController.bindEvents();
    },

    bindEvents: () => {
        // Paginação
        Utils.getElements('[data-action^="pendentes-"]').forEach(el => {
            el.onclick = (e) => {
                e.preventDefault();
                const action = e.currentTarget.dataset.action;
                let newPage = StateManager.pendentes.currentPage;
                let newPageSize = StateManager.pendentes.pageSize;

                if (action === 'pendentes-prev') newPage--;
                else if (action === 'pendentes-next') newPage++;
                else if (action === 'pendentes-page') newPage = parseInt(e.currentTarget.dataset.page);
                else if (action === 'pendentes-pagesize') {
                    newPageSize = parseInt(e.currentTarget.value);
                    newPage = 1;
                }
                PendentesController.loadAndRender(newPage, newPageSize);
            };
        });

        // Detalhes da Retirada
        Utils.getElements('.btn-detalhes-retirada').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.dataset.id);
                // Tenta encontrar em pendentes primeiro, depois em histórico (caso o modal seja reutilizado em outros contextos)
                const retirada = StateManager.pendentes.items.find(r => r.retirada_id === id) || StateManager.historico.items.find(r => r.retirada_id === id);
                if (retirada) UIManager.fillDetalhesRetiradaModal(retirada);
            };
        });

        // Abrir Modal de Autorizar/Negar
        Utils.getElements('.btn-autorizar-negar-trigger').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.dataset.id);
                const retirada = StateManager.pendentes.items.find(r => r.retirada_id === id);
                if (retirada) UIManager.fillAutorizarRetiradaModal(retirada);
            };
        });
    },

    handleAutorizarNegar: async (id, actionType) => {
        const detalheStatus = Utils.getValue('autorizarDetalheStatus').trim();
        const status = (actionType === 'autorizar') ? CONFIG.STATUS_MAP_UPDATE.AUTORIZADA : CONFIG.STATUS_MAP_UPDATE.NEGADA;

        if (actionType === 'negar' && !detalheStatus) {
            UIManager.showAlert('O detalhe do status (justificativa da negação) é obrigatório ao negar.', 'warning');
            Utils.getElement('#autorizarDetalheStatus').focus();
            return;
        }

        try {
            await ApiService.updateRetiradaStatus(id, status, detalheStatus);
            UIManager.showAlert(`Retirada ${actionType === 'autorizar' ? 'autorizada' : 'negada'} com sucesso!`, 'success');
            Utils.hideModal(CONFIG.MODAL_AUTORIZAR_RETIRADA_ID);
            PendentesController.loadAndRender(StateManager.pendentes.currentPage, StateManager.pendentes.pageSize); // Recarrega a lista
        } catch (error) {
            UIManager.showAlert(error.message || `Erro ao ${actionType} retirada.`, 'danger');
        }
    }
};

// -----------------------------------------------------------------------------
// 6. INICIALIZAÇÃO E EVENTOS GLOBAIS
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Navegação principal
    Utils.getElement('#listar-retiradas-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        HistoricoController.loadAndRender(1, {}, StateManager.historico.pageSize);
    });
    Utils.getElement('#listar-retiradas-pendentes-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        PendentesController.loadAndRender(1, StateManager.pendentes.pageSize);
    });
     Utils.getElement('#listar-retiradas-pendentes-quick')?.addEventListener('click', (e) => {
        e.preventDefault();
        PendentesController.loadAndRender(1, StateManager.pendentes.pageSize);
    });

    // Ações do Modal de Autorizar/Negar
    Utils.getElement('#btn-confirmar-autorizar-retirada')?.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        PendentesController.handleAutorizarNegar(id, 'autorizar');
    });
    Utils.getElement('#btn-confirmar-negar-retirada')?.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        PendentesController.handleAutorizarNegar(id, 'negar');
    });

    // Carregar a view padrão (opcional, ex: histórico)
    // HistoricoController.loadAndRender();
    // Ou, se preferir, pode deixar a página inicial vazia ou com uma mensagem.
    // Se houver um parâmetro na URL para indicar a view, pode ser tratado aqui.

    // Exemplo: se a URL tiver #historico, carrega histórico
    if (window.location.hash === '#historico') {
        HistoricoController.loadAndRender();
    } else if (window.location.hash === '#pendentes') {
        PendentesController.loadAndRender();
    } else {
        // Default view or leave empty
        // HistoricoController.loadAndRender(); // ou renderPendentesRetiradas();
    }
});