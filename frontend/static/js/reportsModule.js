// frontend/static/js/reportsModule.js

import { apiService } from './apiService.js';
import { uiService } from './uiService.js';
import { showAlert } from './utils.js';
import { selecionarItemModule } from './selecionar-item-module.js';

class ReportsModule {
    constructor() {
        // References to main report dashboard modal
        this.modalReportsDashboard = uiService.getModalInstance('modalReportsDashboard');

        // References for Quantidade de Itens report modal
        this.modalReportQuantidadeItens = uiService.getModalInstance('modalReportQuantidadeItens');
        this.formReportQuantidadeItens = document.getElementById('form-report-quantidade-itens');
        this.btnGerarReportQuantidadeItens = document.getElementById('btnGerarReportQuantidadeItens');
        this.filterCategoryReportSelect = document.getElementById('filterCategoryReport');

        // Novas referências para seleção de produto
        this.selectedProductNameReportInput = document.getElementById('selectedProductNameReport');
        this.selectedProductIdReportInput = document.getElementById('selectedProductIdReport'); // Campo hidden para o ID
        this.btnOpenSelectProductReportModal = document.getElementById('btnOpenSelectProductReportModal');
        this.btnClearSelectedProductReport = document.getElementById('btnClearSelectedProductReport');

        // References for Entrada de Itens report modal
        this.modalReportEntradaItens = uiService.getModalInstance('modalReportEntradaItens');
        this.formReportEntradaItens = document.getElementById('form-report-entrada-itens');
        this.btnGerarReportEntradaItens = document.getElementById('btnGerarReportEntradaItens');

        // References for Retiradas por Setor report modal
        this.modalReportRetiradasSetor = uiService.getModalInstance('modalReportRetiradasSetor');
        this.formReportRetiradasSetor = document.getElementById('form-report-retiradas-setor');
        this.selectSetor = document.getElementById('selectSetor');
        this.btnGerarReportRetiradasSetor = document.getElementById('btnGerarReportRetiradasSetor');

        // References for Retiradas por Usuário report modal
        this.modalReportRetiradasUsuario = uiService.getModalInstance('modalReportRetiradasUsuario');
        this.formReportRetiradasUsuario = document.getElementById('form-report-retiradas-usuario');
        this.selectUsuario = document.getElementById('selectUsuario');
        this.btnGerarReportRetiradasUsuario = document.getElementById('btnGerarReportRetiradasUsuario');
    }

    init() {
        this._bindEvents();
    }

    _bindEvents() {
        // --- Event listeners for generating reports ---
        if (this.btnGerarReportQuantidadeItens) {
            this.btnGerarReportQuantidadeItens.addEventListener('click', () => this._handleGerarReportQuantidadeItens());
        }

        if (this.btnGerarReportEntradaItens) {
            this.btnGerarReportEntradaItens.addEventListener('click', () => this._handleGerarReportEntradaItens());
        }

        if (this.btnGerarReportRetiradasSetor) {
            this.btnGerarReportRetiradasSetor.addEventListener('click', () => this._handleGerarReportRetiradasSetor());
        }

        if (this.btnGerarReportRetiradasUsuario) {
            this.btnGerarReportRetiradasUsuario.addEventListener('click', () => this._handleGerarReportRetiradasUsuario());
        }

        // --- Event listeners for modal show/hide to handle dynamic content and resets ---
        if (this.modalReportRetiradasSetor) {
            this.modalReportRetiradasSetor._element.addEventListener('show.bs.modal', () => this._populateSetores());
            this.modalReportRetiradasSetor._element.addEventListener('hidden.bs.modal', () => this.formReportRetiradasSetor.reset());
        }
        if (this.modalReportRetiradasUsuario) {
            this.modalReportRetiradasUsuario._element.addEventListener('show.bs.modal', () => this._populateUsuarios());
            this.modalReportRetiradasUsuario._element.addEventListener('hidden.bs.modal', () => this.formReportRetiradasUsuario.reset());
        }
         if (this.modalReportQuantidadeItens) {
            this.modalReportQuantidadeItens._element.addEventListener('show.bs.modal', () => this._populateCategoriesForReport());
            this.modalReportQuantidadeItens._element.addEventListener('hidden.bs.modal', () => {
                this.formReportQuantidadeItens.reset();
                this._clearSelectedProductFilter();
            });

            // Eventos para o novo botão de seleção de produto e limpeza
            if (this.btnOpenSelectProductReportModal) {
                this.btnOpenSelectProductReportModal.addEventListener('click', () => {
                    this.modalReportQuantidadeItens.hide();
                    // Opcional: Adicione um listener temporário para reabrir o modal
                    // quando o modal de seleção for escondido, independente de seleção.
                    const reOpenReportModal = () => {
                        this.modalReportQuantidadeItens.show();
                        // Remove o listener temporário para evitar que ele reabra o modal em outros contextos
                        selecionarItemModule.modalSelecionarItem._element.removeEventListener('hidden.bs.modal', reOpenReportModal);
                    };
                    selecionarItemModule.modalSelecionarItem._element.addEventListener('hidden.bs.modal', reOpenReportModal);

                    setTimeout(() => {
                        selecionarItemModule.openModal('itemSelectedForReportFilter', 10);
                    }, 300);
                });
            }
            if (this.btnClearSelectedProductReport) {
                this.btnClearSelectedProductReport.addEventListener('click', () => this._clearSelectedProductFilter());
            }
        }
        if (this.modalReportEntradaItens) {
            this.modalReportEntradaItens._element.addEventListener('hidden.bs.modal', () => this.formReportEntradaItens.reset());
        }

        // Listener para o evento customizado disparado pelo selecionarItemModule (quando um item É selecionado)
        document.addEventListener('itemSelectedForReportFilter', (event) => {
            this._handleItemSelectedForReportFilter(event.detail.item);
            // O modal de seleção já se fechou ao despachar o evento.
            // O listener 'hidden.bs.modal' adicionado acima já cuidará de reabrir o modal de relatório.
        });
    }

    async _populateSetores() {
        this.selectSetor.innerHTML = '<option value="" disabled selected>Carregando setores...</option>';
        uiService.showLoading();
        try {
            const setores = await apiService.fetchAllSetores();
            this.selectSetor.innerHTML = '<option value="" disabled selected>Selecione um setor</option>';
            setores.forEach(setor => {
                const option = document.createElement('option');
                option.value = setor.setor_id;
                option.textContent = setor.nome_setor;
                this.selectSetor.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar setores:', error);
            showAlert('Erro ao carregar setores para o relatório.', 'danger');
            this.selectSetor.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
        } finally {
            uiService.hideLoading();
        }
    }

    async _populateUsuarios() {
        this.selectUsuario.innerHTML = '<option value="" disabled selected>Carregando usuários...</option>';
        uiService.showLoading();
        try {
            const usuarios = await apiService.get('/usuarios');
            this.selectUsuario.innerHTML = '<option value="" disabled selected>Selecione um usuário</option>';
            usuarios.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.usuario_id;
                option.textContent = usuario.nome_usuario;
                this.selectUsuario.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            showAlert('Erro ao carregar usuários para o relatório.', 'danger');
            this.selectUsuario.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
        } finally {
            uiService.hideLoading();
        }
    }

    async _populateCategoriesForReport() {
        this.filterCategoryReportSelect.innerHTML = '<option value="">Todas as Categorias</option>';
        uiService.showLoading();
        try {
            const categorias = await apiService.get('/categorias');
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.categoria_id;
                option.textContent = cat.nome_original;
                this.filterCategoryReportSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar categorias para o relatório:', error);
            showAlert('Erro ao carregar categorias.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    _clearSelectedProductFilter() {
        this.selectedProductNameReportInput.value = '';
        this.selectedProductIdReportInput.value = '';
    }

    _handleItemSelectedForReportFilter(selectedItem) {
        if (selectedItem) {
            this.selectedProductNameReportInput.value = selectedItem.nome_item_original;
            this.selectedProductIdReportInput.value = selectedItem.item_id;
            showAlert(`Produto "${selectedItem.nome_item_original}" selecionado para filtro.`, 'info');
        } else {
            this._clearSelectedProductFilter();
            showAlert('Nenhum produto selecionado.', 'warning');
        }
    }

    async _handleGerarReportQuantidadeItens() {
        if (!this.formReportQuantidadeItens.checkValidity()) {
            this.formReportQuantidadeItens.reportValidity();
            return;
        }

        const filtro_categoria = this.filterCategoryReportSelect.value;
        const filtro_produto_id = this.selectedProductIdReportInput.value;
        const formato = document.getElementById('formatoQuantidadeItens').value;

        const params = new URLSearchParams({ formato });
        if (filtro_categoria) params.append('filtro_categoria', filtro_categoria);
        if (filtro_produto_id) {
            params.append('filtro_produto', this.selectedProductNameReportInput.value); // Envia o nome, pois o backend espera o nome
        }

        uiService.showLoading();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/almoxarifado/relatorios/quantidade-itens/?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido ao gerar o relatório.' }));
                throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `relatorio_quantidade_itens.${formato}`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = decodeURIComponent(filenameMatch[1].replace(/^"|"$/g, ''));
                } else {
                    const simpleSplit = contentDisposition.split('filename=')[1];
                    if (simpleSplit) {
                        filename = simpleSplit.replace(/^"|"$/g, '');
                    }
                }
            }

            this._downloadFile(blob, filename);

            showAlert('Relatório de quantidade de itens gerado com sucesso!', 'success');
            this.modalReportQuantidadeItens.hide();
        } catch (error) {
            console.error('Erro ao gerar relatório de quantidade de itens:', error);
            showAlert(error.message || 'Ocorreu um erro ao gerar o relatório de quantidade de itens.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    async _handleGerarReportEntradaItens() {
        if (!this.formReportEntradaItens.checkValidity()) {
            this.formReportEntradaItens.reportValidity();
            return;
        }

        const data_inicio = document.getElementById('dataInicioEntrada').value;
        const data_fim = document.getElementById('dataFimEntrada').value;
        const formato = document.getElementById('formatoEntradaItens').value;

        if (!data_inicio || !data_fim) {
            showAlert('Por favor, preencha as datas inicial e final.', 'warning');
            return;
        }

        const params = new URLSearchParams({ data_inicio, data_fim, formato });

        uiService.showLoading();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/almoxarifado/relatorios/entrada-itens/?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido ao gerar o relatório.' }));
                throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `relatorio_entrada_itens.${formato}`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = decodeURIComponent(filenameMatch[1].replace(/^"|"$/g, ''));
                } else {
                    const simpleSplit = contentDisposition.split('filename=')[1];
                    if (simpleSplit) {
                        filename = simpleSplit.replace(/^"|"$/g, '');
                    }
                }
            }

            this._downloadFile(blob, filename);

            showAlert('Relatório de entrada de itens gerado com sucesso!', 'success');
            this.modalReportEntradaItens.hide();
        } catch (error) {
            console.error('Erro ao gerar relatório de entrada de itens:', error);
            showAlert(error.message || 'Ocorreu um erro ao gerar o relatório de entrada de itens.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    async _handleGerarReportRetiradasSetor() {
        if (!this.formReportRetiradasSetor.checkValidity()) {
            this.formReportRetiradasSetor.reportValidity();
            return;
        }

        const setor_id = this.selectSetor.value;
        const data_inicio = document.getElementById('dataInicioRetiradaSetor').value;
        const data_fim = document.getElementById('dataFimRetiradaSetor').value;
        const formato = document.getElementById('formatoRetiradasSetor').value;

        if (!setor_id || !data_inicio || !data_fim) {
            showAlert('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }

        const params = new URLSearchParams({ setor_id, data_inicio, data_fim, formato });

        uiService.showLoading();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/almoxarifado/relatorios/retiradas-setor/?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido ao gerar o relatório.' }));
                throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `relatorio_retiradas_setor.${formato}`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = decodeURIComponent(filenameMatch[1].replace(/^"|"$/g, ''));
                } else {
                    const simpleSplit = contentDisposition.split('filename=')[1];
                    if (simpleSplit) {
                        filename = simpleSplit.replace(/^"|"$/g, '');
                    }
                }
            }

            this._downloadFile(blob, filename);

            showAlert('Relatório de retiradas por setor gerado com sucesso!', 'success');
            this.modalReportRetiradasSetor.hide();
        } catch (error) {
            console.error('Erro ao gerar relatório de retiradas por setor:', error);
            showAlert(error.message || 'Ocorreu um erro ao gerar o relatório de retiradas por setor.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    async _handleGerarReportRetiradasUsuario() {
        if (!this.formReportRetiradasUsuario.checkValidity()) {
            this.formReportRetiradasUsuario.reportValidity();
            return;
        }

        const usuario_id = this.selectUsuario.value;
        const data_inicio = document.getElementById('dataInicioRetiradaUsuario').value;
        const data_fim = document.getElementById('dataFimRetiradaUsuario').value;
        const formato = document.getElementById('formatoRetiradasUsuario').value;

        if (!usuario_id || !data_inicio || !data_fim) {
            showAlert('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }

        const params = new URLSearchParams({ usuario_id, data_inicio, data_fim, formato });

        uiService.showLoading();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/almoxarifado/relatorios/retiradas-usuario/?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido ao gerar o relatório.' }));
                throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `relatorio_retiradas_usuario.${formato}`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = decodeURIComponent(filenameMatch[1].replace(/^"|"$/g, ''));
                } else {
                    const simpleSplit = contentDisposition.split('filename=')[1];
                    if (simpleSplit) {
                        filename = simpleSplit.replace(/^"|"$/g, '');
                    }
                }
            }

            this._downloadFile(blob, filename);

            showAlert('Relatório de retiradas por usuário gerado com sucesso!', 'success');
            this.modalReportRetiradasUsuario.hide();
        } catch (error) {
            console.error('Erro ao gerar relatório de retiradas por usuário:', error);
            showAlert(error.message || 'Ocorreu um erro ao gerar o relatório de retiradas por usuário.', 'danger');
        } finally {
            uiService.hideLoading();
        }
    }

    _downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

export const reportsModule = new ReportsModule();