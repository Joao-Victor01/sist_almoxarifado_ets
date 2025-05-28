// frontend/static/js/reportsModule.js

import { apiService } from './apiService.js'; // [cite: 36]
import { uiService } from './uiService.js'; // [cite: 196]
import { showAlert } from './utils.js'; // [cite: 211]

class ReportsModule {
    constructor() {
        // References to main report dashboard modal
        this.modalReportsDashboard = uiService.getModalInstance('modalReportsDashboard');

        // References for Quantidade de Itens report modal
        this.modalReportQuantidadeItens = uiService.getModalInstance('modalReportQuantidadeItens');
        this.formReportQuantidadeItens = document.getElementById('form-report-quantidade-itens');
        this.btnGerarReportQuantidadeItens = document.getElementById('btnGerarReportQuantidadeItens');

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
            this.modalReportQuantidadeItens._element.addEventListener('hidden.bs.modal', () => this.formReportQuantidadeItens.reset());
        }
        if (this.modalReportEntradaItens) {
            this.modalReportEntradaItens._element.addEventListener('hidden.bs.modal', () => this.formReportEntradaItens.reset());
        }
    }

    async _populateSetores() {
        this.selectSetor.innerHTML = '<option value="" disabled selected>Carregando setores...</option>';
        uiService.showLoading(); // [cite: 210]
        try {
            const setores = await apiService.fetchAllSetores(); // Assuming apiService has a fetchAllSetores() method [cite: 45]
            this.selectSetor.innerHTML = '<option value="" disabled selected>Selecione um setor</option>';
            setores.forEach(setor => {
                const option = document.createElement('option');
                option.value = setor.setor_id;
                option.textContent = setor.nome_setor;
                this.selectSetor.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar setores:', error);
            showAlert('Erro ao carregar setores para o relatório.', 'danger'); // [cite: 211]
            this.selectSetor.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
        } finally {
            uiService.hideLoading(); // [cite: 210]
        }
    }

    async _populateUsuarios() {
        this.selectUsuario.innerHTML = '<option value="" disabled selected>Carregando usuários...</option>';
        uiService.showLoading(); // [cite: 210]
        try {
            // Assuming an endpoint to fetch all users, or users allowed for reports.
            // You might need to add a new method to apiService for this if it doesn't exist.
            // For now, let's mock it or assume apiService.get('/usuarios') returns a list.
            const usuarios = await apiService.get('/usuarios'); // Placeholder: adjust this API call as needed
            this.selectUsuario.innerHTML = '<option value="" disabled selected>Selecione um usuário</option>';
            usuarios.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.usuario_id;
                option.textContent = usuario.nome_usuario; // Assuming 'nome_usuario' is the display name
                this.selectUsuario.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            showAlert('Erro ao carregar usuários para o relatório.', 'danger'); // [cite: 211]
            this.selectUsuario.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
        } finally {
            uiService.hideLoading(); // [cite: 210]
        }
    }

    async _handleGerarReportQuantidadeItens() {
        if (!this.formReportQuantidadeItens.checkValidity()) {
            this.formReportQuantidadeItens.reportValidity();
            return;
        }

        const filtro_categoria = document.getElementById('filtroCategoria').value.trim();
        const filtro_produto = document.getElementById('filtroProduto').value.trim();
        const formato = document.getElementById('formatoQuantidadeItens').value;

        const params = new URLSearchParams({ formato });
        if (filtro_categoria) params.append('filtro_categoria', filtro_categoria);
        if (filtro_produto) params.append('filtro_produto', filtro_produto);

        uiService.showLoading(); // [cite: 210]
        try {
            // Use fetch directly to handle FileResponse
            const token = localStorage.getItem('token'); // [cite: 37]
            const response = await fetch(`/api/almoxarifado/relatorios/quantidade-itens/?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // [cite: 37]
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido ao gerar o relatório.' }));
                throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
            }

            // Trigger file download
            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `relatorio_quantidade_itens.${formato}`; // Fallback default filename

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i); // Better regex to handle RFC 6266 filename* and filename
                if (filenameMatch && filenameMatch[1]) {
                    filename = decodeURIComponent(filenameMatch[1].replace(/^"|"$/g, '')); // Remove surrounding quotes and decode
                } else {
                    // Fallback to simpler split if regex fails (older browsers, or specific cases)
                    const simpleSplit = contentDisposition.split('filename=')[1];
                    if (simpleSplit) {
                        filename = simpleSplit.replace(/^"|"$/g, ''); // Remove surrounding quotes
                    }
                }
            }

            this._downloadFile(blob, filename);

            showAlert('Relatório de quantidade de itens gerado com sucesso!', 'success'); // [cite: 211]
            this.modalReportQuantidadeItens.hide(); // [cite: 210]
        } catch (error) {
            console.error('Erro ao gerar relatório de quantidade de itens:', error);
            showAlert(error.message || 'Ocorreu um erro ao gerar o relatório de quantidade de itens.', 'danger'); // [cite: 211]
        } finally {
            uiService.hideLoading(); // [cite: 210]
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
            showAlert('Por favor, preencha as datas inicial e final.', 'warning'); // [cite: 211]
            return;
        }

        const params = new URLSearchParams({ data_inicio, data_fim, formato });

        uiService.showLoading(); // [cite: 210]
        try {
            const token = localStorage.getItem('token'); // [cite: 37]
            const response = await fetch(`/api/almoxarifado/relatorios/entrada-itens/?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // [cite: 37]
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido ao gerar o relatório.' }));
                throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `relatorio_quantidade_itens.${formato}`; // Fallback default filename

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i); // Better regex to handle RFC 6266 filename* and filename
                if (filenameMatch && filenameMatch[1]) {
                    filename = decodeURIComponent(filenameMatch[1].replace(/^"|"$/g, '')); // Remove surrounding quotes and decode
                } else {
                    // Fallback to simpler split if regex fails (older browsers, or specific cases)
                    const simpleSplit = contentDisposition.split('filename=')[1];
                    if (simpleSplit) {
                        filename = simpleSplit.replace(/^"|"$/g, ''); // Remove surrounding quotes
                    }
                }
            }

            this._downloadFile(blob, filename);

            showAlert('Relatório de entrada de itens gerado com sucesso!', 'success'); // [cite: 211]
            this.modalReportEntradaItens.hide(); // [cite: 210]
        } catch (error) {
            console.error('Erro ao gerar relatório de entrada de itens:', error);
            showAlert(error.message || 'Ocorreu um erro ao gerar o relatório de entrada de itens.', 'danger'); // [cite: 211]
        } finally {
            uiService.hideLoading(); // [cite: 210]
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
            showAlert('Por favor, preencha todos os campos obrigatórios.', 'warning'); // [cite: 211]
            return;
        }

        const params = new URLSearchParams({ setor_id, data_inicio, data_fim, formato });

        uiService.showLoading(); // [cite: 210]
        try {
            const token = localStorage.getItem('token'); // [cite: 37]
            const response = await fetch(`/api/almoxarifado/relatorios/retiradas-setor/?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // [cite: 37]
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido ao gerar o relatório.' }));
                throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `relatorio_quantidade_itens.${formato}`; // Fallback default filename

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i); // Better regex to handle RFC 6266 filename* and filename
                if (filenameMatch && filenameMatch[1]) {
                    filename = decodeURIComponent(filenameMatch[1].replace(/^"|"$/g, '')); // Remove surrounding quotes and decode
                } else {
                    // Fallback to simpler split if regex fails (older browsers, or specific cases)
                    const simpleSplit = contentDisposition.split('filename=')[1];
                    if (simpleSplit) {
                        filename = simpleSplit.replace(/^"|"$/g, ''); // Remove surrounding quotes
                    }
                }
            }

            this._downloadFile(blob, filename);

            showAlert('Relatório de retiradas por setor gerado com sucesso!', 'success'); // [cite: 211]
            this.modalReportRetiradasSetor.hide(); // [cite: 210]
        } catch (error) {
            console.error('Erro ao gerar relatório de retiradas por setor:', error);
            showAlert(error.message || 'Ocorreu um erro ao gerar o relatório de retiradas por setor.', 'danger'); // [cite: 211]
        } finally {
            uiService.hideLoading(); // [cite: 210]
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
            showAlert('Por favor, preencha todos os campos obrigatórios.', 'warning'); // [cite: 211]
            return;
        }

        const params = new URLSearchParams({ usuario_id, data_inicio, data_fim, formato });

        uiService.showLoading(); // [cite: 210]
        try {
            const token = localStorage.getItem('token'); // [cite: 37]
            const response = await fetch(`/api/almoxarifado/relatorios/retiradas-usuario/?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // [cite: 37]
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido ao gerar o relatório.' }));
                throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `relatorio_quantidade_itens.${formato}`; // Fallback default filename

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i); // Better regex to handle RFC 6266 filename* and filename
                if (filenameMatch && filenameMatch[1]) {
                    filename = decodeURIComponent(filenameMatch[1].replace(/^"|"$/g, '')); // Remove surrounding quotes and decode
                } else {
                    // Fallback to simpler split if regex fails (older browsers, or specific cases)
                    const simpleSplit = contentDisposition.split('filename=')[1];
                    if (simpleSplit) {
                        filename = simpleSplit.replace(/^"|"$/g, ''); // Remove surrounding quotes
                    }
                }
            }

            this._downloadFile(blob, filename);

            showAlert('Relatório de retiradas por usuário gerado com sucesso!', 'success'); // [cite: 211]
            this.modalReportRetiradasUsuario.hide(); // [cite: 210]
        } catch (error) {
            console.error('Erro ao gerar relatório de retiradas por usuário:', error);
            showAlert(error.message || 'Ocorreu um erro ao gerar o relatório de retiradas por usuário.', 'danger'); // [cite: 211]
        } finally {
            uiService.hideLoading(); // [cite: 210]
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