// frontend/static/js/alertasModule.js

import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert, formatDateTime } from './utils.js';
import estadoGlobal from './estadoGlobal.js'; // Para o PAGE_SIZE_OPTIONS

class AlertasModule {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10; // Tamanho de página padrão para alertas
        this.currentSearchTerm = ''; // Se você quiser adicionar busca por mensagem/item_id
    }

    init() {
        // Não há mais necessidade de _bindEvents aqui que sejam acionados por eventos de modal show/hide
        // A lógica de binding será chamada após renderizar a página.
    }

    // NOVO: Função principal para renderizar a página de alertas
    async renderAlertsPage() {
        uiService.showLoading();
        try {
            // Buscando alertas paginados. O endpoint '/alertas/paginated' é crucial aqui.
            const data = await apiService.get('/alertas/paginated', {
                page: this.currentPage,
                size: this.pageSize
            });

            const alerts = data.items;

            const tableHeaders = ['Tipo', 'Mensagem', 'Item ID', 'Data do Alerta', 'Ações'];

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
                    </button>
                    ` : '<span class="badge bg-secondary">Ignorado</span>'}
                `
            });

            const paginationHtml = uiService.renderPagination(
                data.page,
                data.total_pages,
                'alerts', // Type para paginação (ex: data-page-alerts, data-action="alerts-prev")
                'alertsPageSizeSelect', // ID para o select de tamanho de página
                this.pageSize
            );

            // Renderiza tudo no main-content
            uiService.renderPage(
                'Lista de Alertas',
                `<div id="alertas-search-bar" class="row mb-3">
                    <div class="col-md-6">
                        <input type="text" id="alert-search-term" class="form-control"
                               placeholder="Buscar por mensagem ou ID do item">
                    </div>
                    <div class="col-md-6 d-flex">
                        <button id="btn-search-alert" class="btn btn-primary me-2">Buscar</button>
                        <button id="btn-clear-alert-search" class="btn btn-secondary">Limpar</button>
                    </div>
                </div>
                ${tableHtml}
                ${paginationHtml}`
            );

            // Agora, bindar os eventos aos elementos que acabaram de ser renderizados
            this._bindPageEvents(data.total_pages);

        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
            uiService.renderPage(
                'Lista de Alertas',
                `<div class="alert alert-warning">Erro ao carregar alertas: ${error.message || 'Verifique a conexão com a API.'}</div>`
            );
        } finally {
            uiService.hideLoading();
        }
    }

    _bindPageEvents(totalPages) {
        // Bind para a barra de busca (se você adicionar funcionalidade de busca)
        document.getElementById('btn-search-alert')?.addEventListener('click', () => {
            this.currentSearchTerm = document.getElementById('alert-search-term').value.trim();
            this.currentPage = 1;
            this.renderAlertsPage();
        });
        document.getElementById('btn-clear-alert-search')?.addEventListener('click', () => {
            document.getElementById('alert-search-term').value = '';
            this.currentSearchTerm = '';
            this.currentPage = 1;
            this.renderAlertsPage();
        });

        // Bind para paginação
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

            // Bind para mudança de tamanho da página
            const pageSizeSelect = document.getElementById('alertsPageSizeSelect');
            if (pageSizeSelect) {
                pageSizeSelect.addEventListener('change', (e) => {
                    this.pageSize = parseInt(e.target.value);
                    this.currentPage = 1;
                    this.renderAlertsPage();
                });
            }
        }


        // Lógica para ações na tabela de alertas (ex: ignorar, ver item)
        const alertasListContainer = document.getElementById('alertas-list-container');
        if (alertasListContainer) {
            alertasListContainer.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-ignorar-alerta')) {
                    const button = e.target.closest('.btn-ignorar-alerta');
                    const alertaId = button.dataset.id;
                    if (confirm('Tem certeza que deseja ignorar futuros alertas para este item/motivo?')) {
                        await this.ignoreAlert(alertaId);
                    }
                } else if (e.target.closest('.btn-ver-item')) {
                    const button = e.target.closest('.btn-ver-item');
                    const itemId = button.dataset.itemId;
                    // Abrir modal de detalhes do item
                    // Reutilizando lógica existente do selecionar-item-module ou um novo
                    // Para o seu caso, o modal de detalhes do item deve ser 'modalDetalheItem'
                    uiService.showLoading();
                    try {
                        const itemDetails = await apiService.getItemById(itemId);
                        uiService.fillModalDetalhesItem(itemDetails); // Você precisará criar esta função no uiService
                        uiService.getModalInstance('modalDetalheItem').show(); // Assumindo este ID para o modal de detalhes do item
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

    async ignoreAlert(alertaId) {
        uiService.showLoading();
        try {
            await apiService.patch(`/alertas/ignorar/${alertaId}`);
            showAlert('Alerta ignorado com sucesso. Futuros alertas para este item/motivo não serão gerados.', 'success');
            this.renderAlertsPage(); // Recarrega a página de alertas
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