// frontend/static/js/solicitar-retirada.js
import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert } from './utils.js';

class SolicitarRetiradaModule {
    constructor() {
        this.modalSolicitarRetirada = uiService.getModalInstance('modalSolicitarRetirada');
        this.form = document.getElementById('form-solicitar-retirada');
        this.selectSetor = document.getElementById('solicitar_setor_id');
        this.inputSolicitadoLocalmentePor = document.getElementById('solicitado_localmente_por');
        this.inputJustificativa = document.getElementById('solicitar_justificativa');
        this.selectItemRetirada = document.getElementById('select_item_retirada');
        this.inputQuantidadeItemRetirada = document.getElementById('quantidade_item_retirada');
        this.btnAdicionarItemRetirada = document.getElementById('btn-adicionar-item-retirada');
        this.itensParaRetiradaContainer = document.getElementById('itens-para-retirada-container');
        this.btnSalvarSolicitacaoRetirada = document.getElementById('btn-salvar-solicitacao-retirada');
        this.noItemsMessage = document.getElementById('no-items-message');

        this.itensSelecionados = []; // Guarda os itens que o usuário adicionou para a retirada
        this.todosItensDisponiveis = []; // Guarda todos os itens do almoxarifado
    }

    init() {
        this._bindEvents();
    }

    _bindEvents() {
        // Evento para abrir o modal
        document.getElementById('btn-open-solicitar-retirada')?.addEventListener('click', e => {
            e.preventDefault();
            this.openModal();
        });

        // Evento para adicionar item à lista de retirada
        this.btnAdicionarItemRetirada.addEventListener('click', () => this._adicionarItemParaRetirada());

        // Evento para enviar a solicitação
        this.btnSalvarSolicitacaoRetirada.addEventListener('click', () => this._enviarSolicitacao());

        // Evento para limpar o formulário ao fechar o modal
        document.getElementById('modalSolicitarRetirada').addEventListener('hidden.bs.modal', () => this._resetForm());
    }

    async openModal() {
        try {
            await this._loadInitialData();
            this.modalSolicitarRetirada.show();
        } catch (error) {
            console.error("Erro ao abrir modal de solicitação de retirada:", error);
            showAlert('Não foi possível carregar os dados para a solicitação de retirada.', 'danger');
        }
    }

    async _loadInitialData() {
        // Limpa os dados anteriores
        this.itensSelecionados = [];
        this.todosItensDisponiveis = [];
        this._renderItensParaRetirada(); // Limpa a lista no modal

        uiService.showLoading();
        try {
            const [setoresData, itensData] = await Promise.all([
                apiService.fetchAllSetores(),
                apiService.fetchAllItens()
            ]);

            this.todosItensDisponiveis = itensData; // Armazena todos os itens

            // Popular select de setores
            this.selectSetor.innerHTML = '<option value="" disabled selected>Selecione um setor</option>';
            setoresData.forEach(setor => {
                const option = document.createElement('option');
                option.value = setor.setor_id;
                option.textContent = setor.nome_setor;
                this.selectSetor.appendChild(option);
            });

            // Popular select de itens
            this.selectItemRetirada.innerHTML = '<option value="" disabled selected>Busque ou selecione um item</option>';
            itensData.forEach(item => {
                const option = document.createElement('option');
                option.value = item.item_id;
                option.textContent = `${item.nome_item} (Estoque: ${item.quantidade_item})`;
                option.dataset.quantidade = item.quantidade_item; // Armazena a quantidade disponível
                this.selectItemRetirada.appendChild(option);
            });
            uiService.hideLoading();

        } catch (error) {
            uiService.hideLoading();
            console.error("Erro ao carregar dados iniciais para solicitação:", error);
            showAlert('Erro ao carregar setores e itens. Tente novamente.', 'danger');
            this.modalSolicitarRetirada.hide();
        }
    }

    _adicionarItemParaRetirada() {
        const itemId = parseInt(this.selectItemRetirada.value);
        const quantidade = parseInt(this.inputQuantidadeItemRetirada.value);

        if (isNaN(itemId) || isNaN(quantidade) || quantidade <= 0) {
            showAlert('Por favor, selecione um item e informe uma quantidade válida.', 'warning');
            return;
        }

        const itemExistente = this.itensSelecionados.find(item => item.item_id === itemId);
        const itemDisponivel = this.todosItensDisponiveis.find(item => item.item_id === itemId);

        if (!itemDisponivel) {
            showAlert('Item selecionado não encontrado nos itens disponíveis.', 'danger');
            return;
        }

        // Verifica o estoque
        const quantidadeTotalSolicitada = quantidade + (itemExistente ? itemExistente.quantidade_retirada : 0);
        if (quantidadeTotalSolicitada > itemDisponivel.quantidade_item) {
            showAlert(`Quantidade solicitada para ${itemDisponivel.nome_item} excede o estoque disponível (${itemDisponivel.quantidade_item}).`, 'warning');
            return;
        }

        if (itemExistente) {
            itemExistente.quantidade_retirada += quantidade;
        } else {
            this.itensSelecionados.push({
                item_id: itemId,
                nome_item: itemDisponivel.nome_item, // Para exibição no modal
                quantidade_retirada: quantidade
            });
        }

        this._renderItensParaRetirada();
        // Resetar o input de quantidade para 1 após adicionar
        this.inputQuantidadeItemRetirada.value = 1;
        // Opcional: resetar o select de item, ou manter o último selecionado
        this.selectItemRetirada.value = ""; 
    }

    _renderItensParaRetirada() {
        this.itensParaRetiradaContainer.innerHTML = ''; // Limpa o container

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

        // Adicionar event listeners para os botões de remover
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

        uiService.showLoading(); // Mostra um spinner de carregamento

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
            this.modalSolicitarRetirada.hide(); // Fecha o modal
            this._resetForm(); // Reseta o formulário
            // Opcional: Você pode recarregar a lista de retiradas pendentes aqui, se estiver visível
            // retiradasModule.renderPendentesRetiradas(); 
        } catch (error) {
            console.error("Erro ao enviar solicitação de retirada:", error);
            showAlert(error.message || 'Erro ao enviar a solicitação de retirada.', 'danger');
        } finally {
            uiService.hideLoading(); // Esconde o spinner de carregamento
        }
    }

    _resetForm() {
        this.form.reset(); // Reseta os campos do formulário
        this.itensSelecionados = []; // Limpa os itens selecionados
        this.todosItensDisponiveis = []; // Limpa os itens disponíveis
        this._renderItensParaRetirada(); // Limpa a exibição dos itens no modal
        this.noItemsMessage.style.display = 'block'; // Garante que a mensagem "Nenhum item adicionado" apareça
        this.selectItemRetirada.innerHTML = '<option value="" disabled selected>Busque ou selecione um item</option>'; // Reseta as opções de item
        this.inputQuantidadeItemRetirada.value = 1; // Reseta a quantidade para 1
    }
}

export const solicitarRetiradaModule = new SolicitarRetiradaModule();