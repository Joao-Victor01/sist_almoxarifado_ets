// frontend/static/js/selecionar-item-module.js
import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert } from './utils.js';
import estadoGlobal from './estadoGlobal.js';

class SelecionarItemModule {
    constructor() {
        this.modalSelecionarItem = uiService.getModalInstance('modalSelecionarItemRetirada');
        this.searchForm = document.getElementById('form-search-item-retirada');
        this.searchItemNameInput = document.getElementById('searchItemName');
        this.btnSearchItem = document.getElementById('btn-search-item');
        this.btnClearItemSearch = document.getElementById('btn-clear-item-search'); // NOVO: Referência ao botão de limpar
        this.itensListContainer = document.getElementById('itens-list-container');
        this.itensPaginationContainer = document.getElementById('itens-pagination-container');

        this.currentPage = 1;
        this.pageSize = estadoGlobal.currentHistoricoPageSize; // Pode ser um novo estadoGlobal.itemSearchPageSize
        this.currentSearchTerm = '';
    }

    init() {
        this._bindEvents();
    }

    _bindEvents() {
        this.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.currentSearchTerm = this.searchItemNameInput.value.trim();
            this.currentPage = 1; // Reseta para a primeira página ao fazer uma nova busca
            this.loadItems();
        });

        // NOVO: Evento para o botão de limpar busca
        this.btnClearItemSearch.addEventListener('click', () => {
            this.searchItemNameInput.value = ''; // Limpa o campo de texto
            this.currentSearchTerm = ''; // Reseta o termo de busca interno
            this.currentPage = 1; // Reseta para a primeira página
            this.loadItems(); // Recarrega os itens sem filtro
        });

        // Event delegation para a paginação dentro do modal
        this.itensPaginationContainer.addEventListener('click', (e) => {
            // Verifica se o clique foi em um link de paginação (data-page)
            if (e.target.tagName === 'A' && e.target.dataset.page) {
                e.preventDefault();
                this.currentPage = parseInt(e.target.dataset.page);
                this.loadItems();
            }
            // Verifica se o clique foi no botão "Anterior" ou "Próximo" da paginação
            if (e.target.tagName === 'A' && e.target.dataset.action) {
                const action = e.target.dataset.action;
                let newPage = this.currentPage;
                const totalPagesElement = this.itensPaginationContainer.querySelector('.pagination .page-item.active .page-link');
                const totalPages = parseInt(totalPagesElement ? totalPagesElement.textContent : '1'); // Obter total de páginas da UI

                if (action.includes('prev')) {
                    if (newPage > 1) newPage--;
                } else if (action.includes('next')) {
                    if (newPage < totalPages) newPage++;
                }

                if (newPage !== this.currentPage) {
                    this.currentPage = newPage;
                    this.loadItems();
                }
            }
        });

        // Event delegation para o select de tamanho da página
        this.itensPaginationContainer.addEventListener('change', (e) => {
            if (e.target.id === 'itemSearchPageSize') { 
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1; // Reseta para a primeira página
                this.loadItems();
            }
        });

        // Event delegation para os botões "Selecionar" da tabela de itens
        this.itensListContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-selecionar-item')) {
                const itemId = parseInt(e.target.dataset.id);
                this.selectItem(itemId);
            }
        });

        // Opcional: Limpar o campo de busca e o estado ao fechar o modal
        document.getElementById('modalSelecionarItemRetirada').addEventListener('hidden.bs.modal', () => {
            this.searchItemNameInput.value = '';
            this.currentSearchTerm = '';
            this.currentPage = 1;
            this.itensListContainer.innerHTML = '';
            this.itensPaginationContainer.innerHTML = '';
        });
    }

    async openModal() {
        this.currentPage = 1;
        this.currentSearchTerm = '';
        this.searchItemNameInput.value = ''; // Limpa o campo de busca
        await this.loadItems(); // Carrega os itens na abertura do modal
        this.modalSelecionarItem.show();
    }

    async loadItems() {
        uiService.showLoading();
        try {
            // Usar o endpoint de busca de itens paginados
            const data = await apiService.searchItems(this.currentSearchTerm, null, this.currentPage, this.pageSize);

            const tableHeaders = ['ID', 'Nome', 'Ações'];
            
            // Renderiza a tabela dentro da div com scroll
            this.itensListContainer.innerHTML = uiService.renderTable(tableHeaders, data.items, {
                noRecordsMessage: "Nenhum item encontrado.",
                rowMapper: (item) => [
                    item.item_id,
                    item.nome_item_original
                ],
                actionsHtml: (item) => `
                    <button class="btn btn-sm btn-primary btn-selecionar-item" data-id="${item.item_id}">Selecionar</button>
                `
            });

            // Renderiza a paginação fora da div com scroll
            this.itensPaginationContainer.innerHTML = uiService.renderPagination(
                data.page,
                data.total_pages,
                'itemSearch', // Tipo para identificação da paginação
                'itemSearchPageSize', // ID para o select de tamanho da página
                this.pageSize
            );

        } catch (error) {
            console.error("Erro ao carregar itens para seleção:", error);
            showAlert(error.message || 'Erro ao carregar itens disponíveis.', 'danger');
            this.itensListContainer.innerHTML = `<p class="text-danger">Não foi possível carregar os itens.</p>`;
            this.itensPaginationContainer.innerHTML = '';
        } finally {
            uiService.hideLoading();
        }
    }

    async selectItem(itemId) {
        uiService.showLoading();
        try {
            const item = await apiService.getItemById(itemId);
            
            const event = new CustomEvent('itemSelectedForRetirada', {
                detail: { item: item }
            });
            document.dispatchEvent(event);

            this.modalSelecionarItem.hide();
            showAlert(`Item "${item.nome_item_original}" selecionado com sucesso!`, 'success');
        } catch (error) {
            console.error("Erro ao selecionar item:", error);
            showAlert(error.message || 'Erro ao selecionar o item.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }
}

export const selecionarItemModule = new SelecionarItemModule();