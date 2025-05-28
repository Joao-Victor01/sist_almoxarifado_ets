// frontend/static/js/alertasModule.js

import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert, formatDateTime, setNewAlertsFlag } from './utils.js'; // Importar setNewAlertsFlag
import estadoGlobal from './estadoGlobal.js'; // For PAGE_SIZE_OPTIONS

class AlertasModule {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10; // Tamanho de página padrão para alertas
        this.currentSearchTerm = ''; // Para o filtro de busca por mensagem/item_id
        this.currentTipoAlerta = null; // Para o filtro por tipo de alerta
    }

    init() {
        // Inicialização: a renderização da página de alertas já é chamada no main.js
        // via 'open-alertas-modal' click listener.
        // O bindEvents será chamado após a renderização.
    }

    // Função principal para renderizar a página de alertas
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

            const alerts = data.items;
            const tableHeaders = ['Tipo', 'Mensagem', 'Item ID', 'Data do Alerta', 'Ações'];

            const searchAndFilterHtml = `
                <div id="alertas-search-bar" class="row mb-3">
                    <div class="col-md-4 mb-2">
                        <input type="text" id="alert-search-term" class="form-control"
                            placeholder="Buscar por mensagem ou ID do item" value="${this.currentSearchTerm}">
                    </div>
                    <div class="col-md-4 mb-2">
                        <select id="alert-type-filter" class="form-select">
                            <option value="">Todos os Tipos</option>
                            <option value="1" ${this.currentTipoAlerta === 1 ? 'selected' : ''}>Estoque Baixo</option>
                            <option value="2" ${this.currentTipoAlerta === 2 ? 'selected' : ''}>Validade Próxima</option>
                        </select>
                    </div>
                    <div class="col-md-4 d-flex mb-2">
                        <button id="btn-search-alert" class="btn btn-primary me-2">Buscar</button>
                        <button id="btn-clear-alert-search" class="btn btn-secondary">Limpar</button>
                    </div>
                </div>
            `;

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
                    <button class="btn btn-sm btn-info me-1 btn-ver-item" data-item-id="${alerta.item_id}">
                        <i class="bi bi-eye"></i> Item
                    </button>
                    ${!alerta.ignorar_novos ? `
                        <button class="btn btn-sm btn-warning btn-ignorar-alerta" data-id="${alerta.alerta_id}">
                            <i class="bi bi-x-circle"></i> Ignorar
                        </button>` : `<span class="badge bg-secondary">Ignorado</span>`}
                `
            });

            const paginationHtml = uiService.renderPagination(
                data.page,
                data.total_pages,
                'alerts',
                'alertsPageSizeSelect',
                this.pageSize
            );

            uiService.renderPage(
                'Lista de Alertas',
                `${searchAndFilterHtml}${tableHtml}${paginationHtml}`
            );

            this._bindPageEvents(data.total_pages);
            this._bindTableActions();

            // NOVO: Marcar todos os alertas como visualizados e limpar o sino
            await apiService.markAllAlertsAsViewed();
            setNewAlertsFlag(false); // Limpa o flag no localStorage e atualiza a UI do sino

        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
            uiService.renderPage(
                'Lista de Alertas',
                `<div class="alert alert-warning">Erro ao carregar alertas: ${error.message || 'Verifique sua conexão.'}</div>`
            );
        } finally {
            uiService.hideLoading();
        }
    }

    _bindPageEvents(totalPages) {
        document.getElementById('btn-search-alert')?.addEventListener('click', () => {
            this.currentSearchTerm = document.getElementById('alert-search-term').value.trim();
            const selectedType = document.getElementById('alert-type-filter').value;
            this.currentTipoAlerta = selectedType ? parseInt(selectedType) : null;
            this.currentPage = 1;
            this.renderAlertsPage();
        });

        document.getElementById('btn-clear-alert-search')?.addEventListener('click', () => {
            document.getElementById('alert-search-term').value = '';
            document.getElementById('alert-type-filter').value = '';
            this.currentSearchTerm = '';
            this.currentTipoAlerta = null;
            this.currentPage = 1;
            this.renderAlertsPage();
        });

        const paginationContainer = document.getElementById('alertas-pagination-container');
        if (paginationContainer) {
            paginationContainer.addEventListener('click', (e) => {
                e.preventDefault();
                const clickedPageLink = e.target.closest('a[data-page]');
                if (clickedPageLink) {
                    this.currentPage = parseInt(clickedPageLink.dataset.page);
                    this.renderAlertsPage();
                    return;
                }
                const clickedActionButton = e.target.closest('a[data-action]');
                if (clickedActionButton) {
                    const action = clickedActionButton.dataset.action;
                    let newPage = this.currentPage;
                    if (action.includes('prev')) {
                        if (newPage > 1) newPage--;
                    } else if (action.includes('next')) {
                        if (newPage < totalPages) newPage++;
                    }
                    if (newPage !== this.currentPage) {
                        this.currentPage = newPage;
                        this.renderAlertsPage();
                    }
                }
            });
        }

        const pageSizeSelect = document.getElementById('alertsPageSizeSelect');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1;
                this.renderAlertsPage();
            });
        }
    }

    _bindTableActions() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-ignorar-alerta')) {
                    const button = e.target.closest('.btn-ignorar-alerta');
                    const alertId = button.dataset.id;
                    if (confirm('Tem certeza que deseja ignorar futuros alertas para este item/motivo?')) {
                        await this.ignoreAlert(alertId);
                    }
                } else if (e.target.closest('.btn-ver-item')) {
                    const button = e.target.closest('.btn-ver-item');
                    const itemId = button.dataset.itemId;
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
                }
            });
        }
    }

    async ignoreAlert(alertId) {
        uiService.showLoading();
        try {
            await apiService.patch(`/alertas/ignorar/${alertId}`);
            showAlert('Alerta ignorado com sucesso. Futuros alertas para este item/motivo não serão gerados.', 'success');
            this.renderAlertsPage();
        } catch (error) {
            console.error('Erro ao ignorar alerta:', error);
            showAlert(error.message || 'Erro ao ignorar o alerta.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    _getTipoAlertaText(tipoAlertaValue) {
        switch (tipoAlertaValue) {
            case 1: return '<span class="badge bg-danger"><i class="bi bi-box-fill"></i> Estoque Baixo</span>';
            case 2: return '<span class="badge bg-warning text-dark"><i class="bi bi-calendar-x"></i> Validade Próxima</span>';
            default: return 'Desconhecido';
        }
    }
}

export const alertasModule = new AlertasModule();
