// frontend/static/js/usuariosModule.js

import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert } from './utils.js';
import { getUserTypeFromToken, getUserIdFromToken } from './utils.js';


class UsuariosModule {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.searchNome = '';
        this.totalUsers = 0;
        this.setorIdToNameMap = {}; // mapa para armazenar ID do setor -> Nome do setor

        // Modals
        this.modalCadastrarUsuario = uiService.getModalInstance('modalCadastrarUsuario');
        this.modalEditarUsuario = uiService.getModalInstance('modalEditarUsuario');
        this.modalConfirmarDeleteUsuario = uiService.getModalInstance('modalConfirmarDeleteUsuario');

        // Forms
        this.formCadastrarUsuario = document.getElementById('form-cadastrar-usuario');
        this.formEditarUsuario = document.getElementById('form-editar-usuario');

        // Buttons
        this.btnSalvarCadastrarUsuario = document.getElementById('btn-salvar-cadastrar-usuario');
        this.btnSalvarEditarUsuario = document.getElementById('btn-salvar-editar-usuario');
        this.btnConfirmarDeletarUsuario = document.getElementById('btn-confirmar-deletar-usuario');

        // Bindings
        this.boundHandlePaginationClick = this._handlePaginationClick.bind(this);
        this.boundHandlePageSizeChange = this._handlePageSizeChange.bind(this);
        this.boundHandleSearchUsers = this._handleSearchUsers.bind(this);
        this.boundHandleClearSearch = this._handleClearSearch.bind(this);
        this.boundHandleTableActions = this._handleTableActions.bind(this);
        this.boundUpdateUsuario = this._updateUsuario.bind(this);

        this.isProfileMode = false;
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Cadastrar Usuário
        document.getElementById('btn-open-cadastrar-usuario')?.addEventListener('click', e => {
            e.preventDefault();
            this.formCadastrarUsuario.reset();
            this.populateSetoresInForm(this.formCadastrarUsuario.querySelector('select[name="setor_id"]'));
            this.modalCadastrarUsuario.show();
        });

        this.btnSalvarCadastrarUsuario.onclick = (e) => {
            e.preventDefault();
            this._createUsuario();
        };
        // Salvar Editar Usuario
        this.btnSalvarEditarUsuario?.addEventListener('click', this.boundUpdateUsuario);
    }

    /**
 * Abre o modal de edição do próprio perfil,
 * buscando o ID do token e usando GET /usuarios/{id}.
 */
    async openEditProfileModal() {
        uiService.showLoading();
        try {
            const userId = getUserIdFromToken();
            if (!userId) throw new Error('Usuário não autenticado');

            const user = await apiService.get(`/usuarios/${userId}`);

            const form = this.formEditarUsuario;
            form.querySelector('input[name="nome_usuario"]').value = user.nome_usuario;
            form.querySelector('input[name="email_usuario"]').value = user.email_usuario;
            form.querySelector('input[name="username"]').value = user.username;
            form.querySelector('input[name="siape_usuario"]').value = user.siape_usuario || '';
            form.querySelector('select[name="tipo_usuario"]').value = user.tipo_usuario;
            await this.populateSetoresInForm(
                form.querySelector('select[name="setor_id"]'),
                user.setor_id
            );

            // desabilita campos extras para quem não é da direção
            const role = parseInt(getUserTypeFromToken(), 10);
            const disable = role !== 3;
            form.querySelector('select[name="tipo_usuario"]').disabled = disable;
            form.querySelector('select[name="setor_id"]').disabled = disable;
            form.querySelector('input[name="siape_usuario"]').disabled = disable;

            // perfil mode vale SÓ para usuários que NÃO são Direção:
            this.isProfileMode = (role !== 3);
            this.btnSalvarEditarUsuario.dataset.id = userId;
            this.modalEditarUsuario.show();

        } catch (err) {
            console.error('Erro abrindo edição de perfil', err);
            showAlert(err.message || 'Não foi possível carregar seus dados.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }



    async populateSetoresInForm(selectElement, selectedSetorId = null) {
        selectElement.innerHTML = '<option value="" disabled selected>Carregando setores...</option>';
        try {
            const setores = await apiService.fetchAllSetores();
            selectElement.innerHTML = '<option value="" disabled selected>Selecione um setor</option>';
            setores.forEach(setor => {
                const option = document.createElement('option');
                option.value = setor.setor_id;
                option.textContent = setor.nome_setor;
                if (selectedSetorId !== null && setor.setor_id === selectedSetorId) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar setores:', error);
            showAlert('Erro ao carregar setores.', 'danger');
            selectElement.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
        }
    }

    async renderUsuariosList() {
        uiService.showLoading();
        try {
            // Fetch all users. The backend endpoint /usuarios returns all users.
            const allUsers = await apiService.get('/usuarios');

            // Fetch all sectors to map IDs to names
            const allSetores = await apiService.get('/setores');
            this.setorIdToNameMap = {};
            allSetores.forEach(setor => {
                this.setorIdToNameMap[setor.setor_id] = setor.nome_setor;
            });

            // Frontend filtering and pagination for now
            const filteredUsers = this.searchNome
                ? allUsers.filter(u => u.nome_usuario.toLowerCase().includes(this.searchNome.toLowerCase()))
                : allUsers;

            this.totalUsers = filteredUsers.length; // Update total users count
            const totalPages = Math.ceil(this.totalUsers / this.pageSize);

            const offset = (this.currentPage - 1) * this.pageSize;
            const usersForPage = filteredUsers.slice(offset, offset + this.pageSize);

            const tableHeaders = ['ID', 'Nome', 'Email', 'Tipo', 'Setor', 'SIAPE', 'Ações'];
            const tableHtml = uiService.renderTable(tableHeaders, usersForPage, {
                noRecordsMessage: "Nenhum usuário encontrado.",
                rowMapper: (usuario) => {
                    // Use the map to get the sector name
                    const sectorName = this.setorIdToNameMap[usuario.setor_id] || 'N/D';
                    const userRoleText = this._getRoleText(usuario.tipo_usuario);
                    return [
                        usuario.usuario_id,
                        usuario.nome_usuario,
                        usuario.email_usuario,
                        userRoleText,
                        sectorName, // Exibe o nome do setor
                        usuario.siape_usuario || 'N/D'
                    ];
                },
                actionsHtml: (usuario) => `
                    <div class="d-flex flex-wrap justify-content-center gap-1">
                        <button class="btn btn-sm btn-primary btn-acoes btn-editar-usuario" data-id="${usuario.usuario_id}">
                            <i class="bi bi-pencil-square"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger btn-acoes btn-deletar-usuario" data-id="${usuario.usuario_id}">
                            <i class="bi bi-trash"></i> Deletar
                        </button>
                    </div>
                `
            });

            const paginationHtml = uiService.renderPagination(
                this.currentPage,
                totalPages,
                'usuarios', // type for pagination links
                'usuariosPageSizeSelect', // id for pageSize select element
                this.pageSize
            );

            const searchBarHtml = `
                <div class="card mb-3">
                    <div class="card-header">Filtros de Busca</div>
                    <div class="card-body">
                        <form id="search-bar-usuarios" class="row g-3 mb-0">
                            <div class="col-12 col-md">
                                <label for="search-usuario-nome" class="form-label">Nome do Usuário</label>
                                <input type="text" id="search-usuario-nome" class="form-control" placeholder="Buscar por nome" value="${this.searchNome}">
                            </div>
                            <div class="col-12 col-md d-flex justify-content-end align-items-end">
                                <button type="button" id="btn-search-usuario" class="btn btn-primary me-2">Buscar</button>
                                <button type="button" id="btn-clear-search-usuario" class="btn btn-secondary">Limpar</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            uiService.renderPage(
                'Gerenciamento de Usuários',
                `${searchBarHtml}${tableHtml}${paginationHtml}`
            );

            this._bindPageEvents();
            this._bindTableActions();

        } catch (error) {
            console.error('Erro ao renderizar lista de usuários:', error);
            showAlert(error.message || 'Erro ao carregar usuários.', 'danger');
            uiService.renderPage('Gerenciamento de Usuários', `<div class="alert alert-warning">Erro ao carregar usuários: ${error.message || 'Verifique sua conexão.'}</div>`);
        } finally {
            uiService.hideLoading();
        }
    }

    _getRoleText(roleValue) {
        // Based on RoleEnum from backend: 1: Geral, 2: Almoxarifado, 3: Direcao
        switch (roleValue) {
            case 1: return '<span class="badge bg-secondary">Geral</span>';
            case 2: return '<span class="badge bg-info">Almoxarifado</span>';
            case 3: return '<span class="badge bg-primary">Direção</span>';
            default: return 'Desconhecido';
        }
    }

    _bindPageEvents() {
        // Select elements by ID. If they are part of dynamic content, ensure they exist.
        const paginationNav = document.getElementById('usuarios-pagination-nav');
        const pageSizeSelect = document.getElementById('usuariosPageSizeSelect');
        const btnSearch = document.getElementById('btn-search-usuario');
        const btnClearSearch = document.getElementById('btn-clear-search-usuario');

        // Removendo listeners antigos para evitar duplicação
        if (paginationNav) {
            paginationNav.removeEventListener('click', this.boundHandlePaginationClick);
        }
        if (pageSizeSelect) {
            pageSizeSelect.removeEventListener('change', this.boundHandlePageSizeChange);
        }
        if (btnSearch) {
            btnSearch.removeEventListener('click', this.boundHandleSearchUsers);
        }
        if (btnClearSearch) {
            btnClearSearch.removeEventListener('click', this.boundHandleClearSearch);
        }

        // Adicionando novos listeners
        if (paginationNav) {
            paginationNav.addEventListener('click', this.boundHandlePaginationClick);
        }
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', this.boundHandlePageSizeChange);
        }
        if (btnSearch) {
            btnSearch.addEventListener('click', this.boundHandleSearchUsers);
        }
        if (btnClearSearch) {
            btnClearSearch.addEventListener('click', this.boundHandleClearSearch);
        }
    }

    _handlePaginationClick(e) {
        e.preventDefault();
        const clickedPageLink = e.target.closest('a[data-page^="usuarios-"]');
        const clickedActionButton = e.target.closest('a[data-action^="usuarios-"]');

        if (clickedPageLink) {
            const pageValue = clickedPageLink.dataset.page.split('-')[1];
            const newPage = parseInt(pageValue);
            const totalPages = Math.ceil(this.totalUsers / this.pageSize); // Cálculo de totalPages
            if (!isNaN(newPage) && newPage !== this.currentPage && newPage >= 1 && newPage <= totalPages) {
                this.currentPage = newPage;
                this.renderUsuariosList();
            }
            return;
        }

        if (clickedActionButton) {
            const action = clickedActionButton.dataset.action;
            let newPage = this.currentPage;
            const totalPages = Math.ceil(this.totalUsers / this.pageSize); // Cálculo de totalPages

            if (action === 'usuarios-prev' && newPage > 1) {
                newPage--;
            } else if (action === 'usuarios-next' && newPage < totalPages) {
                newPage++;
            }

            if (newPage !== this.currentPage) {
                this.currentPage = newPage;
                this.renderUsuariosList();
            }
            return;
        }
    }

    _handlePageSizeChange(e) {
        this.pageSize = parseInt(e.target.value);
        this.currentPage = 1; // Resetar para primeira página quando muda o tamanho da página
        this.renderUsuariosList();
    }

    _handleSearchUsers(e) {
        e.preventDefault();
        this.searchNome = document.getElementById('search-usuario-nome').value.trim();
        this.currentPage = 1; // Resetar para primeira página quando houver busca por filtro
        this.renderUsuariosList();
    }

    _handleClearSearch(e) {
        e.preventDefault();
        document.getElementById('search-usuario-nome').value = '';
        this.searchNome = '';
        this.currentPage = 1; // Resetar para primeira página quando limpar os filtros de busca
        this.renderUsuariosList();
    }

    _bindTableActions() {
        // Event delegation on main-content for buttons that are dynamically rendered
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.removeEventListener('click', this.boundHandleTableActions); // Remove listener antigo
            mainContent.addEventListener('click', this.boundHandleTableActions); // Adiciona listener no elemento pai
        }
    }

    async _handleTableActions(e) {
        const editButton = e.target.closest('.btn-editar-usuario');
        const deleteButton = e.target.closest('.btn-deletar-usuario');

        if (editButton) {
            const userId = parseInt(editButton.dataset.id);
            await this._openEditModal(userId);
        } else if (deleteButton) {
            const userId = parseInt(deleteButton.dataset.id);
            this._openDeleteConfirmModal(userId);
        }
    }

    async _createUsuario() {
        if (!this.formCadastrarUsuario.checkValidity()) {
            this.formCadastrarUsuario.reportValidity();
            return;
        }
        uiService.showLoading();
        this.btnSalvarCadastrarUsuario.disabled = true;

        const formData = new FormData(this.formCadastrarUsuario);
        const userData = {};
        for (const [key, value] of formData.entries()) {
            if (value !== '') { // Exclude empty fields
                userData[key] = value;
            }
        }

        // Convertendo tipos
        userData.tipo_usuario = parseInt(userData.tipo_usuario);
        userData.setor_id = parseInt(userData.setor_id);
        userData.siape_usuario = userData.siape_usuario ? userData.siape_usuario.trim() : null;

        uiService.showLoading();

        try {
            await apiService.post('/usuarios/', userData);
            showAlert('Usuário cadastrado com sucesso!', 'success');
            this.modalCadastrarUsuario.hide();
            this.renderUsuariosList();
        } catch (error) {
            console.error(error);
            showAlert(error.message || 'Erro ao cadastrar usuário.', 'danger');
        } finally {
            uiService.hideLoading();
            this.btnSalvarCadastrarUsuario.disabled = false;
        }
    }

    async _openEditModal(userId) {
        uiService.showLoading();
        try {
            const user = await apiService.get(`/usuarios/${userId}`);
            this.formEditarUsuario.querySelector('input[name="nome_usuario"]').value = user.nome_usuario;
            this.formEditarUsuario.querySelector('input[name="email_usuario"]').value = user.email_usuario;
            this.formEditarUsuario.querySelector('select[name="tipo_usuario"]').value = user.tipo_usuario;
            this.formEditarUsuario.querySelector('input[name="username"]').value = user.username;
            this.formEditarUsuario.querySelector('input[name="siape_usuario"]').value = user.siape_usuario;

            // Popular e selecionar setor atual
            const setorSelect = this.formEditarUsuario.querySelector('select[name="setor_id"]');
            await this.populateSetoresInForm(setorSelect, user.setor_id);

            // Armazenar user ID com clique no botão de salvar
            this.btnSalvarEditarUsuario.dataset.id = userId;
            this.modalEditarUsuario.show();
        } catch (error) {
            console.error('Erro ao carregar dados do usuário para edição', error);
            showAlert(error.message || 'Erro ao carregar dados do usuário.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    async _updateUsuario() {
        const userId = parseInt(this.btnSalvarEditarUsuario.dataset.id);
        if (!userId) {
            showAlert('ID do usuário para edição não encontrado.', 'danger');
            return;
        }

        if (!this.formEditarUsuario.checkValidity()) {
            this.formEditarUsuario.reportValidity();
            return;
        }

        const formData = new FormData(this.formEditarUsuario);
        const userData = {};
        if (this.isProfileMode) {

            // PERFIL: campos editáveis + manter obrigatórios
            ['nome_usuario', 'email_usuario', 'username', 'senha_usuario'].forEach(key => {
                const v = formData.get(key);
                if (v && v.trim()) userData[key] = v.trim();
            });
            // garanta incluir tipo, setor e siape atuais (os selects/inputs estão desabilitados,
            // então não entram no formData automaticamente):
            const role = parseInt(getUserTypeFromToken(), 10);
            const setor = this.formEditarUsuario.querySelector('select[name="setor_id"]').value;
            const siape = this.formEditarUsuario.querySelector('input[name="siape_usuario"]').value;

            userData.tipo_usuario = role;
            userData.setor_id = setor ? parseInt(setor, 10) : undefined;
            userData.siape_usuario = siape ? siape.trim() : null;
        } else {
            // edição normal de qualquer usuário
            for (const [key, value] of formData.entries()) {
                if (value !== '') userData[key] = value;
            }
            userData.tipo_usuario = userData.tipo_usuario ? parseInt(userData.tipo_usuario) : undefined;
            userData.setor_id = userData.setor_id ? parseInt(userData.setor_id) : undefined;
            userData.siape_usuario = userData.siape_usuario ? userData.siape_usuario.trim() : null;
        }


        // Ensure numbers are parsed correctly, and undefined for optional unset fields
        userData.tipo_usuario = userData.tipo_usuario ? parseInt(userData.tipo_usuario) : undefined;
        userData.setor_id = userData.setor_id ? parseInt(userData.setor_id) : undefined;
        userData.siape_usuario = userData.siape_usuario ? userData.siape_usuario.trim() : null;

        uiService.showLoading();
        try {
            await apiService.put(`/usuarios/${userId}`, userData); // Use PUT for full update
            showAlert('Usuário atualizado com sucesso!', 'success');
            const role = parseInt(getUserTypeFromToken(), 10);

            this.modalEditarUsuario.hide();
            this.isProfileMode = false;

            if (role == 3) {
                this.renderUsuariosList();
            } else if (role === 2 || role === 1) {
                // Recarrega página para atualizar os dados exibidos no dashboard
                window.location.reload();
            }
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            showAlert(error.message || 'Erro ao atualizar usuário.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    _openDeleteConfirmModal(userId) {
        document.getElementById('confirm-delete-user-id').textContent = userId;
        this.btnConfirmarDeletarUsuario.dataset.id = userId;
        this.modalConfirmarDeleteUsuario.show();

        // Substitui qualquer handler anterior por este:
        this.btnConfirmarDeletarUsuario.onclick = () => {
            this._deleteUsuarioConfirmed();
        };
    }

    async _deleteUsuarioConfirmed() {
        const btn = this.btnConfirmarDeletarUsuario;
        btn.disabled = true;
        uiService.showLoading();
        try {
            const userId = parseInt(btn.dataset.id, 10);
            await apiService.delete(`/usuarios/${userId}`);
            showAlert('Usuário deletado com sucesso!', 'success');
            this.modalConfirmarDeleteUsuario.hide();
            this.renderUsuariosList();
        } catch (error) {
            console.error('Erro ao deletar usuário', error);
            showAlert(error.message || 'Erro ao deletar usuário.', 'danger');
        } finally {
            uiService.hideLoading();
            btn.disabled = false;
        }
    }


}

export const usuariosModule = new UsuariosModule();

