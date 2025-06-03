// frontend/static/js/historicoServidorModule.js

import { apiService } from './apiService.js';
import { dataService } from './dataService.js';
import { uiService } from './uiService.js';
import { showAlert, getStatusText, formatDateTime } from './utils.js';
import estadoGlobal from './estadoGlobal.js';

class HistoricoServidorModule {
    constructor() {
        this.minhasRetiradasPageSizeSelectId = 'minhasRetiradasPageSize';

        // Bindings para eventos que são removidos e adicionados novamente
        this.boundHandleMinhasRetiradasPaginationClick = this._handleMinhasRetiradasPaginationClick.bind(this);
        this.boundHandleMinhasRetiradasPageSizeChange = this._handleMinhasRetiradasPageSizeChange.bind(this);
        this.boundHandleDetalhesRetiradaClick = this._handleDetalhesRetiradaClick.bind(this);
    }

    init() {
        // Nenhuma inicialização especial aqui, os eventos serão vinculados após a renderização
    }

    async renderMinhasRetiradas(page = 1, pageSize = estadoGlobal.currentMinhasRetiradasPageSize) {
        uiService.showLoading();
        try {
            // Usa a nova função da apiService para buscar as retiradas do usuário logado
            const data = await dataService.getProcessedRetiradas(apiService.fetchUserRetiradasPaginated.bind(apiService), page, pageSize);
            
            estadoGlobal.setMinhasRetiradasPagination(data.current_page, data.total_pages, pageSize);
            estadoGlobal.setMinhasRetiradas(data.items);

            const tableHeaders = ['ID', 'Data', 'Status', 'Itens', 'Ações'];

            const tableHtml = uiService.renderTable(tableHeaders, estadoGlobal.minhasRetiradas, {
                noRecordsMessage: "Nenhuma retirada encontrada.",
                rowMapper: (r) => [
                    r.retirada_id,
                    formatDateTime(r.data_solicitacao),
                    getStatusText(r.status),
                    // Exibe uma lista de itens solicitados
                    r.itens.map(item => `${item.item.nome_item_original} (${item.quantidade_retirada})`).join(', ')
                ],
                actionsHtml: (r) => `
                    <div class="d-flex flex-wrap justify-content-center gap-1">
                        <button
                            class="btn btn-sm btn-info btn-acoes btn-detalhes-minha-retirada"
                            data-id="${r.retirada_id}"
                        >
                            <i class="bi bi-eye"></i> Detalhes
                        </button>
                    </div>
                `
            });

            const paginationHtml = uiService.renderPagination(
                estadoGlobal.currentMinhasRetiradasPage,
                estadoGlobal.totalMinhasRetiradasPages,
                'minhas-retiradas', // Tipo de paginação para minhas retiradas
                this.minhasRetiradasPageSizeSelectId,
                estadoGlobal.currentMinhasRetiradasPageSize
            );

            uiService.renderPage('Meu Histórico de Retiradas', `
                ${tableHtml}
                ${paginationHtml}
            `);

            this._bindMinhasRetiradasEvents();
            this._bindMinhasRetiradasTableActions();

        } catch (error) {
            console.error("Erro ao renderizar histórico de retiradas do servidor:", error);
            showAlert(error.message || 'Ocorreu um erro ao carregar seu histórico de retiradas.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    _bindMinhasRetiradasEvents() {
        const minhasRetiradasPaginationNav = document.getElementById('minhas-retiradas-pagination-nav');
        const pageSizeSelect = document.getElementById(this.minhasRetiradasPageSizeSelectId);

        if (minhasRetiradasPaginationNav) {
            minhasRetiradasPaginationNav.removeEventListener('click', this.boundHandleMinhasRetiradasPaginationClick);
            minhasRetiradasPaginationNav.addEventListener('click', this.boundHandleMinhasRetiradasPaginationClick);
        }

        if (pageSizeSelect) {
            pageSizeSelect.removeEventListener('change', this.boundHandleMinhasRetiradasPageSizeChange);
            pageSizeSelect.addEventListener('change', this.boundHandleMinhasRetiradasPageSizeChange);
        }
    }

    _handleMinhasRetiradasPaginationClick(e) {
        e.preventDefault();

        const clickedPageLink = e.target.closest('a[data-page^="minhas-retiradas-"]');
        const clickedActionButton = e.target.closest('a[data-action^="minhas-retiradas-"]');

        if (clickedPageLink) {
            const pageValue = clickedPageLink.dataset.page.split('-')[2]; // Ajustado para pegar o número correto
            const newPage = parseInt(pageValue);

            if (!isNaN(newPage) && newPage !== estadoGlobal.currentMinhasRetiradasPage) {
                this.renderMinhasRetiradas(newPage, estadoGlobal.currentMinhasRetiradasPageSize);
            }
            return;
        }

        if (clickedActionButton) {
            const action = clickedActionButton.dataset.action;
            let newPage = estadoGlobal.currentMinhasRetiradasPage;

            if (action === 'minhas-retiradas-prev' && newPage > 1) {
                newPage--;
            } else if (action === 'minhas-retiradas-next' && newPage < estadoGlobal.totalMinhasRetiradasPages) {
                newPage++;
            }

            if (newPage !== estadoGlobal.currentMinhasRetiradasPage) {
                this.renderMinhasRetiradas(newPage, estadoGlobal.currentMinhasRetiradasPageSize);
            }
            return;
        }
    }

    _handleMinhasRetiradasPageSizeChange(e) {
        if (e.target.id === this.minhasRetiradasPageSizeSelectId) {
            const newPageSize = parseInt(e.target.value);
            this.renderMinhasRetiradas(1, newPageSize);
        }
    }

    _bindMinhasRetiradasTableActions() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            // Remove e adiciona listener único para clique na tabela
            mainContent.removeEventListener('click', this.boundHandleDetalhesRetiradaClick);
            mainContent.addEventListener('click', this.boundHandleDetalhesRetiradaClick);
        }
    }

    _handleDetalhesRetiradaClick(e) {
        const detailsButton = e.target.closest('.btn-detalhes-minha-retirada');
        if (detailsButton) {
            const id = parseInt(detailsButton.dataset.id);
            const retirada = estadoGlobal.minhasRetiradas.find(r => r.retirada_id === id);
            if (retirada) {
                uiService.fillModalDetalhes(retirada);
                uiService.getModalInstance('modalVerDetalhesRetirada').show();
            } else {
                showAlert('Detalhes da retirada não encontrados.', 'warning');
            }
        }
    }
}

export const historicoServidorModule = new HistoricoServidorModule();
