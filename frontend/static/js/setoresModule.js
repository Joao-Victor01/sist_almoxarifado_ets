// frontend/static/js/setoresModule.js

import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert } from './utils.js';

class SetoresModule {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10; // Default page size
        this.searchNome = ''; // Current search term for sector name
        this.totalSetores = 0; // To store total sectors for pagination calculation

        // Modals
        this.modalCadastrarSetor = uiService.getModalInstance('modalCadastrarSetor');
        this.modalEditarSetor = uiService.getModalInstance('modalEditarSetor');
        this.modalConfirmarDeleteSetor = uiService.getModalInstance('modalConfirmarDeleteSetor');

        // Forms
        this.formCadastrarSetor = document.getElementById('form-cadastrar-setor');
        this.formEditarSetor = document.getElementById('form-editar-setor');

        // Buttons
        this.btnSalvarCadastrarSetor = document.getElementById('btn-salvar-cadastrar-setor');
        this.btnSalvarEditarSetor = document.getElementById('btn-salvar-editar-setor');
        this.btnConfirmarDeletarSetor = document.getElementById('btn-confirmar-deletar-setor');

        // Bindings for event listeners to avoid duplication
        this.boundHandlePaginationClick = this._handlePaginationClick.bind(this);
        this.boundHandlePageSizeChange = this._handlePageSizeChange.bind(this);
        this.boundHandleSearchSetores = this._handleSearchSetores.bind(this);
        this.boundHandleClearSearch = this._handleClearSearch.bind(this);
        this.boundHandleTableActions = this._handleTableActions.bind(this);
        this.boundUpdateSetor = this._updateSetor.bind(this); // Bind update method
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Cadastrar Setor
        document.getElementById('btn-open-cadastrar-setor')?.addEventListener('click', e => {
            e.preventDefault();
            this.formCadastrarSetor.reset();
            this.modalCadastrarSetor.show();
        });

        this.btnSalvarCadastrarSetor?.addEventListener('click', () => this._createSetor());

        // Confirmar Deleção
        this.btnConfirmarDeletarSetor?.addEventListener('click', this._deleteSetorConfirmed.bind(this));

        // Salvar Edição
        this.btnSalvarEditarSetor?.addEventListener('click', this.boundUpdateSetor);
    }

    async renderSetoresList() {
        uiService.showLoading();
        try {
            // Fetch all sectors. For simplicity, fetching all and then filtering/paginating in frontend
            // For large datasets, backend pagination/filtering would be more efficient.
            const allSetores = await apiService.get('/setores');

            const filteredSetores = this.searchNome
                ? allSetores.filter(s => s.nome_setor.toLowerCase().includes(this.searchNome.toLowerCase()))
                : allSetores;

            this.totalSetores = filteredSetores.length; // Update total sectors count
            const totalPages = Math.ceil(this.totalSetores / this.pageSize);

            const offset = (this.currentPage - 1) * this.pageSize;
            const setoresForPage = filteredSetores.slice(offset, offset + this.pageSize);

            const tableHeaders = ['ID', 'Nome', 'Descrição', 'Ações'];
            const tableHtml = uiService.renderTable(tableHeaders, setoresForPage, {
                noRecordsMessage: 'Nenhum setor encontrado.',
                rowMapper: (setor) => [
                    setor.setor_id,
                    setor.nome_setor,
                    setor.descricao_setor || '-'
                ],
                actionsHtml: (setor) => `
                    <div class="d-flex flex-wrap justify-content-center gap-1">
                        <button class="btn btn-sm btn-primary btn-acoes btn-editar-setor" data-id="${setor.setor_id}">
                            <i class="bi bi-pencil-square"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger btn-acoes btn-deletar-setor" data-id="${setor.setor_id}">
                            <i class="bi bi-trash"></i> Deletar
                        </button>
                    </div>
                `
            });

            const paginationHtml = uiService.renderPagination(
                this.currentPage,
                totalPages,
                'setores', // type for pagination links
                'setoresPageSizeSelect', // id for pageSize select element
                this.pageSize
            );

            const searchBarHtml = `
                <div class="card mb-3">
                    <div class="card-header">Filtros de Busca</div>
                    <div class="card-body">
                        <form id="search-bar-setores" class="row g-3 mb-0">
                            <div class="col-12 col-md">
                                <label for="search-setor-nome" class="form-label">Nome do Setor</label>
                                <input type="text" id="search-setor-nome" class="form-control" placeholder="Buscar por nome" value="${this.searchNome}">
                            </div>
                            <div class="col-12 col-md d-flex justify-content-end align-items-end">
                                <button type="button" id="btn-search-setor" class="btn btn-primary me-2">Buscar</button>
                                <button type="button" id="btn-clear-search-setor" class="btn btn-secondary">Limpar</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            uiService.renderPage('Gerenciamento de Setores', `
                ${searchBarHtml}
                ${tableHtml}
                ${paginationHtml}
            `);

            this._bindPageEvents(); // Re-bind events after content is rendered
            this._bindTableActions(); // Re-bind table action events

        } catch (error) {
            console.error('Erro ao renderizar lista de setores', error);
            showAlert(error.message || 'Erro ao carregar setores.', 'danger');
            uiService.renderPage('Gerenciamento de Setores', `<div class="alert alert-warning">Erro ao carregar setores: ${error.message || 'Verifique sua conexão.'}</div>`);
        } finally {
            uiService.hideLoading();
        }
    }

    _bindPageEvents() {
        const paginationNav = document.getElementById('setores-pagination-nav');
        const pageSizeSelect = document.getElementById('setoresPageSizeSelect');
        const btnClearSearch = document.getElementById('btn-clear-search-setor');
        const btnSearch = document.getElementById('btn-search-setor');

        // Remove previous listeners to prevent duplication
        if (paginationNav) {
            paginationNav.removeEventListener('click', this.boundHandlePaginationClick);
        }
        if (pageSizeSelect) {
            pageSizeSelect.removeEventListener('change', this.boundHandlePageSizeChange);
        }
        if (btnSearch) {
            btnSearch.removeEventListener('click', this.boundHandleSearchSetores);
        }
        if (btnClearSearch) {
            btnClearSearch.removeEventListener('click', this.boundHandleClearSearch);
        }

        // Add new listeners
        if (paginationNav) {
            paginationNav.addEventListener('click', this.boundHandlePaginationClick);
        }
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', this.boundHandlePageSizeChange);
        }
        if (btnSearch) {
            btnSearch.addEventListener('click', this.boundHandleSearchSetores);
        }
        if (btnClearSearch) {
            btnClearSearch.addEventListener('click', this.boundHandleClearSearch);
        }
    }

    _handlePaginationClick(e) {
        e.preventDefault();

        const clickedPageLink = e.target.closest('a[data-page^="setores-"]');
        const clickedActionButton = e.target.closest('a[data-action^="setores-"]');

        if (clickedPageLink) {
            const pageValue = clickedPageLink.dataset.page.split('-')[1];
            const newPage = parseInt(pageValue);
            const totalPages = Math.ceil(this.totalSetores / this.pageSize); // Recalculate based on current total

            if (!isNaN(newPage) && newPage !== this.currentPage && newPage >= 1 && newPage <= totalPages) {
                this.currentPage = newPage;
                this.renderSetoresList();
            }
            return;
        }

        if (clickedActionButton) {
            const action = clickedActionButton.dataset.action;
            let newPage = this.currentPage;
            const totalPages = Math.ceil(this.totalSetores / this.pageSize); // Recalculate based on current total

            if (action === 'setores-prev' && newPage > 1) {
                newPage--;
            } else if (action === 'setores-next' && newPage < totalPages) {
                newPage++;
            }

            if (newPage !== this.currentPage) {
                this.currentPage = newPage;
                this.renderSetoresList();
            }
            return;
        }
    }

    _handlePageSizeChange(e) {
        this.pageSize = parseInt(e.target.value);
        this.currentPage = 1; // Reset to first page when page size changes
        this.renderSetoresList();
    }

    _handleSearchSetores(e) {
        e.preventDefault();
        this.searchNome = document.getElementById('search-setor-nome').value.trim();
        this.currentPage = 1; // Reset to first page on new search
        this.renderSetoresList();
    }

    _handleClearSearch(e) {
        e.preventDefault();
        document.getElementById('search-setor-nome').value = '';
        this.searchNome = '';
        this.currentPage = 1; // Reset to first page on clear search
        this.renderSetoresList();
    }

    _bindTableActions() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.removeEventListener('click', this.boundHandleTableActions); // Remove old listener
            mainContent.addEventListener('click', this.boundHandleTableActions); // Add new listener
        }
    }

    async _handleTableActions(e) {
        const editButton = e.target.closest('.btn-editar-setor');
        const deleteButton = e.target.closest('.btn-deletar-setor');

        if (editButton) {
            const setorId = parseInt(editButton.dataset.id);
            await this._openEditModal(setorId);
        } else if (deleteButton) {
            const setorId = parseInt(deleteButton.dataset.id);
            this._openDeleteConfirmModal(setorId);
        }
    }

    async _createSetor() {
        if (!this.formCadastrarSetor.checkValidity()) {
            this.formCadastrarSetor.reportValidity();
            return;
        }

        const formData = new FormData(this.formCadastrarSetor);
        const setorData = {};
        for (const [key, value] of formData.entries()) {
            setorData[key] = value;
        }

        uiService.showLoading();
        try {
            await apiService.post('/setores/', setorData);
            showAlert('Setor cadastrado com sucesso!', 'success');
            this.modalCadastrarSetor.hide();
            this.renderSetoresList(); // Refresh list
        } catch (error) {
            console.error('Erro ao cadastrar setor', error);
            showAlert(error.message || 'Erro ao cadastrar setor.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    async _openEditModal(setorId) {
        uiService.showLoading();
        try {
            const setor = await apiService.get(`/setores/${setorId}`);
            this.formEditarSetor.querySelector('input[name="nome_setor"]').value = setor.nome_setor;
            this.formEditarSetor.querySelector('textarea[name="descricao_setor"]').value = setor.descricao_setor || '';

            // Store setor ID in the save button for later use
            this.btnSalvarEditarSetor.dataset.id = setorId;
            this.modalEditarSetor.show();
        } catch (error) {
            console.error('Erro ao carregar dados do setor para edição', error);
            showAlert(error.message || 'Erro ao carregar dados do setor.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    async _updateSetor() {
        const setorId = parseInt(this.btnSalvarEditarSetor.dataset.id);
        if (!setorId) {
            showAlert('ID do setor para edição não encontrado.', 'danger');
            return;
        }

        if (!this.formEditarSetor.checkValidity()) {
            this.formEditarSetor.reportValidity();
            return;
        }

        const formData = new FormData(this.formEditarSetor);
        const setorData = {};
        for (const [key, value] of formData.entries()) {
            setorData[key] = value;
        }

        uiService.showLoading();
        try {
            await apiService.put(`/setores/${setorId}`, setorData); // Use PUT for full update
            showAlert('Setor atualizado com sucesso!', 'success');
            this.modalEditarSetor.hide();
            this.renderSetoresList(); // Refresh list
        } catch (error) {
            console.error('Erro ao atualizar setor', error);
            showAlert(error.message || 'Erro ao atualizar setor.', 'danger!');
        } finally {
            uiService.hideLoading();
        }
    }

    _openDeleteConfirmModal(setorId) {
        document.getElementById('confirm-delete-setor-id').textContent = setorId;
        this.btnConfirmarDeletarSetor.dataset.id = setorId; // Store ID for confirmation
        this.modalConfirmarDeleteSetor.show();
    }

    async _deleteSetorConfirmed() {
        const setorId = parseInt(this.btnConfirmarDeletarSetor.dataset.id);
        if (!setorId) {
            showAlert('ID do setor para exclusão não encontrado.', 'danger!');
            return;
        }

        uiService.showLoading();
        try {
            await apiService.delete(`/setores/${setorId}`);
            showAlert('Setor deletado com sucesso!', 'success');
            this.modalConfirmarDeleteSetor.hide();
            this.renderSetoresList(); // Refresh list
        } catch (error) {
            console.error('Erro ao deletar setor', error);
            showAlert(error.message || 'Erro ao deletar setor.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }
}

export const setoresModule = new SetoresModule();
