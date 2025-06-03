// frontend/static/js/alertasModule.js

import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert, formatDateTime, setNewAlertsFlag, updateNotificationBellUI } from './utils.js';

class AlertasModule {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.currentSearchTerm = null;
        this.currentTipoAlerta = null;
        this.currentTotalPages = 1;

        // Armazenar as referências das funções bound uma única vez
        this._boundHandlePaginationClick   = this._handlePaginationClick.bind(this);
        this._boundHandlePageSizeChange    = this._handlePageSizeChange.bind(this);
        this._boundHandleTableActionClick  = this._handleTableActionClick.bind(this);
        this._boundHandleSearchAlert       = this._handleSearchAlert.bind(this);
        this._boundHandleClearAlertSearch  = this._handleClearAlertSearch.bind(this);
    }

    init() {
        // Nada de especial aqui, os bindings são feitos após a renderização
    }

    async renderAlertsPage() {
        uiService.showLoading();
        try {
            const params = {
                page: this.currentPage,
                size: this.pageSize
            };

            if (this.currentTipoAlerta !== null && this.currentTipoAlerta !== undefined && this.currentTipoAlerta !== '') {
                params.tipo_alerta = this.currentTipoAlerta;
            }

            if (this.currentSearchTerm !== null && this.currentSearchTerm !== undefined && this.currentSearchTerm !== '') {
                params.search_term = this.currentSearchTerm;
            }

            const data = await apiService.get('/alertas/paginated', params);
            this.currentTotalPages = data.total_pages;
            const alerts = data.items;

            const tableHeaders = ['Tipo', 'Mensagem', 'Item ID', 'Data do Alerta', 'Ações'];

            // BLOCO DE FILTROS EM CARD, COM col-12 col-md PARA EMPILHAR ANTES DE ENCOLHER
            const searchAndFilterHtml = `
                <div class="card mb-3">
                  <div class="card-header">Filtros de Busca</div>
                  <div class="card-body">
                    <form id="alertas-search-bar" class="row g-3 mb-0">
                      <div class="col-12 col-md">
                        <label for="alert-search-term" class="form-label">Busca</label>
                        <input
                          type="text"
                          id="alert-search-term"
                          class="form-control"
                          placeholder="Buscar por mensagem ou ID do item"
                          value="${this.currentSearchTerm || ''}"
                        >
                      </div>
                      <div class="col-12 col-md">
                        <label for="alert-type-filter" class="form-label">Tipo de Alerta</label>
                        <select id="alert-type-filter" class="form-select">
                          <option value="">Todos os Tipos</option>
                          <option value="1" ${this.currentTipoAlerta === 1 ? 'selected' : ''}>Estoque Baixo</option>
                          <option value="2" ${this.currentTipoAlerta === 2 ? 'selected' : ''}>Validade Próxima</option>
                        </select>
                      </div>
                      <div class="col-12 col-md d-flex justify-content-end align-items-end">
                        <button id="btn-search-alert" class="btn btn-primary me-2">Buscar</button>
                        <button id="btn-clear-alert-search" class="btn btn-secondary">Limpar</button>
                      </div>
                    </form>
                  </div>
                </div>`;

            const tableHtml = uiService.renderTable(tableHeaders, alerts, {
                noRecordsMessage: "Nenhum alerta encontrado.",
                rowMapper: (alerta) => {
                    const tipoAlertaText = this._getTipoAlertaText(alerta.tipo_alerta);
                    return [
                        tipoAlertaText,
                        alerta.mensagem_alerta,
                        alerta.item_id,
                        formatDateTime(alerta.data_alerta)
                    ];
                },
                actionsHtml: (alerta) => `
                    <div class="d-flex flex-wrap justify-content-center gap-1">
                      <button
                        class="btn btn-sm btn-info btn-acoes btn-ver-item"
                        data-item-id="${alerta.item_id}"
                      >
                        <i class="bi bi-eye"></i> Ver Item
                      </button>
                      ${!alerta.ignorar_novos ? `
                      <button
                        class="btn btn-sm btn-warning btn-acoes btn-ignorar-alerta"
                        data-id="${alerta.alerta_id}"
                      >
                        <i class="bi bi-x-circle"></i> Ignorar Alertas
                      </button>` : `<span class="badge bg-secondary">Ignorado</span>`}
                    </div>
                `
            });

            const paginationHtml = uiService.renderPagination(
                data.page,
                data.total_pages,
                'alerts',               // tipo de paginação para alertas
                'alertsPageSizeSelect', // id do select de pageSize
                this.pageSize
            );

            uiService.renderPage(
                'Lista de Alertas',
                `${searchAndFilterHtml}${tableHtml}${paginationHtml}`
            );

            // Re-anexa os listeners após a renderização do novo conteúdo
            this._bindPageEvents();
            this._bindTableActions();

            // Marcar todos os alertas como visualizados e limpar o sino
            await apiService.markAllAlertsAsViewed();
            setNewAlertsFlag(false);
            updateNotificationBellUI();

        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
            uiService.renderPage(
                'Lista de Alertas',
                `<div class="alert alert-warning">Erro ao carregar alertas: ${error.message || 'Verifique a conexão.'}</div>`
            );
        } finally {
            uiService.hideLoading();
        }
    }

    _bindPageEvents() {
        const alertsPaginationNav    = document.getElementById('alerts-pagination-nav');
        const pageSizeSelect         = document.getElementById('alertsPageSizeSelect');
        const btnSearchAlert         = document.getElementById('btn-search-alert');
        const btnClearAlertSearch    = document.getElementById('btn-clear-alert-search');

        // Remove previous listeners para evitar duplicação
        if (alertsPaginationNav) {
            alertsPaginationNav.removeEventListener('click', this._boundHandlePaginationClick);
        }
        if (pageSizeSelect) {
            pageSizeSelect.removeEventListener('change', this._boundHandlePageSizeChange);
        }
        if (btnSearchAlert) {
            btnSearchAlert.removeEventListener('click', this._boundHandleSearchAlert);
        }
        if (btnClearAlertSearch) {
            btnClearAlertSearch.removeEventListener('click', this._boundHandleClearAlertSearch);
        }

        // Adiciona novos listeners
        if (alertsPaginationNav) {
            alertsPaginationNav.addEventListener('click', this._boundHandlePaginationClick);
        }
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', this._boundHandlePageSizeChange);
        }
        if (btnSearchAlert) {
            btnSearchAlert.addEventListener('click', this._boundHandleSearchAlert);
        }
        if (btnClearAlertSearch) {
            btnClearAlertSearch.addEventListener('click', this._boundHandleClearAlertSearch);
        }
    }

    _handleSearchAlert() {
        this.currentSearchTerm   = document.getElementById('alert-search-term').value.trim();
        const selectedType       = document.getElementById('alert-type-filter').value;
        this.currentTipoAlerta   = selectedType ? parseInt(selectedType) : null;
        this.currentPage         = 1;
        this.renderAlertsPage();
    }

    _handleClearAlertSearch() {
        document.getElementById('alert-search-term').value = '';
        document.getElementById('alert-type-filter').value = '';
        this.currentSearchTerm   = '';
        this.currentTipoAlerta   = null;
        this.currentPage         = 1;
        this.renderAlertsPage();
    }

    _handlePaginationClick(e) {
        e.preventDefault();

        // Links de paginação: data-page="alerts-<número>"
        const clickedPageLink = e.target.closest('a[data-page^="alerts-"]');
        if (clickedPageLink) {
            const pageValue = clickedPageLink.dataset.page.split('-')[1];
            const newPage = parseInt(pageValue);
            if (!isNaN(newPage) && newPage !== this.currentPage) {
                this.currentPage = newPage;
                this.renderAlertsPage();
            }
            return;
        }

        // Ações "Anterior / Próximo": data-action="alerts-prev" ou "alerts-next"
        const clickedActionButton = e.target.closest('a[data-action^="alerts-"]');
        if (clickedActionButton) {
            const action = clickedActionButton.dataset.action;
            let newPage = this.currentPage;

            if (action === 'alerts-prev' && newPage > 1) {
                newPage--;
            } else if (action === 'alerts-next' && newPage < this.currentTotalPages) {
                newPage++;
            }

            if (newPage !== this.currentPage) {
                this.currentPage = newPage;
                this.renderAlertsPage();
            }
            return;
        }
    }

    _handlePageSizeChange(e) {
        this.pageSize = parseInt(e.target.value);
        this.currentPage = 1;
        this.renderAlertsPage();
    }

    _bindTableActions() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            // Remove e adiciona listener único para clique na tabela
            mainContent.removeEventListener('click', this._boundHandleTableActionClick);
            mainContent.addEventListener('click', this._boundHandleTableActionClick);
        }
    }

    async _handleTableActionClick(e) {
        const ignoreButton = e.target.closest('.btn-ignorar-alerta');
        if (ignoreButton) {
            const alertId = parseInt(ignoreButton.dataset.id);
            if (confirm('Tem certeza que deseja ignorar futuros alertas para este item/motivo?')) {
                await this.ignoreAlert(alertId);
            }
            return;
        }

        const viewItemButton = e.target.closest('.btn-ver-item');
        if (viewItemButton) {
            const itemId = parseInt(viewItemButton.dataset.itemId);
            uiService.showLoading();
            try {
                const itemDetails = await apiService.getItemById(itemId);
                uiService.fillModalDetalhesItem(itemDetails);
                uiService.getModalInstance('modalDetalheItem').show();
            } catch (error) {
                console.error("Erro ao carregar detalhes do item:", error);
                showAlert("Não foi possível carregar os detalhes do item.", "danger");
            } finally {
                uiService.hideLoading();
            }
            return; // Evita propagação caso um botão seja clicado
        }
    }

    async ignoreAlert(alertId) {
        uiService.showLoading();
        try {
            await apiService.patch(`/alertas/ignorar/${alertId}`);
            showAlert(
              'Alerta ignorado com sucesso. Futuros alertas para este item/motivo não serão gerados.',
              'success'
            );
            this.renderAlertsPage();
        } catch (error) {
            console.error('Erro ao ignorar alerta', error);
            showAlert(error.message || 'Erro ao ignorar o alerta.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    _getTipoAlertaText(tipoAlertaValue) {
        switch (tipoAlertaValue) {
            case 1:
                return '<span class="badge bg-danger"><i class="bi bi-box-fill"></i> Estoque Baixo</span>';
            case 2:
                return '<span class="badge bg-warning text-dark"><i class="bi bi-calendar-x"></i> Validade Próxima</span>';
            default:
                return 'Desconhecido';
        }
    }
}

export const alertasModule = new AlertasModule();
