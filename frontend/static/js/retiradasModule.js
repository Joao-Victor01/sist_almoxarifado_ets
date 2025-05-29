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
    }

    async renderHistoricoRetiradas(page = 1, filters = estadoGlobal.currentHistoricoFilters, pageSize = estadoGlobal.currentHistoricoPageSize) {
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
                        <button class="btn btn-sm btn-primary btn-detalhes-retirada" data-id="${r.retirada_id}">Ver detalhes</button>
                    `;
                    // Adicionar botão de "Concluir" SOMENTE se o status for AUTORIZADA
                    if (r.status === estadoGlobal.statusMapUpdate.AUTORIZADA) {
                        actions += `
                            <button class="btn btn-sm btn-success btn-concluir-retirada-trigger ms-2" data-id="${r.retirada_id}">
                                Concluir Retirada
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
        }
    }

    async renderPendentesRetiradas(page = 1, pageSize = estadoGlobal.currentPendentesPageSize) {
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
                        Autorizar/Negar
                    </button>
                    <button class="btn btn-sm btn-info btn-detalhes-retirada" data-id="${r.retirada_id}">
                        Ver detalhes
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
        }
    }

    // NOVO: Lógica para o modal de Concluir Retirada
    _bindConcluirRetiradaEvents() {
        // Delegate event for "Concluir Retirada" buttons
        document.querySelectorAll('.btn-concluir-retirada-trigger').forEach(btn => {
            btn.onclick = () => {
                const id = +btn.dataset.id;
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
        this.btnConfirmarConcluirRetirada.onclick = () => {
            const retiradaId = +this.concluirRetiradaIdInput.value;
            const detalhe = this.concluirDetalheStatusInput.value.trim();
            this._handleConcluirRetirada(retiradaId, detalhe);
        };
    }

    _getHistoricoFilterFormHtml(currentFilters) {
        return `
            <form id="form-filter-historico">
                <div class="d-flex flex-wrap align-items-end gap-3 mb-3">
                    <div class="flex-grow-1">
                        <label for="filterStatus" class="form-label">Status</label>
                        <select class="form-select" id="filterStatus">
                            <option value="">Todos</option>
                            <option value="PENDENTE" ${currentFilters.status === estadoGlobal.statusMapUpdate.PENDENTE ? 'selected' : ''}>Pendente</option>
                            <option value="AUTORIZADA" ${currentFilters.status === estadoGlobal.statusMapUpdate.AUTORIZADA ? 'selected' : ''}>Autorizada</option>
                            <option value="CONCLUIDA" ${currentFilters.status === estadoGlobal.statusMapUpdate.CONCLUIDA ? 'selected' : ''}>Concluída</option>
                            <option value="NEGADA" ${currentFilters.status === estadoGlobal.statusMapUpdate.NEGADA ? 'selected' : ''}>Negada</option>
                        </select>
                    </div>
                    <div class="flex-grow-1">
                        <label for="filterSolicitante" class="form-label">Solicitante</label>
                        <input type="text" class="form-control" id="filterSolicitante" value="${currentFilters.solicitante || ''}" placeholder="Nome do Solicitante">
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
        document.getElementById('form-filter-historico')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedStatusString = document.getElementById('filterStatus').value;
            const statusInt = selectedStatusString ? estadoGlobal.statusMapUpdate[selectedStatusString] : null;

            const filters = {
                status: statusInt,
                solicitante: document.getElementById('filterSolicitante').value,
                start_date: document.getElementById('filterStartDate').value,
                end_date: document.getElementById('filterEndDate').value,
            };
            this.renderHistoricoRetiradas(1, filters, estadoGlobal.currentHistoricoPageSize);
        });

        document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
            document.getElementById('filterStatus').value = '';
            document.getElementById('filterSolicitante').value = '';
            document.getElementById('filterStartDate').value = '';
            document.getElementById('filterEndDate').value = '';
            this.renderHistoricoRetiradas(1, {}, estadoGlobal.currentHistoricoPageSize);
        });

        // Event delegation for pagination links
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.querySelectorAll('[data-action^="historico-"]').forEach(el => {
                if (el.tagName === 'A' && el.dataset.action !== 'historico-pagesize') {
                    el.onclick = (e) => {
                        e.preventDefault();
                        const action = e.currentTarget.dataset.action;
                        let newPage = estadoGlobal.currentHistoricoPage;
                        let newPageSize = estadoGlobal.currentHistoricoPageSize;

                        if (action === 'historico-prev') {
                            if (newPage > 1) newPage--;
                            else return;
                        }
                        else if (action === 'historico-next') {
                            if (newPage < estadoGlobal.totalHistoricoPages) newPage++;
                            else return;
                        }
                        else if (action === 'historico-page') {
                            newPage = parseInt(e.currentTarget.dataset.page);
                        }
                        this.renderHistoricoRetiradas(newPage, estadoGlobal.currentHistoricoFilters, newPageSize);
                    };
                }
            });

            // Explicitly bind change event for the page size select
            const pageSizeSelect = document.getElementById(this.historicoPageSizeSelectId);
            if (pageSizeSelect) {
                pageSizeSelect.onchange = (e) => {
                    const newPageSize = parseInt(e.currentTarget.value);
                    const newPage = 1; // Reset to first page when page size changes
                    this.renderHistoricoRetiradas(newPage, estadoGlobal.currentHistoricoFilters, newPageSize);
                };
            }
        }
    }

    _bindPendentesEvents() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.querySelectorAll('[data-action^="pendentes-"]').forEach(el => {
                if (el.tagName === 'A' && el.dataset.action !== 'pendentes-pagesize') {
                    el.onclick = (e) => {
                        e.preventDefault();
                        const action = e.currentTarget.dataset.action;
                        let newPage = estadoGlobal.currentPendentesPage;
                        let newPageSize = estadoGlobal.currentPendentesPageSize;

                        if (action === 'pendentes-prev') {
                            if (newPage > 1) newPage--;
                            else return;
                        }
                        else if (action === 'pendentes-next') {
                            if (newPage < estadoGlobal.totalPendentesPages) newPage++;
                            else return;
                        }
                        else if (action === 'pendentes-page') {
                            newPage = parseInt(e.currentTarget.dataset.page);
                        }
                        this.renderPendentesRetiradas(newPage, newPageSize);
                    };
                }
            });

            // Explicitly bind change event for the page size select
            const pageSizeSelect = document.getElementById(this.pendentesPageSizeSelectId);
            if (pageSizeSelect) {
                pageSizeSelect.onchange = (e) => {
                    const newPageSize = parseInt(e.currentTarget.value);
                    const newPage = 1; // Reset to first page when page size changes
                    this.renderPendentesRetiradas(newPage, newPageSize);
                };
            }
        }
    }

    _bindCommonRetiradaActions() {
        document.querySelectorAll('.btn-detalhes-retirada').forEach(btn => {
            btn.onclick = () => {
                const id = +btn.dataset.id;
                const retirada = [...estadoGlobal.allRetiradas, ...estadoGlobal.pendentesRetiradas].find(x => x.retirada_id === id);
                if (retirada) {
                    uiService.fillModalDetalhes(retirada);
                    uiService.getModalInstance('modalVerDetalhesRetirada').show();
                } else {
                    showAlert('Detalhes da retirada não encontrados.', 'warning');
                }
            };
        });

        document.querySelectorAll('.btn-autorizar-retirada-trigger').forEach(btn => {
            btn.onclick = () => {
                const id = +btn.dataset.id;
                const retirada = estadoGlobal.pendentesRetiradas.find(x => x.retirada_id === id);
                if (retirada) {
                    uiService.fillModalAutorizar(retirada);
                    uiService.getModalInstance('modalAutorizarRetirada').show();
                } else {
                    showAlert('Retirada pendente não encontrada para autorização.', 'warning');
                }
            };
        });
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
            console.error("Erro ao concluir retirada:", error);
            showAlert(error.message || 'Erro ao concluir a retirada. Verifique o estoque!', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }
}

export const retiradasModule = new RetiradasModule();