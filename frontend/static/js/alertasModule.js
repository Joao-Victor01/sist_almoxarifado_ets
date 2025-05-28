// frontend/static/js/alertasModule.js

import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert, formatDateTime } from './utils.js'; // Importar formatDateTime

class AlertasModule {
    constructor() {
        this.modalAlertas = uiService.getModalInstance('modalAlertas');
        this.alertasListContainer = document.getElementById('alertas-list-container');
        this.alertasPaginationContainer = document.getElementById('alertas-pagination-container');

        this.currentPage = 1;
        this.pageSize = 10; // Tamanho de página padrão para alertas
    }

    init() {
        this._bindEvents();
    }

    _bindEvents() {
        // Quando o modal de alertas é aberto
        if (this.modalAlertas) {
            this.modalAlertas._element.addEventListener('show.bs.modal', () => {
                this.currentPage = 1; // Reseta para a primeira página ao abrir
                this.loadAlerts();
            });
            this.modalAlertas._element.addEventListener('hidden.bs.modal', () => {
                // Limpa o conteúdo do modal ao fechar
                this.alertasListContainer.innerHTML = '<p class="text-center text-muted">Carregando alertas...</p>';
                this.alertasPaginationContainer.innerHTML = '';
            });
        }

        // Lógica de paginação para os alertas
        this.alertasPaginationContainer.addEventListener('click', (e) => {
            e.preventDefault();

            const clickedPageLink = e.target.closest('a[data-page]');
            if (clickedPageLink) {
                this.currentPage = parseInt(clickedPageLink.dataset.page);
                this.loadAlerts();
                return;
            }

            const clickedActionButton = e.target.closest('a[data-action]');
            if (clickedActionButton) {
                const action = clickedActionButton.dataset.action;
                let newPage = this.currentPage;

                const totalPagesElement = this.alertasPaginationContainer.querySelector('.pagination .page-item.active .page-link');
                const totalPages = parseInt(totalPagesElement ? totalPagesElement.textContent : '1'); // Fallback para 1

                if (action.includes('prev')) {
                    if (newPage > 1) newPage--;
                } else if (action.includes('next')) {
                    if (newPage < totalPages) newPage++;
                }

                if (newPage !== this.currentPage) {
                    this.currentPage = newPage;
                    this.loadAlerts();
                }
            }
        });

        // Lógica para mudar o tamanho da página
        this.alertasPaginationContainer.addEventListener('change', (e) => {
            if (e.target.id === 'alertsPageSizeSelect') { // ID do select de tamanho de página
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1; // Reseta para a primeira página ao mudar o tamanho
                this.loadAlerts();
            }
        });

        // Lógica para ações na tabela de alertas (ex: ignorar)
        this.alertasListContainer.addEventListener('click', async (e) => {
            if (e.target.closest('.btn-ignorar-alerta')) {
                const button = e.target.closest('.btn-ignorar-alerta');
                const alertaId = button.dataset.id;
                if (confirm('Tem certeza que deseja ignorar futuros alertas para este item/motivo?')) {
                    await this.ignoreAlert(alertaId);
                }
            }
            // Futuramente: Adicionar lógica para marcar como visualizado, se houver um endpoint para isso
        });
    }

    async loadAlerts() {
        uiService.showLoading();
        try {
            // A API de alertas não tem paginação diretamente nos endpoints listados no PDF[cite: 3].
            // Para ter paginação, a API precisaria de endpoints como:
            // GET /alertas/paginated?page=X&size=Y
            // Como não temos, vamos simular uma paginação em memória (não recomendado para grandes datasets)
            // OU buscar todos e aplicar paginação no frontend.
            // A melhor prática é adicionar paginação ao endpoint GET /alertas no backend.

            // Por enquanto, vamos assumir que 'apiService.getAlertsPaginated' existirá,
            // ou que 'apiService.get('/alertas')' retornará todos e faremos a paginação aqui.
            // Para este exemplo, vou assumir um endpoint paginado (melhor abordagem).
            // Se o seu backend '/alertas' não for paginado, você terá que adaptar.
            const data = await apiService.get('/alertas', { page: this.currentPage, size: this.pageSize });
            // ^^^ ATENÇÃO: apiService.get('/alertas') precisa ser adaptado no backend para aceitar page e size,
            // ou criar um novo método 'apiService.getAlertsPaginated' que chame um novo endpoint paginado.

            const alerts = data.items || data; // Se 'data' já for a lista, use 'data', senão 'data.items'

            const tableHeaders = ['Tipo', 'Mensagem', 'Item ID', 'Data do Alerta', 'Ações'];
            
            this.alertasListContainer.innerHTML = uiService.renderTable(tableHeaders, alerts, {
                noRecordsMessage: "Nenhum alerta encontrado.",
                rowMapper: (alerta) => {
                    const tipoAlertaText = this._getTipoAlertaText(alerta.tipo_alerta);
                    return [
                        tipoAlertaText,
                        alerta.mensagem_alerta,
                        alerta.item_id,
                        formatDateTime(alerta.data_alerta)
                    ];
                },
                actionsHtml: (alerta) => `
                    <button class="btn btn-sm btn-info me-1 btn-ver-item" data-item-id="${alerta.item_id}">
                        <i class="bi bi-eye"></i> Item
                    </button>
                    ${!alerta.ignorar_novos ? `
                    <button class="btn btn-sm btn-warning btn-ignorar-alerta" data-id="${alerta.alerta_id}">
                        <i class="bi bi-x-circle"></i> Ignorar
                    </button>
                    ` : '<span class="badge bg-secondary">Ignorado</span>'}
                `
            });

            this.alertasPaginationContainer.innerHTML = uiService.renderPagination(
                data.page || this.currentPage, // Usar data.page se vier da API, senão currentPage
                data.total_pages || 1, // Usar data.total_pages se vier da API, senão 1
                'alerts', // Tipo para paginação (e.g., data-page-alerts, data-action="alerts-prev")
                'alertsPageSizeSelect', // ID para o select de tamanho de página
                this.pageSize
            );

            // Adicionar listener para o botão "Ver Item" (para abrir modal de detalhes do item)
            this.alertasListContainer.querySelectorAll('.btn-ver-item').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const itemId = e.currentTarget.dataset.itemId;
                    // Assumindo que você tem um módulo ou função para exibir detalhes do item
                    // Pode ser o mesmo modal de detalhes de item usado nas retiradas (modal_item_detalhes.html)
                    // Você precisaria de um método em 'selecionar-item-module.js' ou um novo módulo para isso.
                    // Por enquanto, apenas um alerta ou console.log:
                    showAlert(`Funcionalidade de ver detalhes do Item ID ${itemId} em desenvolvimento.`, 'info');
                    // Ou, se tiver um modal de detalhes de item:
                    // exibirDetalhesItem(itemId); // Chamar função para exibir modal de detalhes do item
                });
            });

        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
            showAlert(error.message || 'Erro ao carregar alertas do sistema.', 'danger');
            this.alertasListContainer.innerHTML = '<p class="text-danger">Não foi possível carregar os alertas.</p>';
            this.alertasPaginationContainer.innerHTML = '';
        } finally {
            uiService.hideLoading();
        }
    }

    async ignoreAlert(alertaId) {
        uiService.showLoading();
        try {
            // Chamada à API para ignorar o alerta
            await apiService.patch(`/alertas/ignorar/${alertaId}`); // [cite: 4]
            showAlert('Alerta ignorado com sucesso. Novos alertas para este item/motivo não serão gerados.', 'success');
            this.loadAlerts(); // Recarrega a lista de alertas
        } catch (error) {
            console.error('Erro ao ignorar alerta:', error);
            showAlert(error.message || 'Erro ao ignorar o alerta.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    _getTipoAlertaText(tipoAlertaValue) {
        // Mapear os valores do TipoAlerta do backend [cite: 35]
        switch (tipoAlertaValue) {
            case 1: return '<span class="badge bg-danger"><i class="bi bi-box-fill"></i> Estoque Baixo</span>';
            case 2: return '<span class="badge bg-warning text-dark"><i class="bi bi-calendar-x"></i> Validade Próxima</span>';
            default: return 'Desconhecido';
        }
    }
}

export const alertasModule = new AlertasModule();