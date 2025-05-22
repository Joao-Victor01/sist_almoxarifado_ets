// frontend/static/js/retiradasModule.js
import { apiService } from './apiService.js';
import { dataService } from './dataService.js';
import { uiService } from './uiService.js';
import { showAlert, getStatusText, getStatusValue } from './utils.js'; // Removido getModalInstance daqui, pois uiService a encapsula.
import estadoGlobal from './estadoGlobal.js';

class RetiradasModule {
    constructor() {
        this.historicoPageSizeSelectId = 'historicoPageSize';
        this.pendentesPageSizeSelectId = 'pendentesPageSize';
    }


     async renderHistoricoRetiradas(page = 1, filters = estadoGlobal.currentHistoricoFilters, pageSize = estadoGlobal.currentHistoricoPageSize) {
        try {

            console.log('DEBUG: Historico - Valores para renderPagination:', {
                page: estadoGlobal.currentHistoricoPage,
                totalPages: estadoGlobal.totalHistoricoPages,
                type: 'historico',
                pageSizeSelectId: this.historicoPageSizeSelectId,
                currentPageSizePassed: estadoGlobal.currentHistoricoPageSize // Adicione esta linha
            });

            const data = await dataService.getProcessedRetiradas(apiService.fetchAllRetiradas.bind(apiService), page, pageSize, filters);
            estadoGlobal.setHistoricoPagination(data.current_page, data.total_pages, pageSize, filters);
            estadoGlobal.setAllRetiradas(data.items);

            const filterFormHtml = this._getHistoricoFilterFormHtml(filters);
            const tableHeaders = ['ID', 'Usuário', 'Data', 'Status', 'Ações'];
            
            // Passar o array de objetos 'estadoGlobal.allRetiradas' diretamente
            // e a função 'rowMapper' dentro das options
            const tableHtml = uiService.renderTable(tableHeaders, estadoGlobal.allRetiradas, {
                noRecordsMessage: "Nenhum histórico de retirada encontrado.",
                rowMapper: (r) => [
                    r.retirada_id,
                    r.usuario_nome,
                    new Date(r.data_solicitacao).toLocaleDateString('pt-BR'),
                    getStatusText(r.status)
                ],
                actionsHtml: (r) => `
                    <button class="btn btn-sm btn-primary btn-detalhes-retirada" data-id="${r.retirada_id}">Ver detalhes</button>
                `
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
            this._bindCommonRetiradaActions();

        } catch (error) {
            console.error("Erro ao renderizar histórico de retiradas:", error);
            showAlert(error.message || 'Ocorreu um erro ao carregar o histórico de retiradas.', 'danger');
        }
    }

    async renderPendentesRetiradas(page = 1, pageSize = estadoGlobal.currentPendentesPageSize) {
        try {
            console.log('DEBUG: Pendentes - Valores para renderPagination:', {
                page: estadoGlobal.currentPendentesPage,
                totalPages: estadoGlobal.totalPendentesPages,
                type: 'pendentes',
                pageSizeSelectId: this.pendentesPageSizeSelectId,
                currentPageSizePassed: estadoGlobal.currentPendentesPageSize // Adicione esta linha
            });
            const data = await dataService.getProcessedRetiradas(apiService.fetchRetiradasPendentes.bind(apiService), page, pageSize);
            estadoGlobal.setPendentesPagination(data.current_page, data.total_pages, pageSize);
            estadoGlobal.setPendentesRetiradas(data.items);

            const tableHeaders = ['ID', 'Usuário', 'Setor', 'Data', 'Ações'];
            
            // Passar o array de objetos 'estadoGlobal.pendentesRetiradas' diretamente
            // e as funções 'rowMapper' e 'actionsHtml' dentro das options
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

    _getHistoricoFilterFormHtml(currentFilters) {
        // Correção aqui: currentFilters.status pode ser um número, então precisa ser comparado com o número
        // para manter o 'selected' no option correto.
        return `
            <form id="form-filter-historico">
                <div class="row g-3">
                    <div class="col-md-4">
                        <label for="filterStatus" class="form-label">Status</label>
                        <select class="form-select" id="filterStatus">
                            <option value="">Todos</option>
                            <option value="PENDENTE" ${currentFilters.status === 1 ? 'selected' : ''}>Pendente</option>
                            <option value="AUTORIZADA" ${currentFilters.status === 2 ? 'selected' : ''}>Autorizada</option>
                            <option value="CONCLUIDA" ${currentFilters.status === 3 ? 'selected' : ''}>Concluída</option>
                            <option value="NEGADA" ${currentFilters.status === 4 ? 'selected' : ''}>Negada</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label for="filterSolicitante" class="form-label">Solicitante</label>
                        <input type="text" class="form-control" id="filterSolicitante" value="${currentFilters.solicitante || ''}">
                    </div>
                    <div class="col-md-4">
                        <label for="filterStartDate" class="form-label">Data Inicial</label>
                        <input type="date" class="form-control" id="filterStartDate" value="${currentFilters.start_date || ''}">
                    </div>
                    <div class="col-md-4">
                        <label for="filterEndDate" class="form-label">Data Final</label>
                        <input type="date" class="form-control" id="filterEndDate" value="${currentFilters.end_date || ''}">
                    </div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary" id="btn-search-historico">Buscar</button>
                        <button type="button" class="btn btn-secondary ms-2" id="btn-clear-filters">Limpar Filtros</button>
                    </div>
                </div>
            </form>
        `;
    }

    _bindHistoricoEvents() {
        // Form de filtro
        document.getElementById('form-filter-historico')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedStatusString = document.getElementById('filterStatus').value;
            // Converte a string do status para o valor inteiro usando estadoGlobal.statusMapUpdate
            const statusInt = selectedStatusString ? estadoGlobal.statusMapUpdate[selectedStatusString] : null;

            const filters = {
                status: statusInt, // Use o valor inteiro aqui
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

        // Paginação (Event Delegation)
        // Adicionamos um listener genérico ao elemento 'main-content' (ou ao corpo do documento)
        // e verificamos o 'data-action' do elemento clicado.
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.querySelectorAll('[data-action^="historico-"]').forEach(el => {
                el.onclick = (e) => {
                    e.preventDefault();
                    const action = e.currentTarget.dataset.action;
                    let newPage = estadoGlobal.currentHistoricoPage;
                    let newPageSize = estadoGlobal.currentHistoricoPageSize;

                    if (action === 'historico-prev') {
                        if (newPage > 1) newPage--;
                        else return; // Não faz nada se já está na primeira página
                    }
                    else if (action === 'historico-next') {
                        if (newPage < estadoGlobal.totalHistoricoPages) newPage++;
                        else return; // Não faz nada se já está na última página
                    }
                    else if (action === 'historico-page') {
                        newPage = parseInt(e.currentTarget.dataset.page);
                    }
                    else if (action === 'historico-pagesize') {
                        newPageSize = parseInt(e.currentTarget.value);
                        newPage = 1; // Reseta para a primeira página ao mudar o tamanho
                    }
                    this.renderHistoricoRetiradas(newPage, estadoGlobal.currentHistoricoFilters, newPageSize);
                };
            });
        }
    }

    _bindPendentesEvents() {
        // Paginação (Event Delegation)
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.querySelectorAll('[data-action^="pendentes-"]').forEach(el => {
                el.onclick = (e) => {
                    e.preventDefault();
                    const action = e.currentTarget.dataset.action;
                    let newPage = estadoGlobal.currentPendentesPage;
                    let newPageSize = estadoGlobal.currentPendentesPageSize;

                    if (action === 'pendentes-prev') {
                        if (newPage > 1) newPage--;
                        else return; // Não faz nada se já está na primeira página
                    }
                    else if (action === 'pendentes-next') {
                        if (newPage < estadoGlobal.totalPendentesPages) newPage++;
                        else return; // Não faz nada se já está na última página
                    }
                    else if (action === 'pendentes-page') {
                        newPage = parseInt(e.currentTarget.dataset.page);
                    }
                    else if (action === 'pendentes-pagesize') {
                        newPageSize = parseInt(e.currentTarget.value);
                        newPage = 1; // Reseta para a primeira página ao mudar o tamanho
                    }
                    this.renderPendentesRetiradas(newPage, newPageSize);
                };
            });
        }
    }

    _bindCommonRetiradaActions() {
        // Detalhes da Retirada (botão "Ver detalhes" em ambas as telas)
        document.querySelectorAll('.btn-detalhes-retirada').forEach(btn => {
            btn.onclick = () => {
                const id = +btn.dataset.id;
                // Busca a retirada na lista de histórico ou pendentes
                const retirada = [...estadoGlobal.allRetiradas, ...estadoGlobal.pendentesRetiradas].find(x => x.retirada_id === id);
                if (retirada) {
                    uiService.fillModalDetalhes(retirada);
                    uiService.getModalInstance('modalVerDetalhesRetirada').show();
                } else {
                    showAlert('Detalhes da retirada não encontrados.', 'warning');
                }
            };
        });

        // Abrir Modal de Autorizar/Negar (apenas na tela de Pendentes)
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

    // Método para lidar com a autorização ou negação da retirada
    async _handleAuthorizeDeny(action, e) {
        const id = parseInt(e.currentTarget.dataset.id); // Converte para int
        const detalheInput = document.getElementById('autorizarDetalheStatus');
        const detalhe = detalheInput.value.trim();
        const statusValue = getStatusValue(action); // Pega o valor int do status (1, 2, 3, 4)

        if (action === 'NEGADA' && !detalhe) {
            showAlert('O detalhe do status (justificativa da negação) é obrigatório ao negar.', 'warning');
            detalheInput.focus();
            return;
        }

        try {
            await apiService.updateRetiradaStatus(id, statusValue, detalhe);
            showAlert(`Retirada ${action === 'AUTORIZADA' ? 'autorizada' : 'negada'} com sucesso!`, 'success');
            uiService.getModalInstance('modalAutorizarRetirada').hide(); // Usa a instância do uiService
            
            // Re-renderizar as retiradas pendentes para refletir a mudança
            this.renderPendentesRetiradas(estadoGlobal.currentPendentesPage, estadoGlobal.currentPendentesPageSize);
        } catch (error) {
            showAlert(error.message || `Erro ao ${action === 'AUTORIZADA' ? 'autorizar' : 'negar'} retirada.`, 'danger');
        }
    }
}

export const retiradasModule = new RetiradasModule();