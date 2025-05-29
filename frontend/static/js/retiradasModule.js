// frontend/static/js/retiradasModule.js

import { apiService } from './apiService.js';
import { dataService } from './dataService.js';
import { uiService } from './uiService.js';
import { showAlert, getStatusText, getStatusValue } from './utils.js';
import estadoGlobal from './estadoGlobal.js';

class RetiradasModule {
    constructor() {
        this.historicoPageSizeSelectId = 'historicoPageSize';
        this.pendentesPageSizeSelectId = 'pendentesPageSize';

        // Referências aos elementos do modal de conclusão (NOVO)
        this.modalConcluirRetirada = uiService.getModalInstance('modalConcluirRetirada');
        this.concluirRetiradaIdInput = document.getElementById('concluirRetiradaId');
        this.concluirRetiradaDisplayId = document.getElementById('concluirRetiradaDisplayId');
        this.concluirDetalheStatusInput = document.getElementById('concluirDetalheStatus');
        this.btnConfirmarConcluirRetirada = document.getElementById('btn-confirmar-concluir-retirada');

        // Bindings para eventos que são removidos e adicionados novamente
        this._boundHandleHistoricoPaginationClick = this._handleHistoricoPaginationClick.bind(this);
        this._boundHandleHistoricoPageSizeChange = this._handleHistoricoPageSizeChange.bind(this);
        this._boundHandleHistoricoFilterSubmit = this._handleHistoricoFilterSubmit.bind(this);
        this._boundHandleHistoricoClearFilters = this._handleHistoricoClearFilters.bind(this);
    }

    async renderHistoricoRetiradas(page = 1, filters = estadoGlobal.currentHistoricoFilters, pageSize = estadoGlobal.currentHistoricoPageSize) {
        uiService.showLoading();
        try {
            const data = await dataService.getProcessedRetiradas(apiService.fetchAllRetiradas.bind(apiService), page, pageSize, filters);
            estadoGlobal.setHistoricoPagination(data.current_page, data.total_pages, pageSize, filters);
            estadoGlobal.setAllRetiradas(data.items); // Isso atualiza as retiradas para o histórico

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
                        <button class="btn btn-sm btn-primary btn-detalhes-retirada" data-id="${r.retirada_id}">
                            <i class="bi bi-eye"></i> Detalhes
                        </button>
                    `;
                    // Adicionar botão de "Concluir" SOMENTE se o status for AUTORIZADA
                    if (r.status === estadoGlobal.statusMapUpdate.AUTORIZADA) {
                        actions += `
                            <button class="btn btn-sm btn-success btn-concluir-retirada-trigger ms-2" data-id="${r.retirada_id}">
                                <i class="bi bi-check-circle"></i> Concluir Retirada
                            </button>
                        `;
                    }
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
                ${tableHtml}
                ${paginationHtml}
            `);

            this._bindHistoricoEvents();
            this._bindCommonRetiradaActions(); // Mantenha esta chamada
            this._bindConcluirRetiradaEvents(); // NOVO: Bind para o modal de conclusão

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
            estadoGlobal.setPendentesRetiradas(data.items); // Isso atualiza as retiradas pendentes

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
                    <button class="btn btn-sm btn-success btn-autorizar-retirada-trigger" data-id="${r.retirada_id}">
                        <i class="bi bi-check-circle"></i> Autorizar/Negar
                    </button>
                    <button class="btn btn-sm btn-info btn-detalhes-retirada" data-id="${r.retirada_id}">
                        <i class="bi bi-eye"></i> Ver detalhes
                    </button>
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

            this._bindPendentesEvents();
            this._bindCommonRetiradaActions();
        } catch (error) {
            console.error("Erro ao renderizar retiradas pendentes:", error);
            showAlert(error.message || 'Ocorreu um erro ao carregar as retiradas pendentes.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    // NOVO: Lógica para o modal de Concluir Retirada
    _bindConcluirRetiradaEvents() {
        // Delegate event for "Concluir Retirada" buttons
        document.querySelectorAll('.btn-concluir-retirada-trigger').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.dataset.id);
                // Encontra a retirada na lista de todas as retiradas
                const retirada = estadoGlobal.allRetiradas.find(r => r.retirada_id === id);
                if (retirada) {
                    uiService.fillModalConcluir(retirada); // Preenche o novo modal
                    this.modalConcluirRetirada.show(); // Abre o novo modal
                } else {
                    showAlert('Retirada não encontrada para conclusão.', 'warning');
                }
            };
        });

        // Evento para o botão de confirmação dentro do modal de conclusão
        if (this.btnConfirmarConcluirRetirada) {
            this.btnConfirmarConcluirRetirada.onclick = () => {
                const retiradaId = parseInt(this.concluirRetiradaIdInput.value);
                const detalhe = this.concluirDetalheStatusInput.value.trim();
                this._handleConcluirRetirada(retiradaId, detalhe);
            };
        }
    }

    _getHistoricoFilterFormHtml(currentFilters) {
        return `
            <form id="form-filter-historico">
                <div class="d-flex flex-wrap align-items-end gap-3 mb-3">
                    <div class="flex-grow-1">
                        <label for="filterStatus" class="form-label">Status</label>
                        <select class="form-select" id="filterStatus">
                            <option value="">Todos</option>
                            <option value="PENDENTE" ${currentFilters.status === estadoGlobal.statusMapUpdate.PENDENTE ? 'selected' : ''}>PENDENTE</option>
                            <option value="AUTORIZADA" ${currentFilters.status === estadoGlobal.statusMapUpdate.AUTORIZADA ? 'selected' : ''}>AUTORIZADA</option>
                            <option value="CONCLUIDA" ${currentFilters.status === estadoGlobal.statusMapUpdate.CONCLUIDA ? 'selected' : ''}>CONCLUÍDA</option>
                            <option value="NEGADA" ${currentFilters.status === estadoGlobal.statusMapUpdate.NEGADA ? 'selected' : ''}>NEGADA</option>
                        </select>
                    </div>
                    <div class="flex-grow-1">
                        <label for="filterSolicitante" class="form-label">Solicitante</label>
                        <input type="text" class="form-control" id="filterSolicitante" value="${currentFilters.solicitante || ''}">
                    </div>
                    <div class="flex-grow-1">
                        <label for="filterStartDate" class="form-label">Data Inicial</label>
                        <input type="date" class="form-control" id="filterStartDate" value="${currentFilters.start_date || ''}">
                    </div>
                    <div class="flex-grow-1">
                        <label for="filterEndDate" class="form-label">Data Final</label>
                        <input type="date" class="form-control" id="filterEndDate" value="${currentFilters.end_date || ''}">
                    </div>
                    <div class="d-flex align-items-end gap-2">
                        <button type="submit" class="btn btn-primary" id="btn-search-historico">Buscar</button>
                        <button type="button" class="btn btn-secondary" id="btn-clear-filters">Limpar Filtros</button>
                    </div>
                </div>
            </form>
        `;
    }

    _bindHistoricoEvents() {
        // Get the specific pagination nav element and the form
        const historicoPaginationNav = document.getElementById('historico-pagination-nav');
        const formFilter = document.getElementById('form-filter-historico');
        const pageSizeSelect = document.getElementById(this.historicoPageSizeSelectId);
        const btnClearFilters = document.getElementById('btn-clear-filters');

        // Remove previous listeners to avoid duplicates
        if (historicoPaginationNav) {
            historicoPaginationNav.removeEventListener('click', this._boundHandleHistoricoPaginationClick);
        }
        if (pageSizeSelect) {
            pageSizeSelect.removeEventListener('change', this._boundHandleHistoricoPageSizeChange);
        }
        if (formFilter) {
            formFilter.removeEventListener('submit', this._boundHandleHistoricoFilterSubmit);
        }
        if (btnClearFilters) {
            btnClearFilters.removeEventListener('click', this._boundHandleHistoricoClearFilters);
        }

        // Add new listeners
        if (historicoPaginationNav) {
            historicoPaginationNav.addEventListener('click', this._boundHandleHistoricoPaginationClick);
        }
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', this._boundHandleHistoricoPageSizeChange);
        }
        if (formFilter) {
            formFilter.addEventListener('submit', this._boundHandleHistoricoFilterSubmit);
        }
        if (btnClearFilters) {
            btnClearFilters.addEventListener('click', this._boundHandleHistoricoClearFilters);
        }
    }

    async _handleHistoricoFilterSubmit(e) {
        e.preventDefault();
        console.log("Filtro de histórico submetido!"); // Debug
        const selectedStatusString = document.getElementById('filterStatus').value;
        const statusInt = selectedStatusString ? estadoGlobal.statusMapUpdate[selectedStatusString] : null;
        const filters = {
            status: statusInt,
            solicitante: document.getElementById('filterSolicitante').value.trim(),
            start_date: document.getElementById('filterStartDate').value,
            end_date: document.getElementById('filterEndDate').value,
        };
        console.log("Filtros aplicados:", filters); // Debug
        this.renderHistoricoRetiradas(1, filters, estadoGlobal.currentHistoricoPageSize);
    }

    _handleHistoricoClearFilters() {
        console.log("Limpar filtros de histórico clicado!"); // Debug
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterSolicitante').value = '';
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        this.renderHistoricoRetiradas(1, {}, estadoGlobal.currentHistoricoPageSize);
    }

    _handleHistoricoPaginationClick(e) {
        e.preventDefault();
        // Look for links with data-page starting with 'historico-'
        const clickedPageLink = e.target.closest('a[data-page^="historico-"]');
        const clickedActionButton = e.target.closest('a[data-action^="historico-"]');

        if (clickedPageLink) {
            // Extract the page number from the data-page attribute (e.g., "historico-4" -> "4")
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

            if (action === 'historico-prev') {
                if (newPage > 1) newPage--;
            } else if (action === 'historico-next') {
                if (newPage < estadoGlobal.totalHistoricoPages) newPage++;
            }

            if (newPage !== estadoGlobal.currentHistoricoPage) {
                this.renderHistoricoRetiradas(newPage, estadoGlobal.currentHistoricoFilters, estadoGlobal.currentHistoricoPageSize);
            }
            return;
        }
    }

    _handleHistoricoPageSizeChange(e) {
        if (e.target.id === this.historicoPageSizeSelectId) {
            const newPageSize = parseInt(e.target.value);
            this.renderHistoricoRetiradas(1, estadoGlobal.currentHistoricoFilters, newPageSize);
        }
    }

    _bindPendentesEvents() {
        const pendentesPaginationNav = document.getElementById('pendentes-pagination-nav');
        const pageSizeSelect = document.getElementById(this.pendentesPageSizeSelectId);

        if (!pendentesPaginationNav) return;

        // Remove previous listeners to prevent duplicates
        pendentesPaginationNav.removeEventListener('click', this._boundHandlePendentesPaginationClick); // Assuming you'd have a bound handler for pendentes
        if (pageSizeSelect) {
            pageSizeSelect.removeEventListener('change', this._boundHandlePendentesPageSizeChange); // Assuming you'd have a bound handler for pendentes
        }

        // Add new listeners
        pendentesPaginationNav.addEventListener('click', this._boundHandlePendentesPaginationClick);
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', this._boundHandlePendentesPageSizeChange);
        }
    }

    // New bound handler for pendentes pagination clicks
    _boundHandlePendentesPaginationClick = (e) => {
        e.preventDefault();
        const clickedPageLink = e.target.closest('a[data-page^="pendentes-"]');
        const clickedActionButton = e.target.closest('a[data-action^="pendentes-"]');

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

            if (action === 'pendentes-prev') {
                if (newPage > 1) newPage--;
            } else if (action === 'pendentes-next') {
                if (newPage < estadoGlobal.totalPendentesPages) newPage++;
            }

            if (newPage !== estadoGlobal.currentPendentesPage) {
                this.renderPendentesRetiradas(newPage, estadoGlobal.currentPendentesPageSize);
            }
            return;
        }
    }

    // New bound handler for pendentes page size changes
    _boundHandlePendentesPageSizeChange = (e) => {
        if (e.target.id === this.pendentesPageSizeSelectId) {
            const newPageSize = parseInt(e.target.value);
            this.renderPendentesRetiradas(1, newPageSize);
        }
    }


    _bindCommonRetiradaActions() {
        // Remove previous listeners to avoid duplicates for common actions
        document.querySelectorAll('.btn-detalhes-retirada').forEach(btn => {
            btn.removeEventListener('click', this._boundHandleDetalhesRetiradaClick);
        });
        document.querySelectorAll('.btn-autorizar-retirada-trigger').forEach(btn => {
            btn.removeEventListener('click', this._boundHandleAutorizarRetiradaClick);
        });

        // Add new listeners for common actions
        document.querySelectorAll('.btn-detalhes-retirada').forEach(btn => {
            btn.addEventListener('click', this._boundHandleDetalhesRetiradaClick);
        });

        document.querySelectorAll('.btn-autorizar-retirada-trigger').forEach(btn => {
            btn.addEventListener('click', this._boundHandleAutorizarRetiradaClick);
        });
    }

    // Bound handler for detalhes retirada button
    _boundHandleDetalhesRetiradaClick = (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const retirada = [...estadoGlobal.allRetiradas, ...estadoGlobal.pendentesRetiradas].find(r => r.retirada_id === id);
        if (retirada) {
            uiService.fillModalDetalhes(retirada);
            uiService.getModalInstance('modalVerDetalhesRetirada').show();
        } else {
            showAlert('Detalhes da retirada não encontrados.', 'warning');
        }
    }

    // Bound handler for autorizar retirada button
    _boundHandleAutorizarRetiradaClick = (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const retirada = estadoGlobal.pendentesRetiradas.find(x => x.retirada_id === id);
        if (retirada) {
            uiService.fillModalAutorizar(retirada);
            uiService.getModalInstance('modalAutorizarRetirada').show();
        } else {
            showAlert('Retirada pendente não encontrada para autorização.', 'warning');
        }
    }

    async _handleAuthorizeDeny(action, e) {
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
            this.renderPendentesRetiradas(estadoGlobal.currentPendentesPage, estadoGlobal.currentPendentesPageSize);
        } catch (error) {
            showAlert(error.message || `Erro ao ${action === 'AUTORIZADA' ? 'autorizar' : 'negar'} retirada.`, 'danger');
        }
    }

    // NOVO: Função para lidar com a conclusão de uma retirada
    async _handleConcluirRetirada(retiradaId, detalhe) {
        uiService.showLoading();
        try {
            await apiService.updateRetiradaStatus(retiradaId, estadoGlobal.statusMapUpdate.CONCLUIDA, detalhe);
            showAlert('Retirada marcada como "Concluída" com sucesso! Estoque decrementado.', 'success');
            this.modalConcluirRetirada.hide(); // Fecha o modal de conclusão

            // Recarrega a tela de histórico para refletir a mudança de status
            this.renderHistoricoRetiradas(estadoGlobal.currentHistoricoPage, estadoGlobal.currentHistoricoFilters, estadoGlobal.currentHistoricoPageSize);
        } catch (error) {
            console.error("Erro ao concluir retirada", error);
            showAlert(error.message || 'Erro ao concluir a retirada. Verifique o estoque!', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }
}

export const retiradasModule = new RetiradasModule();
