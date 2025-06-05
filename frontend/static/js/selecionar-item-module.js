// frontend/static/js/selecionar-item-module.js

import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert } from './utils.js';

class SelecionarItemModule {
  constructor() {
    this.modalSelecionarItem = uiService.getModalInstance('modalSelecionarItemRetirada');
    this.searchForm = document.getElementById('form-search-item-retirada');
    this.searchItemNameInput = document.getElementById('searchItemName');
    this.btnSearchItem = document.getElementById('btn-search-item');
    this.btnClearItemSearch = document.getElementById('btn-clear-item-search');
    this.itensListContainer = document.getElementById('itens-list-container');
    this.itensPaginationContainer = document.getElementById('itens-pagination-container');
    
    this.currentPage = 1;
    this.pageSize = 10; // Default page size
    this.currentSearchTerm = '';
    this.callerEventName = 'itemSelectedForRetirada';
    this.currentTotalPages = 1; // Novo atributo para armazenar o total de páginas
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    this.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.currentSearchTerm = this.searchItemNameInput.value.trim();
      this.currentPage = 1;
      this.loadItems();
    });

    this.btnClearItemSearch.addEventListener('click', () => {
      this.currentSearchTerm = '';
      this.searchItemNameInput.value = '';
      this.currentPage = 1;
      this.loadItems();
    });

    this.itensPaginationContainer.addEventListener('click', (e) => {
      e.preventDefault(); // Previne o comportamento padrão do link para todos os cliques de paginação
      
      // Lógica para links de página individuais (números)
      const clickedPageLink = e.target.closest('a[data-page]');
      if (clickedPageLink) {
        // Extrair o número da página corretamente da string "itemSearch-N"
        const pageValue = clickedPageLink.dataset.page.split('-')[1]; // Pega "N" de "itemSearch-N"
        const parsedPage = parseInt(pageValue);

        if (isNaN(parsedPage)) {
          console.error('ERRO: parseInt retornou NaN para o valor de pageValue:', pageValue);
          showAlert('Erro na paginação: o número da página não é válido.', 'danger');
          return;
        }

        this.currentPage = parsedPage;
        this.loadItems();
        return;
      }

      // Lógica para botões "Anterior" ou "Próximo"
      const clickedActionButton = e.target.closest('a[data-action]');
      if (clickedActionButton) {
        const action = clickedActionButton.dataset.action;
        let newPage = this.currentPage;
        const totalPages = this.currentTotalPages;

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

    this.itensPaginationContainer.addEventListener('change', (e) => {
      if (e.target.id === 'itemSearchPageSize') {
        this.pageSize = parseInt(e.target.value);
        this.currentPage = 1; // Reseta para a primeira página
        this.loadItems();
      }
    });

    this.itensListContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-selecionar-item')) {
        const itemId = parseInt(e.target.dataset.id);
        this.selectItem(itemId);
      }
    });

    document.getElementById('modalSelecionarItemRetirada').addEventListener('hidden.bs.modal', () => {
      this.searchItemNameInput.value = '';
      this.currentSearchTerm = '';
      this.currentPage = 1;
      this.itensListContainer.innerHTML = '';
      this.itensPaginationContainer.innerHTML = '';
      this.callerEventName = 'itemSelectedForRetirada'; // Reset to default
      this.currentTotalPages = 1; // Reset total pages on modal hide
    });
  }

  async openModal(eventName = 'itemSelectedForRetirada', pageSize = this.pageSize) {
    this.callerEventName = eventName;
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.currentSearchTerm = '';
    this.searchItemNameInput.value = '';

    await this.loadItems();
    this.modalSelecionarItem.show();
  }

  async loadItems() {
    uiService.showLoading();
    try {
      const data = await apiService.searchItems(this.currentSearchTerm, null, this.currentPage, this.pageSize);
      this.currentTotalPages = data.total_pages;

      const tableHeaders = ['Nome', 'Ações'];
      this.itensListContainer.innerHTML = uiService.renderTable(tableHeaders, data.items, {
        noRecordsMessage: "Nenhum item encontrado.",
        rowMapper: (item) => [item.nome_item_original],
        actionsHtml: (item) => `
          <button class="btn btn-sm btn-primary btn-selecionar-item" data-id="${item.item_id}">
            Selecionar
          </button>
        `
      });

      this.itensPaginationContainer.innerHTML = uiService.renderPagination(
        data.page,
        data.total_pages,
        'itemSearch', // Este 'type' ainda será usado para data-action="itemSearch-prev/next"
        'itemSearchPageSize',
        this.pageSize
      );

    } catch (error) {
      console.error("Erro ao carregar itens para seleção", error);
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
      
      const event = new CustomEvent(this.callerEventName, {
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