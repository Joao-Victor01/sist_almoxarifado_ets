// frontend/static/js/forgotPasswordModule.js

import { apiService } from './apiService.js';
import { showAlert } from './utils.js';

class ForgotPasswordModule {
    constructor() {
        this.modalEl = document.getElementById('modalForgotPassword');
        this.modal = new bootstrap.Modal(this.modalEl);

        this.step1 = document.getElementById('forgot-password-step-1');
        this.step2 = document.getElementById('forgot-password-step-2');

        this.userEmailInput = document.getElementById('forgotPasswordUserEmail');
        this.newPasswordInput = document.getElementById('newPassword');
        this.confirmNewPasswordInput = document.getElementById('confirmNewPassword');

        this.btnNext = document.getElementById('btnForgotPasswordNext');
        this.btnReset = document.getElementById('btnResetPassword');
        this.btnBack = document.getElementById('btnForgotPasswordBack');

        // Armazenar o username/email para a segunda etapa
        this.usernameOrEmail = '';
    }

    init() {
        // Captura o clique no link "Cadastrar/Recuperação de conta"
        document.getElementById('recover-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal();
        });

        this.btnNext.addEventListener('click', () => this.handleNextStep());
        this.btnReset.addEventListener('click', () => this.handleResetPassword());
        this.btnBack.addEventListener('click', () => this.showStep1());

        // Limpa o formulário e reseta para a etapa 1 ao esconder o modal
        this.modalEl.addEventListener('hidden.bs.modal', () => this.resetModal());
    }

    openModal() {
        this.resetModal(); // Garante que o modal esteja limpo e na primeira etapa
        this.modal.show();
    }

    resetModal() {
        this.userEmailInput.value = '';
        this.newPasswordInput.value = '';
        this.confirmNewPasswordInput.value = '';
        this.usernameOrEmail = '';
        this.showStep1();
    }

    showStep1() {
        this.step1.style.display = 'block';
        this.step2.style.display = 'none';
        this.userEmailInput.focus();
    }

    showStep2() {
        this.step1.style.display = 'none';
        this.step2.style.display = 'block';
        this.newPasswordInput.focus();
    }

    async handleNextStep() {
        const userEmail = this.userEmailInput.value.trim();

        if (!userEmail) {
            showAlert('Por favor, digite seu nome de usuário ou e-mail.', 'warning');
            return;
        }

        // Simula a "busca no banco de dados" para ver se o usuário existe.
        // Como o backend não tem um endpoint específico para "buscar usuário para redefinição"
        // sem expor IDs ou exigir autenticação, vamos diretamente para a etapa 2
        // assumindo que o usuário existe. A validação real de existência
        // e a mensagem de erro ocorrerão apenas na etapa de redefinição de senha.
        // ESTA É A PARTE INSEGURA DA LÓGICA SIMPLES.
        this.usernameOrEmail = userEmail;
        this.showStep2();
        
        // Em uma implementação segura, aqui teria uma chamada à API
        // para verificar a existência do usuário e, se existisse,
        // retornaria um token temporário para a próxima etapa.
        // Por ex.:
        /*
        try {
            // Supondo um endpoint backend: POST /usuarios/check-user-for-reset
            await apiService.checkUserForPasswordReset(userEmail); 
            this.usernameOrEmail = userEmail;
            this.showStep2();
        } catch (error) {
            showAlert(error.message || 'Usuário não encontrado.', 'danger');
        }
        */
    }

    async handleResetPassword() {
        const newPassword = this.newPasswordInput.value;
        const confirmNewPassword = this.confirmNewPasswordInput.value;

        if (!newPassword || !confirmNewPassword) {
            showAlert('Por favor, preencha todos os campos de senha.', 'warning');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showAlert('As senhas não coincidem. Por favor, digite novamente.', 'danger');
            return;
        }

        if (newPassword.length < 6) { // Exemplo de validação de senha mínima
            showAlert('A nova senha deve ter pelo menos 6 caracteres.', 'warning');
            return;
        }

        try {
            // Chama o novo endpoint do backend para redefinir a senha
            await apiService.resetPasswordSimple(this.usernameOrEmail, newPassword);
            showAlert('Sua senha foi redefinida com sucesso! Você já pode fazer login.', 'success');
            this.modal.hide(); // Fecha o modal
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            showAlert(error.message || 'Erro ao redefinir a senha. Verifique o nome de usuário/e-mail e tente novamente.', 'danger');
        }
    }
}

// Instancia e inicializa o módulo
const forgotPasswordModule = new ForgotPasswordModule();
forgotPasswordModule.init();