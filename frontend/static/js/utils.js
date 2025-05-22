// frontend/static/js/utils.js
import estadoGlobal from './estadoGlobal.js';

export function showAlert(message, type = 'success') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.prepend(wrapper);
    } else {
        console.error("Elemento 'main-content' não encontrado para exibir alerta.");
    }
}

export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

export function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
}

export function getStatusText(statusCode) {
    return estadoGlobal.statusMap[statusCode] || 'Desconhecido';
}

export function getStatusValue(statusName) {
    return estadoGlobal.statusMapUpdate[statusName];
}

export function getModalInstance(modalId) {
    const modalElement = document.getElementById(modalId);
    return bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
}