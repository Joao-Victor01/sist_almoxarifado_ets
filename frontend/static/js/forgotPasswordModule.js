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

        this.usernameOrEmail = ''; // Armazenar o username/email para a segunda etapa
    }

    init() {
        document.getElementById('recover-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal();
        });

        this.btnNext.addEventListener('click', () => this.handleNextStep());
        this.btnReset.addEventListener('click', () => this.handleResetPassword());
        this.btnBack.addEventListener('click', () => this.showStep1());

        this.modalEl.addEventListener('hidden.bs.modal', () => this.resetModal());
    }

    openModal() {
        this.resetModal();
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

// frontend/static/js/forgotPasswordModule.js

    async handleNextStep() {
        const userEmail = this.userEmailInput.value.trim();

        if (!userEmail) {
            showAlert('Por favor, digite seu nome de usuário ou e-mail.', 'warning');
            return;
        }

        try {
            const exists = await apiService.checkUserForPasswordReset(userEmail);

            if (exists) {
            this.usernameOrEmail = userEmail; // armazena para a segunda etapa
            showAlert('Usuário encontrado. Por favor, digite sua nova senha.', 'info');
            this.showStep2();
            } else {
            // usuário não localizado
            showAlert('Usuário não encontrado. Verifique o nome de usuário ou e-mail.', 'danger');
            }
        } catch (error) {
            console.error('Erro inesperado ao verificar usuário para redefinição:', error);
            showAlert(error.message || 'Erro ao verificar usuário. Tente novamente mais tarde.', 'danger');
        }
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

        // if (newPassword.length < 6) { // Exemplo de validação de senha mínima
        //     showAlert('A nova senha deve ter pelo menos 6 caracteres.', 'warning');
        //     return;
        // }

        try {
            await apiService.resetPasswordSimple(this.usernameOrEmail, newPassword);
            showAlert('Sua senha foi redefinida com sucesso! Você já pode fazer login.', 'success');
            this.modal.hide();
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            // Exibe a mensagem de erro vinda da API, ou uma mensagem genérica
            showAlert(error.message || 'Erro ao redefinir a senha. Tente novamente mais tarde.', 'danger');
        }
    }
}

const forgotPasswordModule = new ForgotPasswordModule();
forgotPasswordModule.init();