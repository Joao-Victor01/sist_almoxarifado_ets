// frontend/static/js/solicitar-retirada.js
import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert } from './utils.js';
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
        this.selectedItemDisplay = document.getElementById('selected-item-display'); //
        this.selectedItemName = document.getElementById('selected-item-name'); //
        // Linha removida: this.selectedItemStock = document.getElementById('selected-item-stock');

        this.itensSelecionados = [];
        this.todosItensDisponiveis = [];
        this.currentItemToAddToCart = null;
    }

    init() {
        this._bindEvents();
    }

    _bindEvents() {
        document.getElementById('btn-open-solicitar-retirada')?.addEventListener('click', e => {
            e.preventDefault();
            this.openModal();
        });

        this.btnAbrirSelecionarItemModal?.addEventListener('click', () => {
            this.openSelecionarItemModal();
        });

        this.btnSalvarSolicitacaoRetirada.addEventListener('click', () => this._enviarSolicitacao());

        this.btnAdicionarItemRetirada?.addEventListener('click', () => this._adicionarItemParaRetirada());

        document.getElementById('modalSolicitarRetirada').addEventListener('hidden.bs.modal', () => this._resetForm());

        document.addEventListener('itemSelectedForRetirada', (event) => {
            this.handleItemSelected(event.detail.item);
        });
    }

    async openModal() {
        uiService.showLoading();
        try {
            const setoresData = await apiService.fetchAllSetores();

            this.selectSetor.innerHTML = '<option value="" disabled selected>Selecione um setor</option>';
            setoresData.forEach(setor => {
                const option = document.createElement('option');
                option.value = setor.setor_id;
                option.textContent = setor.nome_setor;
                this.selectSetor.appendChild(option);
            });
            
            this.itensSelecionados = [];
            this._renderItensParaRetirada();
            this._clearSelectedItemDisplay(); //

            uiService.hideLoading();
            this.modalSolicitarRetirada.show();

        } catch (error) {
            uiService.hideLoading();
            console.error("Erro ao carregar dados iniciais para solicitação:", error);
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
        this.selectedItemName.textContent = selectedItem.nome_item_original; //
        // Linha removida: this.selectedItemStock.textContent = selectedItem.quantidade_item;
        this.selectedItemDisplay.style.display = 'block'; //
        this.btnAdicionarItemRetirada.disabled = false; //

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

        const itemExistente = this.itensSelecionados.find(item => item.item_id === this.currentItemToAddToCart.item_id);
        
        const quantidadeDisponivel = this.currentItemToAddToCart.quantidade_item;
        const quantidadeTotalSolicitada = quantidade + (itemExistente ? itemExistente.quantidade_retirada : 0);

        if (quantidadeTotalSolicitada > quantidadeDisponivel) {
            showAlert(`Quantidade solicitada para ${this.currentItemToAddToCart.nome_item_original} excede o estoque disponível (${quantidadeDisponivel}).`, 'warning');
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
        this._clearSelectedItemDisplay(); //
        this.currentItemToAddToCart = null;
        this.inputQuantidadeAddItem.value = 1;
    }

    _renderItensParaRetirada() {
        this.itensParaRetiradaContainer.innerHTML = '';

        if (this.itensSelecionados.length === 0) {
            this.noItemsMessage.style.display = 'block';
            this.itensParaRetiradaContainer.appendChild(this.noItemsMessage);
            return;
        } else {
            this.noItemsMessage.style.display = 'none';
        }

        this.itensSelecionados.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'col-12 d-flex justify-content-between align-items-center bg-light p-2 rounded mb-2';
            itemElement.innerHTML = `
                <span>${item.nome_item} - Quantidade: ${item.quantidade_retirada}</span>
                <button type="button" class="btn btn-sm btn-danger btn-remover-item" data-item-id="${item.item_id}">
                    <i class="bi bi-trash"></i> Remover
                </button>
            `;
            this.itensParaRetiradaContainer.appendChild(itemElement);
        });

        this.itensParaRetiradaContainer.querySelectorAll('.btn-remover-item').forEach(btn => {
            btn.addEventListener('click', (e) => this._removerItemParaRetirada(parseInt(e.currentTarget.dataset.itemId)));
        });
    }

    _removerItemParaRetirada(itemId) {
        this.itensSelecionados = this.itensSelecionados.filter(item => item.item_id !== itemId);
        this._renderItensParaRetirada();
    }

    async _enviarSolicitacao() {
        const setorId = parseInt(this.selectSetor.value);
        const justificativa = this.inputJustificativa.value.trim();
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
        } catch (error) {
            console.error("Erro ao enviar solicitação de retirada:", error);
            showAlert(error.message || 'Erro ao enviar a solicitação de retirada.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    _resetForm() {
        this.form.reset();
        this.itensSelecionados = [];
        this._renderItensParaRetirada();
        this.noItemsMessage.style.display = 'block';
        this.inputQuantidadeAddItem.value = 1;
        this.currentItemToAddToCart = null;
        this._clearSelectedItemDisplay(); //
    }

    _clearSelectedItemDisplay() {
        this.selectedItemName.textContent = ''; //
        // Linha removida: this.selectedItemStock.textContent = '';
        this.selectedItemDisplay.style.display = 'none'; //
        this.btnAdicionarItemRetirada.disabled = true; //
    }
}

export const solicitarRetiradaModule = new SolicitarRetiradaModule();