// frontend/static/js/retiradasModule.js
import { apiService } from './apiService.js';
import { dataService } from './dataService.js';
import { uiService } from './uiService.js';
import { showAlert, getStatusText, getStatusValue, getModalInstance } from './utils.js';
import estadoGlobal from './estadoGlobal.js';

class RetiradasModule {
    constructor() {
        this.historicoPageSizeSelectId = 'historicoPageSize';
        this.pendentesPageSizeSelectId = 'pendentesPageSize';

        // Definir a instância do modal uma vez, se possível, ou garantir que seja sempre a mesma
        // Mas como o modal HTML pode ser removido e recriado, o melhor é obter a instância a cada vez que for usar.
    }

    async renderHistoricoRetiradas(page = 1, filters = estadoGlobal.currentHistoricoFilters, pageSize = estadoGlobal.currentHistoricoPageSize) {
        try {
            const data = await dataService.getProcessedRetiradas(apiService.fetchAllRetiradas.bind(apiService), page, pageSize, filters);
            estadoGlobal.setHistoricoPagination(data.current_page, data.total_pages, pageSize, filters);
            estadoGlobal.setAllRetiradas(data.items);

            const filterFormHtml = this._getHistoricoFilterFormHtml(filters);
            const tableHeaders = ['ID', 'Usuário', 'Data', 'Status'];
            
            const tableHtml = uiService.renderTable(tableHeaders, estadoGlobal.allRetiradas, {
                rowMapper: (r) => [r.retirada_id, r.usuario_nome, new Date(r.data_solicitacao).toLocaleDateString('pt-BR'), getStatusText(r.status)],
                actionsHtml: (r) => `<button class="btn btn-sm btn-primary btn-detalhes-retirada" data-id="${r.retirada_id}">Ver detalhes</button>`
            });

            const paginationHtml = uiService.renderPagination(estadoGlobal.currentHistoricoPage, estadoGlobal.totalHistoricoPages, 'historico');
            const pageSizeSelectHtml = uiService.renderPageSizeSelect(this.historicoPageSizeSelectId, estadoGlobal.currentHistoricoPageSize);

            uiService.renderPage('Histórico de Retiradas', `
                <div class="card mb-4">
                    <div class="card-header">Filtros de Busca</div>
                    <div class="card-body">${filterFormHtml}</div>
                </div>
                ${tableHtml}
                ${paginationHtml}
                ${pageSizeSelectHtml}
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
            const data = await dataService.getProcessedRetiradas(apiService.fetchRetiradasPendentes.bind(apiService), page, pageSize);
            estadoGlobal.setPendentesPagination(data.current_page, data.total_pages, pageSize);
            estadoGlobal.setPendentesRetiradas(data.items);

            const tableHeaders = ['ID', 'Usuário', 'Setor', 'Data'];
            const tableOptions = {
                rowMapper: (r) => [r.retirada_id, r.usuario_nome, r.setor_nome, new Date(r.data_solicitacao).toLocaleDateString('pt-BR')],
                actionsHtml: (r) => `
                    <button class="btn btn-sm btn-success btn-autorizar-retirada-trigger" data-id="${r.retirada_id}">
                        Autorizar/Negar
                    </button>
                    <button class="btn btn-sm btn-info btn-detalhes-retirada" data-id="${r.retirada_id}">
                        Ver detalhes
                    </button>
                `
            };

            const tableHtml = uiService.renderTable(tableHeaders, estadoGlobal.pendentesRetiradas, tableOptions);
            const paginationHtml = uiService.renderPagination(estadoGlobal.currentPendentesPage, estadoGlobal.totalPendentesPages, 'pendentes');
            const pageSizeSelectHtml = uiService.renderPageSizeSelect(this.pendentesPageSizeSelectId, estadoGlobal.currentPendentesPageSize);

            uiService.renderPage('Retiradas Pendentes', `
                ${tableHtml}
                ${paginationHtml}
                ${pageSizeSelectHtml}
            `);

            this._bindPendentesEvents(); // Este é o ponto chave para religar os listeners
            this._bindCommonRetiradaActions(); // E este para os botões de ação

        } catch (error) {
            console.error("Erro ao renderizar retiradas pendentes:", error);
            showAlert(error.message || 'Ocorreu um erro ao carregar as retiradas pendentes.', 'danger');
        }
    }

    _getHistoricoFilterFormHtml(currentFilters) {
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

        // Paginação
        document.querySelector('[data-action="prev-historico"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (estadoGlobal.currentHistoricoPage > 1) {
                this.renderHistoricoRetiradas(estadoGlobal.currentHistoricoPage - 1, estadoGlobal.currentHistoricoFilters, estadoGlobal.currentHistoricoPageSize);
            }
        });

        document.querySelector('[data-action="next-historico"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (estadoGlobal.currentHistoricoPage < estadoGlobal.totalHistoricoPages) {
                this.renderHistoricoRetiradas(estadoGlobal.currentHistoricoPage + 1, estadoGlobal.currentHistoricoFilters, estadoGlobal.currentHistoricoPageSize);
            }
        });

        document.querySelectorAll('[data-page-historico]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.pageHistorico);
                this.renderHistoricoRetiradas(page, estadoGlobal.currentHistoricoFilters, estadoGlobal.currentHistoricoPageSize);
            });
        });

        // Alterar tamanho da página
        document.getElementById(this.historicoPageSizeSelectId)?.addEventListener('change', (e) => {
            const newPageSize = parseInt(e.target.value);
            this.renderHistoricoRetiradas(1, estadoGlobal.currentHistoricoFilters, newPageSize);
        });
    }

    _bindPendentesEvents() {
        // Paginação
        document.querySelector('[data-action="prev-pendentes"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (estadoGlobal.currentPendentesPage > 1) {
                this.renderPendentesRetiradas(estadoGlobal.currentPendentesPage - 1, estadoGlobal.currentPendentesPageSize);
            }
        });

        document.querySelector('[data-action="next-pendentes"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (estadoGlobal.currentPendentesPage < estadoGlobal.totalPendentesPages) {
                this.renderPendentesRetiradas(estadoGlobal.currentPendentesPage + 1, estadoGlobal.currentPendentesPageSize);
            }
        });

        document.querySelectorAll('[data-page-pendentes]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.pagePendentes);
                this.renderPendentesRetiradas(page, estadoGlobal.currentPendentesPageSize);
            });
        });

        // Alterar tamanho da página
        document.getElementById(this.pendentesPageSizeSelectId)?.addEventListener('change', (e) => {
            const newPageSize = parseInt(e.target.value);
            this.renderPendentesRetiradas(1, newPageSize);
        });
        // Alterar tamanho da página
        document.getElementById(this.pendentesPageSizeSelectId)?.addEventListener('change', (e) => {
            const newPageSize = parseInt(e.target.value);
            this.renderPendentesRetiradas(1, newPageSize);
        });

    }

    _bindCommonRetiradaActions() {
        // O event listener do botão "Autorizar/Negar" também precisa ser re-anexado
        document.querySelectorAll('.btn-detalhes-retirada').forEach(btn => {
            btn.onclick = () => {
                const id = +btn.dataset.id;
                const retirada = [...estadoGlobal.allRetiradas, ...estadoGlobal.pendentesRetiradas].find(x => x.retirada_id === id);
                if (retirada) {
                    uiService.fillModalDetalhes(retirada);
                    uiService.getModalInstance('modalVerDetalhesRetirada').show();
                }
            };
        });

        document.querySelectorAll('.btn-autorizar-retirada-trigger').forEach(btn => {
            btn.onclick = () => {
                const id = +btn.dataset.id;
                const retirada = estadoGlobal.pendentesRetiradas.find(x => x.retirada_id === id);
                if (retirada) {
                    uiService.fillModalAutorizar(retirada);
                    // Usar uiService.getModalInstance para obter e mostrar o modal
                    uiService.getModalInstance('modalAutorizarRetirada').show();
                }
            };
        });
    }

    async _handleAuthorizeDeny(action, e) {
        const id = +e.currentTarget.dataset.id;
        const detalheInput = document.getElementById('autorizarDetalheStatus'); // Obter o elemento input
        const detalhe = detalheInput.value.trim();
        const statusValue = getStatusValue(action); // getStatusValue já retorna o int

        if (action === 'NEGADA' && !detalhe) {
            showAlert('O detalhe do status (justificativa da negação) é obrigatório ao negar.', 'warning');
            detalheInput.focus(); // Usar o elemento input
            return;
        }

        try {
            await apiService.updateRetiradaStatus(id, statusValue, detalhe);
            showAlert(`Retirada ${action === 'AUTORIZADA' ? 'autorizada' : 'negada'} com sucesso!`, 'success');
            getModalInstance('modalAutorizarRetirada').hide();
            // Re-renderizar as retiradas pendentes para refletir a mudança
            this.renderPendentesRetiradas(estadoGlobal.currentPendentesPage, estadoGlobal.currentPendentesPageSize);
        } catch (error) {
            showAlert(error.message || `Erro ao ${action === 'AUTORIZADA' ? 'autorizar' : 'negar'} retirada.`, 'danger');
        }
    }
}

export const retiradasModule = new RetiradasModule();