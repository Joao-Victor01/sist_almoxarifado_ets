// frontend/static/js/solicitar-retirada.js

import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert, getUserIdFromToken } from './utils.js'; // Import getUserIdFromToken
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

        this.itensSelecionados = [];
        this.todosItensDisponiveis = [];
        this.currentItemToAddToCart = null;
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Link para abrir o modal de solicitação (geral, por exemplo, do Almoxarifado)
        // O evento para o dashboard do servidor é tratado em main.js
        document.getElementById('btn-open-solicitar-retirada')?.addEventListener('click', e => {
            e.preventDefault();
            this.openModal(false); // Explicitamente false para dashboards que não são de servidor
        });

        this.btnAbrirSelecionarItemModal?.addEventListener('click', () => {
            this.openSelecionarItemModal();
        });

        this.btnSalvarSolicitacaoRetirada.addEventListener('click', () => this._enviarSolicitacao());
        this.btnAdicionarItemRetirada?.addEventListener('click', () => this._adicionarItemParaRetirada());

        document.getElementById('modalSolicitarRetirada').addEventListener('hidden.bs.modal', () => {
            this.resetForm(); // Resetar formulário ao fechar o modal
        });

        document.addEventListener('itemSelectedForRetirada', (event) => {
            this.handleItemSelected(event.detail.item);
        });
    }

    // MODIFICADO: Adicionado parâmetro isServidorDashboard
    async openModal(isServidorDashboard = false) {
        uiService.showLoading();
        try {
            // Sempre busca todos os setores. O comportamento de seleção/desativação será condicional.
            const setoresData = await apiService.fetchAllSetores();

            // Limpa as opções anteriores do select
            this.selectSetor.innerHTML = '';

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

            // Lógica para esconder/mostrar o campo "Solicitado localmente por"
            const solicitadoLocalmentePorContainer = this.inputSolicitadoLocalmentePor.closest('.col-md-6');
            if (solicitadoLocalmentePorContainer) {
                if (isServidorDashboard) {
                    solicitadoLocalmentePorContainer.style.display = 'none';
                } else {
                    solicitadoLocalmentePorContainer.style.display = 'block'; // Ou 'flex' dependendo do layout
                }
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

    async _enviarSolicitacao() {
        // Se o campo de setor estiver desabilitado (para servidor),
        // ele já estará pré-selecionado com o setor do usuário logado.
        const setorId = parseInt(this.selectSetor.value);
        const justificativa = this.inputJustificativa.value.trim();
        // O campo 'solicitado_localmente_por' só será pego se estiver visível/habilitado.
        const solicitadoLocalmentePor = this.inputSolicitadoLocalmentePor.value.trim();

        if (isNaN(setorId)) {
            showAlert('Por favor, selecione um setor.', 'warning');
            return;
        }

        if (this.itensSelecionados.length === 0) {
            showAlert('Por favor, adicione pelo menos um item para solicitar a retirada.', 'warning');
            return;
        }

        uiService.showLoading();
        try {
            const retiradaData = {
                setor_id: setorId,
                justificativa: justificativa || null,
                // Inclui solicitado_localmente_por apenas se o campo estiver visível (e, portanto, preenchível)
                solicitado_localmente_por: solicitadoLocalmentePor || null,
                itens: this.itensSelecionados.map(item => ({
                    item_id: item.item_id,
                    quantidade_retirada: item.quantidade_retirada
                }))
            };
            
            await apiService.solicitarRetirada(retiradaData);
            showAlert('Solicitação de retirada enviada com sucesso!', 'success');
            this.modalSolicitarRetirada.hide();
            this._resetForm();

            // Recarregar dashboard após envio bem-sucedido
            if (typeof window.loadDashboardOverview === 'function') {
                window.loadDashboardOverview();
            }

        } catch (error) {
            console.error("Erro ao enviar solicitação de retirada", error);
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

        // Garante que o campo "Solicitado localmente por" seja reexibido
        const solicitadoLocalmentePorContainer = this.inputSolicitadoLocalmentePor.closest('.col-md-6');
        if (solicitadoLocalmentePorContainer) {
            solicitadoLocalmentePorContainer.style.display = 'block';
        }
    }

    _clearSelectedItemDisplay() {
        this.selectedItemName.textContent = "";
        this.selectedItemDisplay.style.display = 'none';
        this.btnAdicionarItemRetirada.disabled = true;
    }
}

export const solicitarRetiradaModule = new SolicitarRetiradaModule();
