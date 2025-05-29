// frontend/static/js/utils.js

import estadoGlobal from './estadoGlobal.js';

export function showAlert (message, type = 'success', duration = 5000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error("Elemento 'toast-container' não encontrado para exibir alerta.");
        return;
    }

    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center text-white bg-${type} border-0 fade show`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    toastElement.innerHTML = `
        <div class="d-flex" >
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>`;

    toastContainer.appendChild(toastElement);

    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: duration
    });

    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

export function formatDate(dateString) {
    if (!dateString) return `N/A`;
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

export function formatDateTime (dateString) {
    if (!dateString) return `N/A`;
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
}

export function getStatusText(statusCode) {
    return estadoGlobal.statusMap [statusCode] || 'Desconhecido';
}

export function getStatusValue(statusName) {
    return estadoGlobal.statusMapUpdate [statusName];
}

const NEW_ALERTS_FLAG_KEY = 'hasNewAlerts';

export function setNewAlertsFlag(hasNewAlerts) {
    if (hasNewAlerts) {
        localStorage.setItem(NEW_ALERTS_FLAG_KEY, 'true');
    } else {
        localStorage.removeItem(NEW_ALERTS_FLAG_KEY);
    }
    updateNotificationBellUI(); // Atualiza a UI imediatamente
}

export function getNewAlertsFlag() {
    const flag = localStorage.getItem(NEW_ALERTS_FLAG_KEY) === 'true';
    return flag;
}

export function updateNotificationBellUI() {
    const notificationDot = document.getElementById('notification-dot');
    if (notificationDot) {
        if (getNewAlertsFlag()) {
            notificationDot.style.display = 'block';
            notificationDot.classList.add('animate__animated', 'animate__pulse');
        } else {
            notificationDot.style.display = 'none';
            notificationDot.classList.remove('animate__animated', 'animate__pulse');
        }
    } else {
        console.warn('updateNotificationBellUI: Elemento #notification-dot não encontrado.');
    }
}
