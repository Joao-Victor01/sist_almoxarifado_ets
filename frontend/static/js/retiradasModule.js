// frontend/static/js/retiradasModule.js

import { apiService } from './apiService.js';
import { dataService } from './dataService.js';
import { uiService } from './uiService.js';
import { showAlert, getStatusText, getStatusValue, getUserTypeFromToken } from './utils.js';
import estadoGlobal from './estadoGlobal.js';

class RetiradasModule {
    constructor() {
        this.historicoPageSizeSelectId = 'historicoPageSize';
        this.pendentesPageSizeSelectId = 'pendentesPageSize';

        // Referências aos elementos do modal de conclusão
        this.modalConcluirRetirada = uiService.getModalInstance('modalConcluirRetirada');
        this.concluirRetiradaIdInput = document.getElementById('concluirRetiradaId');
        this.concluirRetiradaDisplayId = document.getElementById('concluirRetiradaDisplayId');
        this.concluirDetalheStatusInput = document.getElementById('concluirDetalheStatus');
        this.btnConfirmarConcluirRetirada = document.getElementById('btn-confirmar-concluir-retirada');

        // Referências ao modal de soft delete
        this.modalSoftDeleteRetiradas = uiService.getModalInstance('modalSoftDeleteRetiradas');
        this.softDeleteDataInicioInput = document.getElementById('softDeleteDataInicio');
        this.softDeleteDataFimInput = document.getElementById('softDeleteDataFim');
        this.btnConfirmarSoftDeleteRetiradas = document.getElementById('btn-confirmar-soft-delete-retiradas');


        // Bindings para eventos que são removidos e adicionados novamente
        this._boundHandleHistoricoPaginationClick = this._handleHistoricoPaginationClick.bind(this);
        this.boundHandleHistoricoPageSizeChange = this._handleHistoricoPageSizeChange.bind(this);
        this.boundHandleHistoricoFilterSubmit = this._handleHistoricoFilterSubmit.bind(this);
        this.boundHandleHistoricoClearFilters = this._handleHistoricoClearFilters.bind(this);
        this._boundHandleAutorizarDeny = this._handleAuthorizeDeny.bind(this); // Refactor
        this._boundHandleDetalhesRetiradaClick = this._handleDetalhesRetiradaClick.bind(this); // Refactor
        this._boundHandleAutorizarRetiradaClick = this._handleAutorizarRetiradaClick.bind(this); // Refactor
        this._boundHandleConcluirRetirada = this._handleConcluirRetirada.bind(this); // Refactor

        // Binding para o botão de soft delete
        this._boundHandleSoftDeleteRetiradas = this._handleSoftDeleteRetiradas.bind(this);
    }

    init() {
        // Vincula os eventos apenas uma vez, no DOMContentLoaded principal

        document.getElementById('btn-open-soft-delete-retiradas')?.addEventListener('click', () => this._openSoftDeleteModal());
        
        // Os demais bindings são feitos após a renderização das tabelas.

    }

    async renderHistoricoRetiradas(page = 1, filters = estadoGlobal.currentHistoricoFilters, pageSize = estadoGlobal.currentHistoricoPageSize) {
        uiService.showLoading();
        try {
            const data = await dataService.getProcessedRetiradas(apiService.fetchAllRetiradas.bind(apiService), page, pageSize, filters);
            estadoGlobal.setHistoricoPagination(data.current_page, data.total_pages, pageSize, filters);
            estadoGlobal.setAllRetiradas(data.items);

            const userType = await getUserTypeFromToken();

            const filterFormHtml = this._getHistoricoFilterFormHtml(filters);

            const tableHeaders = ['ID', 'Usuário', 'Data', 'Status', 'Ações'];
            const tableHtml = uiService.renderTable(tableHeaders, estadoGlobal.allRetiradas, {
                noRecordsMessage: "Nenhum histórico de retirada encontrado.",
                rowMapper: (r) => [
                    r.retirada_id,
                    r.usuario_nome,
                    new Date(r.data_solicitacao).toLocaleDateString('pt-BR'),
                    getStatusText(r.status)
                ],
                actionsHtml: (r) => {
                    let actions = `
                        <div class="d-flex flex-wrap justify-content-center gap-1">
                            <button
                                class="btn btn-sm btn-primary btn-acoes btn-detalhes-retirada"
                                data-id="${r.retirada_id}"
                            >
                                <i class="bi bi-eye"></i> Detalhes
                            </button>`;

                    // Apenas usuários do Almoxarifado (tipo 2) podem concluir uma retirada AUTORIZADA
                    if (r.status === estadoGlobal.statusMapUpdate.AUTORIZADA && userType === 2) {
                        actions += `
                            <button
                                class="btn btn-sm btn-success btn-acoes btn-concluir-retirada-trigger"
                                data-id="${r.retirada_id}"
                            >
                                <i class="bi bi-check-circle"></i> Concluir Retirada
                            </button>`;
                    }
                    actions += `</div>`;
                    return actions;
                }
            });

            const paginationHtml = uiService.renderPagination(
                estadoGlobal.currentHistoricoPage,
                estadoGlobal.totalHistoricoPages,
                'historico',
                this.historicoPageSizeSelectId,
                estadoGlobal.currentHistoricoPageSize
            );

            uiService.renderPage('Histórico de Retiradas', `
                <div class="card mb-4">
                    <div class="card-header">Filtros de Busca</div>
                    <div class="card-body">${filterFormHtml}</div>
                </div>
                <div class="d-flex justify-content-end mb-3">
                    <button id="btn-open-soft-delete-retiradas-historico" class="btn btn-danger">Deletar Antigas</button>
                </div>
                ${tableHtml}
                ${paginationHtml}
            `);

            // Ajustando a chamada para os métodos da classe
            this.bindHistoricoEvents();
            this.bindCommonRetiradaActions(); // Agora é um método público
            this.bindConcluirRetiradaEvents(); // binding para o botão de concluir

            // Vincula o evento do botão de deletar antigas que foi renderizado dentro de renderHistoricoRetiradas
            // Isso garante que o botão recém-criado tenha o listener.
            document.getElementById('btn-open-soft-delete-retiradas-historico')?.addEventListener('click', () => this._openSoftDeleteModal());

        } catch (error) {
            console.error("Erro ao renderizar histórico de retiradas:", error);
            showAlert(error.message || 'Ocorreu um erro ao carregar o histórico de retiradas.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    async renderPendentesRetiradas(page = 1, pageSize = estadoGlobal.currentPendentesPageSize) {
        uiService.showLoading();
        try {
            const data = await dataService.getProcessedRetiradas(apiService.fetchRetiradasPendentes.bind(apiService), page, pageSize);
            estadoGlobal.setPendentesPagination(data.current_page, data.total_pages, pageSize);
            estadoGlobal.setPendentesRetiradas(data.items);

            const tableHeaders = ['ID', 'Usuário', 'Setor', 'Data', 'Ações'];
            const tableHtml = uiService.renderTable(tableHeaders, estadoGlobal.pendentesRetiradas, {
                noRecordsMessage: "Nenhuma retirada pendente encontrada.",
                rowMapper: (r) => [
                    r.retirada_id,
                    r.usuario_nome,
                    r.setor_nome,
                    new Date(r.data_solicitacao).toLocaleDateString('pt-BR')
                ],
                actionsHtml: (r) => `
                    <div class="d-flex flex-wrap justify-content-center gap-1">
                        <button
                            class="btn btn-sm btn-success btn-acoes btn-autorizar-retirada-trigger"
                            data-id="${r.retirada_id}"
                        >
                            <i class="bi bi-check-circle"></i> Autorizar/Negar
                        </button>
                        <button
                            class="btn btn-sm btn-info btn-acoes btn-detalhes-retirada"
                            data-id="${r.retirada_id}"
                        >
                            <i class="bi bi-eye"></i> Ver detalhes
                        </button>
                    </div>
                `
            });

            const paginationHtml = uiService.renderPagination(
                estadoGlobal.currentPendentesPage,
                estadoGlobal.totalPendentesPages,
                'pendentes',
                this.pendentesPageSizeSelectId,
                estadoGlobal.currentPendentesPageSize
            );

            uiService.renderPage('Retiradas Pendentes', `
                ${tableHtml}
                ${paginationHtml}
            `);

            // Ajustando a chamada para os métodos da classe
            this.bindPendentesEvents(); // Agora é um método público
            this.bindCommonRetiradaActions(); // Agora é um método público
        } catch (error) {
            console.error("Erro ao renderizar retiradas pendentes:", error);
            showAlert(error.message || 'Ocorreu um erro ao carregar as retiradas pendentes.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    // Lógica para o modal de Concluir Retirada
    bindConcluirRetiradaEvents() {
        document.querySelectorAll('.btn-concluir-retirada-trigger').forEach(btn => {
            btn.removeEventListener('click', this._boundHandleConcluirRetirada); // Previne duplicação
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                const retirada = estadoGlobal.allRetiradas.find(r => r.retirada_id === id);
                if (retirada) {
                    uiService.fillModalConcluir(retirada);
                    this.modalConcluirRetirada.show();
                } else {
                    showAlert('Retirada não encontrada para conclusão.', 'warning');
                }
            });
        });

        // O evento de clique no botão de confirmação deve usar o binding salvo no constructor
        this.btnConfirmarConcluirRetirada.removeEventListener('click', this._boundHandleConcluirRetirada);
        this.btnConfirmarConcluirRetirada.addEventListener('click', this._boundHandleConcluirRetirada);
    }

    _getHistoricoFilterFormHtml(currentFilters) {
        return `
            <form id="form-filter-historico" class="row g-3 mb-0">
                <div class="col-12 col-md">
                    <label for="filterStatus" class="form-label">Status</label>
                    <select class="form-select" id="filterStatus">
                        <option value="">Todos</option>
                        <option value="PENDENTE" ${currentFilters.status === estadoGlobal.statusMapUpdate.PENDENTE ? 'selected' : ''}>PENDENTE</option>
                        <option value="AUTORIZADA" ${currentFilters.status === estadoGlobal.statusMapUpdate.AUTORIZADA ? 'selected' : ''}>AUTORIZADA</option>
                        <option value="CONCLUIDA" ${currentFilters.status === estadoGlobal.statusMapUpdate.CONCLUIDA ? 'selected' : ''}>CONCLUÍDA</option>
                        <option value="NEGADA" ${currentFilters.status === estadoGlobal.statusMapUpdate.NEGADA ? 'selected' : ''}>NEGADA</option>
                    </select>
                </div>
                <div class="col-12 col-md">
                    <label for="filterSolicitante" class="form-label">Solicitante</label>
                    <input type="text" class="form-control" id="filterSolicitante" value="${currentFilters.solicitante || ''}">
                </div>
                <div class="col-12 col-md">
                    <label for="filterStartDate" class="form-label">Data Inicial</label>
                    <input type="date" class="form-control" id="filterStartDate" value="${currentFilters.start_date || ''}">
                </div>
                <div class="col-12 col-md">
                    <label for="filterEndDate" class="form-label">Data Final</label>
                    <input type="date" class="form-control" id="filterEndDate" value="${currentFilters.end_date || ''}">
                </div>
                <div class="col-12 col-md d-flex justify-content-end align-items-end">
                    <button type="submit" class="btn btn-primary me-2" id="btn-search-historico">Buscar</button>
                    <button type="button" class="btn btn-secondary" id="btn-clear-filters">Limpar Filtros</button>
                </div>
            </form>
        `;
    }

    // Definindo como método da classe
    bindHistoricoEvents() {
        const historicoPaginationNav = document.getElementById('historico-pagination-nav');
        const formFilter = document.getElementById('form-filter-historico');
        const pageSizeSelect = document.getElementById(this.historicoPageSizeSelectId);
        const btnClearFilters = document.getElementById('btn-clear-filters');
    
        if (historicoPaginationNav) {
            historicoPaginationNav.removeEventListener('click', this._boundHandleHistoricoPaginationClick);
            historicoPaginationNav.addEventListener('click', this._boundHandleHistoricoPaginationClick);
        }
        if (pageSizeSelect) {
            pageSizeSelect.removeEventListener('change', this.boundHandleHistoricoPageSizeChange);
            pageSizeSelect.addEventListener('change', this.boundHandleHistoricoPageSizeChange);
        }
        if (formFilter) {
            formFilter.removeEventListener('submit', this.boundHandleHistoricoFilterSubmit);
            formFilter.addEventListener('submit', this.boundHandleHistoricoFilterSubmit);
        }
        if (btnClearFilters) {
            btnClearFilters.removeEventListener('click', this.boundHandleHistoricoClearFilters);
            btnClearFilters.addEventListener('click', this.boundHandleHistoricoClearFilters);
        }
    }
    
    _handleHistoricoFilterSubmit(e) {
        e.preventDefault();
        const selectedStatusString = document.getElementById('filterStatus').value;
        const statusInt = selectedStatusString ? estadoGlobal.statusMapUpdate[selectedStatusString] : null;
        const filters = {
            status: statusInt,
            solicitante: document.getElementById('filterSolicitante').value.trim(),
            start_date: document.getElementById('filterStartDate').value,
            end_date: document.getElementById('filterEndDate').value,
        };
        this.renderHistoricoRetiradas(1, filters, estadoGlobal.currentHistoricoPageSize);
    }
    
    _handleHistoricoClearFilters() {
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterSolicitante').value = '';
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        this.renderHistoricoRetiradas(1, {}, estadoGlobal.currentHistoricoPageSize);
    }
    
    _handleHistoricoPaginationClick(e) {
        e.preventDefault();
        const clickedPageLink = e.target.closest('a[data-page^="historico-"]');
        const clickedActionButton = e.target.closest('a[data-action^="historico-"]');
    
        if (clickedPageLink) {
            const pageValue = clickedPageLink.dataset.page.split('-')[1];
            const newPage = parseInt(pageValue);
            if (!isNaN(newPage) && newPage !== estadoGlobal.currentHistoricoPage) {
                this.renderHistoricoRetiradas(newPage, estadoGlobal.currentHistoricoFilters, estadoGlobal.currentHistoricoPageSize);
            }
            return;
        }
    
        if (clickedActionButton) {
            const action = clickedActionButton.dataset.action;
            let newPage = estadoGlobal.currentHistoricoPage;
            if (action === 'historico-prev' && newPage > 1) {
                newPage--;
            } else if (action === 'historico-next' && newPage < estadoGlobal.totalHistoricoPages) {
                newPage++;
            }
            if (newPage !== estadoGlobal.currentHistoricoPage) {
                this.renderHistoricoRetiradas(newPage, estadoGlobal.currentHistoricoFilters, estadoGlobal.currentHistoricoPageSize);
                return;
            }
        }
    }
    
    _handleHistoricoPageSizeChange(e) {
        if (e.target.id === this.historicoPageSizeSelectId) {
            const newPageSize = parseInt(e.target.value);
            this.renderHistoricoRetiradas(1, estadoGlobal.currentHistoricoFilters, newPageSize);
        }
    }
    
    // Definindo como método da classe
    bindPendentesEvents() {
        const pendentesPaginationNav = document.getElementById('pendentes-pagination-nav');
        const pageSizeSelect = document.getElementById(this.pendentesPageSizeSelectId);
    
        if (!pendentesPaginationNav) {
            console.warn("Elemento 'pendentes-pagination-nav' não encontrado.");
            return;
        }
    
        pendentesPaginationNav.removeEventListener('click', this._boundHandlePendentesPaginationClick);
        if (pageSizeSelect) {
            pageSizeSelect.removeEventListener('change', this._boundHandlePendentesPageSizeChange);
        }
    
        pendentesPaginationNav.addEventListener('click', this._boundHandlePendentesPaginationClick);
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', this._boundHandlePendentesPageSizeChange);
        }
    }
    
    _boundHandlePendentesPaginationClick = (e) => {
        e.preventDefault();
        const clickedPageLink = e.target.closest('a[data-page^="pendentes-"]');
        const clickedActionButton = e.target.closest('a[data-action="pendentes-"]');
    
        if (clickedPageLink) {
            const pageValue = clickedPageLink.dataset.page.split('-')[1];
            const newPage = parseInt(pageValue);
            if (!isNaN(newPage) && newPage !== estadoGlobal.currentPendentesPage) {
                this.renderPendentesRetiradas(newPage, estadoGlobal.currentPendentesPageSize);
            }
            return;
        }
    
        if (clickedActionButton) {
            const action = clickedActionButton.dataset.action;
            let newPage = estadoGlobal.currentPendentesPage;
            if (action === 'pendentes-prev' && newPage > 1) {
                newPage--;
            } else if (action === 'pendentes-next' && newPage < estadoGlobal.totalPendentesPages) {
                newPage++;
            }
            if (newPage !== estadoGlobal.currentPendentesPage) {
                this.renderPendentesRetiradas(newPage, estadoGlobal.currentPendentesPageSize);
            }
            return;
        }
    }
    
    _boundHandlePendentesPageSizeChange = (e) => {
        if (e.target.id === this.pendentesPageSizeSelectId) {
            const newPageSize = parseInt(e.target.value);
            this.renderPendentesRetiradas(1, newPageSize);
        }
    }
    
    bindCommonRetiradaActions() { // Renomeado de _bindCommonRetiradaActions
        // Detalhes da Retirada
        document.querySelectorAll('.btn-detalhes-retirada').forEach(btn => {
            btn.removeEventListener('click', this._boundHandleDetalhesRetiradaClick);
            btn.addEventListener('click', this._boundHandleDetalhesRetiradaClick);
        });
    
        // Autorizar/Negar Retirada
        document.querySelectorAll('.btn-autorizar-retirada-trigger').forEach(btn => {
            btn.removeEventListener('click', this._boundHandleAutorizarRetiradaClick);
            btn.addEventListener('click', this._boundHandleAutorizarRetiradaClick);
        });
    }
    
    _handleDetalhesRetiradaClick = (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        // Tenta encontrar nos dois arrays de estado
        const retirada = [...estadoGlobal.allRetiradas, ...estadoGlobal.pendentesRetiradas].find(r => r.retirada_id === id);
        if (retirada) {
            uiService.fillModalDetalhes(retirada);
            uiService.getModalInstance('modalVerDetalhesRetirada').show();
        } else {
            showAlert('Detalhes da retirada não encontrados.', 'warning');
        }
    }
    
    _handleAutorizarRetiradaClick = (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const retirada = estadoGlobal.pendentesRetiradas.find(r => r.retirada_id === id);
        if (retirada) {
            uiService.fillModalAutorizar(retirada);
            uiService.getModalInstance('modalAutorizarRetirada').show();
        } else {
            showAlert('Retirada pendente não encontrada para autorização.', 'warning');
        }
    }
    
    _handleAuthorizeDeny = async (action, e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const detalheInput = document.getElementById('autorizarDetalheStatus');
        const detalhe = detalheInput.value.trim();
        const statusValue = getStatusValue(action);
    
        if (action === 'NEGADA' && !detalhe) {
            showAlert('O detalhe do status (justificativa da negação) é obrigatório ao negar.', 'warning');
            detalheInput.focus();
            return;
        }
    
        try {
            await apiService.updateRetiradaStatus(id, statusValue, detalhe);
            showAlert(`Retirada ${action === 'AUTORIZADA' ? 'autorizada' : 'negada'} com sucesso!`, 'success');
            uiService.getModalInstance('modalAutorizarRetirada').hide();
            // Atualiza a lista de pendentes após autorizar/negar
            this.renderPendentesRetiradas(estadoGlobal.currentPendentesPage, estadoGlobal.currentPendentesPageSize);
            // Se estiver na tela de histórico, também atualiza
            if (document.getElementById('historico-pagination-nav')) {
                this.renderHistoricoRetiradas(estadoGlobal.currentHistoricoPage, estadoGlobal.currentHistoricoFilters, estadoGlobal.currentHistoricoPageSize);
            }
        } catch (error) {
            showAlert(error.message || `Erro ao ${action === 'AUTORIZADA' ? 'autorizar' : 'negar'} retirada.`, 'danger');
        }
    }
    
    _handleConcluirRetirada = async (e) => {
        const retiradaId = parseInt(this.concluirRetiradaIdInput.value);
        const detalhe = this.concluirDetalheStatusInput.value.trim();
    
        uiService.showLoading();
        try {
            await apiService.updateRetiradaStatus(retiradaId, estadoGlobal.statusMapUpdate.CONCLUIDA, detalhe);
            showAlert('Retirada marcada como "Concluída" com sucesso! Estoque decrementado.', 'success');
            this.modalConcluirRetirada.hide();
            // Recarrega o histórico para refletir a mudança
            this.renderHistoricoRetiradas(estadoGlobal.currentHistoricoPage, estadoGlobal.currentHistoricoFilters, estadoGlobal.currentHistoricoPageSize);
        } catch (error) {
            console.error("Erro ao concluir retirada", error);
            showAlert(error.message || 'Erro ao concluir a retirada. Verifique o estoque!', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    // Abrir o modal de soft delete
    _openSoftDeleteModal() {
        this.softDeleteDataInicioInput.value = ''; // Limpa campos
        this.softDeleteDataFimInput.value = '';
        this.modalSoftDeleteRetiradas.show();

        // **IMPORTANTE:** Re-vincula o evento do botão de confirmação AQUI
        // Isso garante que o botão recém-criado no modal tenha o listener,
        // mesmo que o modal seja aberto e fechado várias vezes.
        this.btnConfirmarSoftDeleteRetiradas.removeEventListener('click', this._boundHandleSoftDeleteRetiradas);
        this.btnConfirmarSoftDeleteRetiradas.addEventListener('click', this._boundHandleSoftDeleteRetiradas);
    }

    // Lidar com a confirmação do soft delete
    _handleSoftDeleteRetiradas = async () => {
        const dataInicio = this.softDeleteDataInicioInput.value;
        const dataFim = this.softDeleteDataFimInput.value;

        if (!dataInicio || !dataFim) {
            showAlert('Por favor, preencha as datas inicial e final.', 'warning');
            return;
        }

        if (new Date(dataInicio) >= new Date(dataFim)) {
            showAlert('A data inicial deve ser anterior à data final.', 'warning');
            return;
        }

        if (!confirm(`Tem certeza que deseja deletar (inativar) retiradas entre ${dataInicio} e ${dataFim}? Esta ação é irreversível e as retiradas não serão mais visíveis.`)) {
            return;
        }

        uiService.showLoading();
        try {
            const response = await apiService.deleteRetiradasByPeriod(dataInicio, dataFim);
            showAlert(response.message, 'success');
            this.modalSoftDeleteRetiradas.hide();
            // Recarregar o histórico para refletir as mudanças
            this.renderHistoricoRetiradas(1, {}, estadoGlobal.currentHistoricoPageSize); // Volta para a primeira página sem filtros
        } catch (error) {
            console.error("Erro ao realizar soft delete de retiradas:", error);
            showAlert(error.message || 'Erro ao deletar retiradas antigas.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }
}

export const retiradasModule = new RetiradasModule();
