// frontend/static/js/solicitar-retirada.js

import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert, getUserIdFromToken, getUserTypeFromToken } from './utils.js'; // Import getUserIdFromToken e getUserTypeFromToken
import { selecionarItemModule } from './selecionar-item-module.js';

class SolicitarRetiradaModule {
    constructor() {
        this.modalSolicitarRetirada = uiService.getModalInstance('modalSolicitarRetirada');
        this.form = document.getElementById('form-solicitar-retirada');
        this.selectSetor = document.getElementById('solicitar_setor_id');
        this.inputSolicitadoLocalmentePor = document.getElementById('solicitado_localmente_por');
        this.inputJustificativa = document.getElementById('solicitar_justificativa');
        this.btnAbrirSelecionarItemModal = document.getElementById('btn-abrir-selecionar-item-modal');
        this.inputQuantidadeAddItem = document.getElementById('quantidade_add_item');
        this.btnAdicionarItemRetirada = document.getElementById('btn-adicionar-item-retirada');
        this.itensParaRetiradaContainer = document.getElementById('itens-para-retirada-container');
        this.btnSalvarSolicitacaoRetirada = document.getElementById('btn-salvar-solicitacao-retirada');
        this.noItemsMessage = document.getElementById('no-items-message');

        // NOVAS REFERÊNCIAS PARA FEEDBACK VISUAL
        this.selectedItemDisplay = document.getElementById('selected-item-display');
        this.selectedItemName = document.getElementById('selected-item-name');

        // NOVAS REFERÊNCIAS PARA MODAL DE BUSCA DE USUÁRIO
        this.modalSearchUser = uiService.getModalInstance('modalSearchUser');
        this.searchInputUser = document.getElementById('search-user-input');
        this.btnSearchUser = document.getElementById('btn-search-user');
        this.userSearchResultsTbody = document.getElementById('user-search-results-tbody');
        this.btnOpenSearchUserModal = document.getElementById('btn-open-search-user-modal');
        this.linkedUserDisplay = document.getElementById('linked-user-display');
        this.linkedUserName = document.getElementById('linked-user-name');
        this.linkedUsuarioIdInput = document.getElementById('linked_usuario_id');
        this.btnUnlinkUser = document.getElementById('btn-unlink-user');
        this.solicitadoLocalmentePorInput = document.getElementById('solicitado_localmente_por');
        this.solicitadoLocalmenteHelpText = document.getElementById('solicitado-localmente-help-text');
        this.localSolicitationSection = document.getElementById('local-solicitation-section');


        this.itensSelecionados = [];
        this.todosItensDisponiveis = [];
        this.currentItemToAddToCart = null;
        this.linkedUser = null; // Para armazenar o objeto do usuário selecionado
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Link para abrir o modal de solicitação (geral, por exemplo, do Almoxarifado)
        // O evento para o dashboard do servidor é tratado em main.js
        document.getElementById('btn-open-solicitar-retirada')?.addEventListener('click', e => {
            e.preventDefault();
            // Verifica o tipo de usuário logado para determinar se é um dashboard de servidor
            const userType = getUserTypeFromToken();
            const isServidor = userType === 1; // 1 é o valor para USUARIO_SERVIDOR
            this.openModal(isServidor);
        });

        this.btnAbrirSelecionarItemModal?.addEventListener('click', () => {
            this.openSelecionarItemModal();
        });

        this.btnSalvarSolicitacaoRetirada.addEventListener('click', () => this._enviarSolicitacao());
        this.btnAdicionarItemRetirada?.addEventListener('click', () => this._adicionarItemParaRetirada());

        document.getElementById('modalSolicitarRetirada').addEventListener('hidden.bs.modal', () => {
            this._resetForm(); // Resetar formulário ao fechar o modal
        });

        document.addEventListener('itemSelectedForRetirada', (event) => {
            this.handleItemSelected(event.detail.item);
        });

        // Eventos para o novo modal de busca de usuário
        this.btnOpenSearchUserModal?.addEventListener('click', () => this.openSearchUserModal());
        this.btnSearchUser?.addEventListener('click', () => this.searchUsers());
        this.searchInputUser?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchUsers();
            }
        });
        this.btnUnlinkUser?.addEventListener('click', () => this.unlinkUser());
    }

    // MODIFICADO: Adicionado parâmetro isServidorDashboard
    async openModal(isServidorDashboard = false) {
        uiService.showLoading();
        try {
            // Sempre busca todos os setores. O comportamento de seleção/desativação será condicional.
            const setoresData = await apiService.fetchAllSetores();

            // Limpa as opções anteriores do select
            this.selectSetor.innerHTML = '';

            // Lógica para esconder/mostrar o campo "Solicitado localmente por" e a seção de vinculação de usuário
            if (this.localSolicitationSection) {
                if (isServidorDashboard) {
                    // Para usuários comuns, esconde a seção de solicitação local
                    this.localSolicitationSection.style.display = 'none';
                } else {
                    // Para almoxarifado/direção, mostra a seção
                    this.localSolicitationSection.style.display = 'block';
                    // Garante que o campo 'solicitado_localmente_por' seja visível por padrão se nenhum usuário estiver vinculado
                    this.solicitadoLocalmentePorInput.closest('.col-md-6').style.display = 'block';
                    this.solicitadoLocalmenteHelpText.style.display = 'block';
                    this.linkedUserDisplay.style.display = 'none'; // Esconde a exibição do usuário vinculado
                    this.linkedUser = null; // Reseta o usuário vinculado
                    this.linkedUsuarioIdInput.value = ''; // Limpa o input hidden
                    this.solicitadoLocalmentePorInput.value = ''; // Limpa o input de nome local
                }
            }

            if (isServidorDashboard) {
                const userId = getUserIdFromToken();
                if (userId) {
                    const userDetails = await apiService.getCurrentUserDetails(userId);
                    const userSectorId = userDetails.sectorId;

                    if (userSectorId) {
                        // Encontra o setor específico do usuário nos dados carregados
                        const userSector = setoresData.find(s => s.setor_id === userSectorId);
                        if (userSector) {
                            const option = document.createElement('option');
                            option.value = userSector.setor_id;
                            option.textContent = userSector.nome_setor;
                            option.selected = true; // Pré-seleciona o setor do usuário
                            this.selectSetor.appendChild(option);
                            this.selectSetor.disabled = true; // Torna o campo somente leitura
                        } else {
                            // Se o setor do usuário não for encontrado na lista, permite seleção manual e alerta
                            this.selectSetor.innerHTML = '<option value="" disabled selected>Erro: Setor do usuário não encontrado. Selecione manualmente.</option>';
                            setoresData.forEach(setor => {
                                const option = document.createElement('option');
                                option.value = setor.setor_id;
                                option.textContent = setor.nome_setor;
                                this.selectSetor.appendChild(option);
                            });
                            this.selectSetor.disabled = false; // Garante que esteja habilitado se o setor não for encontrado
                            showAlert('Setor do usuário não encontrado na lista de setores. Por favor, selecione manualmente.', 'warning');
                        }
                    } else {
                        // Se o ID do setor do usuário for nulo/indefinido, permite seleção manual e alerta
                        this.selectSetor.innerHTML = '<option value="" disabled selected>Erro: Não foi possível obter seu setor. Selecione manualmente.</option>';
                        setoresData.forEach(setor => {
                            const option = document.createElement('option');
                            option.value = setor.setor_id;
                            option.textContent = setor.nome_setor;
                            this.selectSetor.appendChild(option);
                        });
                        this.selectSetor.disabled = false; // Garante que esteja habilitado
                        showAlert('Não foi possível obter o ID do setor do usuário logado. Por favor, selecione o setor.', 'warning');
                    }
                } else {
                    // Se o ID do usuário não for obtido, permite seleção manual e alerta
                    this.selectSetor.innerHTML = '<option value="" disabled selected>Erro: Não foi possível obter o ID do usuário. Selecione manualmente.</option>';
                    setoresData.forEach(setor => {
                        const option = document.createElement('option');
                        option.value = setor.setor_id;
                        option.textContent = setor.nome_setor;
                        this.selectSetor.appendChild(option);
                    });
                    this.selectSetor.disabled = false; // Garante que esteja habilitado
                    showAlert('Não foi possível obter o ID do usuário logado. Por favor, selecione o setor.', 'warning');
                }
            } else {
                // Comportamento padrão para dashboards que não são de servidor (Almoxarifado/Direção)
                this.selectSetor.innerHTML = '<option value="" disabled selected>Selecione um setor</option>';
                setoresData.forEach(setor => {
                    const option = document.createElement('option');
                    option.value = setor.setor_id;
                    option.textContent = setor.nome_setor;
                    this.selectSetor.appendChild(option);
                });
                this.selectSetor.disabled = false; // Garante que esteja habilitado para não-servidores
            }

            this.itensSelecionados = [];
            this._renderItensParaRetirada();
            this._clearSelectedItemDisplay();
            uiService.hideLoading();
            this.modalSolicitarRetirada.show();

        } catch (error) {
            uiService.hideLoading();
            console.error("Erro ao carregar dados iniciais para solicitação", error);
            showAlert('Erro ao carregar setores. Tente novamente.', 'danger');
            this.modalSolicitarRetirada.hide();
        }
    }

    openSelecionarItemModal() {
        selecionarItemModule.openModal();
    }

    handleItemSelected(selectedItem) {
        this.currentItemToAddToCart = selectedItem;
        this.inputQuantidadeAddItem.value = 1;

        // ATUALIZA O FEEDBACK VISUAL
        this.selectedItemName.textContent = selectedItem.nome_item_original;
        this.selectedItemDisplay.style.display = 'block';
        this.btnAdicionarItemRetirada.disabled = false;

        showAlert(`Item selecionado: ${selectedItem.nome_item_original}. Agora, informe a quantidade.`, 'info');
    }

    _adicionarItemParaRetirada() {
        if (!this.currentItemToAddToCart) {
            showAlert('Nenhum item selecionado para adicionar.', 'warning');
            return;
        }

        const quantidade = parseInt(this.inputQuantidadeAddItem.value);

        if (isNaN(quantidade) || quantidade <= 0) {
            showAlert('Por favor, informe uma quantidade válida.', 'warning');
            return;
        }

        const itemExistente = this.itensSelecionados.find(item =>
            item.item_id === this.currentItemToAddToCart.item_id
        );

        const quantidadeDisponivel = this.currentItemToAddToCart.quantidade_item;
        const quantidadeTotalSolicitada = quantidade + (itemExistente ? itemExistente.quantidade_retirada : 0);

        if (quantidadeTotalSolicitada > quantidadeDisponivel) {
            showAlert(
                `Quantidade solicitada para ${this.currentItemToAddToCart.nome_item_original} excede o estoque disponível (${quantidadeDisponivel}).`,
                'warning'
            );
            return;
        }

        if (itemExistente) {
            itemExistente.quantidade_retirada += quantidade;
        } else {
            this.itensSelecionados.push({
                item_id: this.currentItemToAddToCart.item_id,
                nome_item: this.currentItemToAddToCart.nome_item_original,
                quantidade_retirada: quantidade
            });
        }

        this._renderItensParaRetirada();
        this._clearSelectedItemDisplay();
        this.currentItemToAddToCart = null;
        this.inputQuantidadeAddItem.value = 1;
    }

    _renderItensParaRetirada() {
        this.itensParaRetiradaContainer.innerHTML = '';

        if (this.itensSelecionados.length === 0) {
            this.noItemsMessage.style.display = 'block';
            this.itensParaRetiradaContainer.appendChild(this.noItemsMessage);
            return;
        }

        this.noItemsMessage.style.display = 'none';

        this.itensSelecionados.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'col-12 d-flex justify-content-between align-items-center bg-light p-2 mb-2 rounded shadow-sm';
            itemElement.innerHTML = `
                <span>${item.nome_item} (Quantidade: ${item.quantidade_retirada})</span>
                <button type="button" class="btn btn-sm btn-danger btn-remover-item" data-item-id="${item.item_id}">
                    <i class="bi bi-trash"></i> Remover
                </button>
            `;
            this.itensParaRetiradaContainer.appendChild(itemElement);
        });

        this.itensParaRetiradaContainer.querySelectorAll('.btn-remover-item').forEach(btn => {
            btn.addEventListener('click', (e) =>
                this._removerItemParaRetirada(parseInt(e.currentTarget.dataset.itemId))
            );
        });
    }

    _removerItemParaRetirada(itemId) {
        this.itensSelecionados = this.itensSelecionados.filter(item =>
            item.item_id !== itemId
        );
        this._renderItensParaRetirada();
    }

    // NOVO: Métodos para busca e vinculação de usuário
    openSearchUserModal() {
        this.searchInputUser.value = '';
        this.userSearchResultsTbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum usuário encontrado.</td></tr>';
        this.modalSearchUser.show();
    }

    async searchUsers() {
        const query = this.searchInputUser.value.trim();
        if (query.length < 1) {
            showAlert('Por favor, digite pelo menos 1 caractere para buscar.', 'warning', 2000);
            return;
        }

        uiService.showLoading();
        try {
            const users = await apiService.searchUsers(query);
            this.renderUserSearchResults(users);
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
            showAlert(error.message || 'Erro ao buscar usuários.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    renderUserSearchResults(users) {
        this.userSearchResultsTbody.innerHTML = '';
        if (users.length === 0) {
            this.userSearchResultsTbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum usuário encontrado.</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.nome_usuario}</td>
                <td>${user.email_usuario}</td>
                <td>${user.siape_usuario || '-'}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-primary btn-link-user" data-user-id="${user.usuario_id}" data-user-name="${user.nome_usuario}">
                        Vincular
                    </button>
                </td>
            `;
            this.userSearchResultsTbody.appendChild(row);
        });

        this.userSearchResultsTbody.querySelectorAll('.btn-link-user').forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = parseInt(e.currentTarget.dataset.userId);
                const userName = e.currentTarget.dataset.userName;
                this.linkUser(userId, userName);
            });
        });
    }

    linkUser(userId, userName) {
        this.linkedUser = { id: userId, name: userName };
        this.linkedUserName.textContent = userName;
        this.linkedUsuarioIdInput.value = userId;
        this.linkedUserDisplay.style.display = 'block';

        // Em vez de esconder, deixa o campo preenchido e readonly
        this.solicitadoLocalmentePorInput.value = userName;
        this.solicitadoLocalmentePorInput.readOnly = true;
        this.solicitadoLocalmentePorInput.closest('.col-md-6').classList.add('disabled');
        this.solicitadoLocalmenteHelpText.textContent = 'Este nome foi vinculado a um usuário cadastrado.';

        this.modalSearchUser.hide();
        showAlert(`Usuário ${userName} vinculado à retirada local.`, 'success');
    }

    unlinkUser() {
        this.linkedUser = null;
        this.linkedUserName.textContent = '';
        this.linkedUsuarioIdInput.value = '';
        this.linkedUserDisplay.style.display = 'none';

        // Reativa o input para edição manual
        this.solicitadoLocalmentePorInput.value = '';
        this.solicitadoLocalmentePorInput.readOnly = false;
        this.solicitadoLocalmentePorInput.closest('.col-md-6').classList.remove('disabled');
        this.solicitadoLocalmenteHelpText.textContent = 'Preencha se a solicitação for feita por alguém presencialmente em seu nome.';

        showAlert('Usuário desvinculado.', 'info');
    }

    async _enviarSolicitacao() {
        // 1) Captura valores
        const setorId = parseInt(this.selectSetor.value, 10);
        const solicitadoLocalmentePor = this.inputSolicitadoLocalmentePor.value.trim();
        const justificativa = this.inputJustificativa.value.trim();
        const linkedUsuarioId = this.linkedUsuarioIdInput.value
            ? parseInt(this.linkedUsuarioIdInput.value, 10)
            : null;

        // 2) Define como local somente se houver vinculação ou nome manual
        const isLocalWithdrawal = Boolean(linkedUsuarioId || solicitadoLocalmentePor);

        // 3) Validações
        if (isNaN(setorId)) {
            showAlert('Por favor, selecione um setor.', 'warning');
            return;
        }
        if (this.itensSelecionados.length === 0) {
            showAlert('Adicione pelo menos um item para solicitar a retirada.', 'warning');
            return;
        }
        // Se for local, exige pelo menos um dos dois
        if (isLocalWithdrawal && !linkedUsuarioId && !solicitadoLocalmentePor) {
            showAlert('Para retirada local, vincule um usuário ou preencha "Solicitado Localmente Por".', 'warning');
            return;
        }

        // 4) Monta o payload
        const retiradaData = {
            setor_id: setorId,
            is_local_withdrawal: isLocalWithdrawal,
            solicitado_localmente_por: solicitadoLocalmentePor || null,
            justificativa: justificativa || null,
            linked_usuario_id: linkedUsuarioId,
            itens: this.itensSelecionados.map(item => ({
                item_id: item.item_id,
                quantidade_retirada: item.quantidade_retirada
            })),
            // Se vinculou usuário, marca concluída
            ...(linkedUsuarioId && { status: 'concluída' })
        };

        // 5) Envio
        try {
            uiService.showLoading();
            await apiService.solicitarRetirada(retiradaData);
            showAlert('Solicitação de retirada enviada com sucesso!', 'success');

            this.modalSolicitarRetirada.hide();
            this._resetForm();

            if (typeof window.loadDashboardOverview === 'function') {
                window.loadDashboardOverview();
            }
        } catch (error) {
            console.error('Erro ao enviar solicitação:', error);
            showAlert(error.message || 'Erro ao enviar a solicitação de retirada.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }


    _resetForm() {
        this.form.reset();
        this.itensSelecionados = [];
        this._renderItensParaRetirada(); // Chamada para garantir que a mensagem 'Nenhum item adicionado' apareça
        this.noItemsMessage.style.display = 'block'; // Garante que a mensagem esteja visível após o reset
        this.inputQuantidadeAddItem.value = 1;
        this.currentItemToAddToCart = null;
        this._clearSelectedItemDisplay();
        this.selectSetor.disabled = false; // Garante que o select não fique desabilitado permanentemente ao resetar

        // Reseta o usuário vinculado e mostra o input de solicitação local
        this.unlinkUser(); // Isso vai resetar linkedUser e mostrar o input
    }

    _clearSelectedItemDisplay() {
        this.selectedItemName.textContent = "";
        this.selectedItemDisplay.style.display = 'none';
        this.btnAdicionarItemRetirada.disabled = true;
    }
}

export const solicitarRetiradaModule = new SolicitarRetiradaModule();
