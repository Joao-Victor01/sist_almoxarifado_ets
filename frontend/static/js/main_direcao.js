// frontend/static/js/main_direcao.js

import { retiradasModule } from './retiradasModule.js';
import { solicitarRetiradaModule } from './solicitar-retirada.js';
import { selecionarItemModule } from './selecionar-item-module.js';
import { reportsModule } from './reportsModule.js';
import { alertasModule } from './alertasModule.js';
import { apiService } from './apiService.js';
import { setNewAlertsFlag, getNewAlertsFlag, updateNotificationBellUI, showAlert, setNewWithdrawalRequestsFlag, getUserIdFromToken, formatDateTime } from './utils.js';
import { uiService } from './uiService.js';
import estadoGlobal from './estadoGlobal.js'; 
import { dataService } from './dataService.js'; 
// import { historicoServidorModule } from './historicoServidorModule.js'; // Not needed for Direcao
import { usuariosModule } from './usuariosModule.js'; // New module for user management

const NOTIFICATION_SOUND_PATH = '/static/audio/notificacao01.mp3';
const NOTIFICATION_SOUND_PATH_RETIRADA = '/static/audio/notificacao02.mp3';

// Função auxiliar para re-inicializar dropdowns do Bootstrap
export function reinitializeBootstrapDropdowns() {
    const dropdownToggleList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
    dropdownToggleList.map(function (dropdownToggleEl) {
        const dropdownInstance = bootstrap.Dropdown.getInstance(dropdownToggleEl);
        if (dropdownInstance) {
            return new bootstrap.Dropdown(dropdownToggleEl);
        }
        return dropdownInstance;
    });
}

const mainContent = document.getElementById('main-content');
let defaultHTML = mainContent ? mainContent.innerHTML : ''; // Armazena o conteúdo inicial

document.addEventListener('DOMContentLoaded', () => {
    // Determine the dashboard type once on DOMContentLoaded
    const currentPath = window.location.pathname;
    const isDirecaoDashboard = currentPath.includes('/dashboardDirecao'); // Flag for Direcao Dashboard

    const homeButton = document.getElementById('home-button');
    if (homeButton && mainContent) {
        homeButton.addEventListener('click', e => {
            e.preventDefault();
            mainContent.innerHTML = defaultHTML;
            // No specific overview for Direcao like Server, so no window.loadDashboardOverview() here
            bindDirecaoLinks(); // Use Direcao-specific binder
            bindLogoutLink();
            checkAlertsNotification();
            reinitializeBootstrapDropdowns();
        });
    }

    function bindDirecaoLinks() {
        // Usuários
        document.getElementById('listar-usuarios-link')?.addEventListener('click', e => {
            e.preventDefault();
            usuariosModule.renderUsuariosList();
        });
        document.getElementById('btn-open-cadastrar-usuario')?.addEventListener('click', e => {
            e.preventDefault();
            usuariosModule.modalCadastrarUsuario.show(); // Trigger modal directly
        });

        // Itens (read-only)
        document.getElementById('listar-item-link')?.addEventListener('click', e => {
            e.preventDefault();
            // Pass true to indicate read-only view for Direcao
            if (typeof window.renderizarListItens === 'function') {
                window.renderizarListItens(true); 
            } else {
                console.warn("Função global 'renderizarListItens' não encontrada.");
            }
        });

        // Retiradas
        document.getElementById('btn-open-solicitar-retirada')?.addEventListener('click', e => {
            e.preventDefault();
            // Direcao is not a server, so false for the isServidorDashboard flag
            solicitarRetiradaModule.openModal(false); 
        });
        document.getElementById('listar-retiradas-link')?.addEventListener('click', e => {
            e.preventDefault();
            retiradasModule.renderHistoricoRetiradas();
        });
        document.getElementById('listar-retiradas-pendentes-link')?.addEventListener('click', e => {
            e.preventDefault();
            retiradasModule.renderPendentesRetiradas();
        });

        // Relatórios
        document.getElementById('open-reports-dashboard')?.addEventListener('click', e => {
            e.preventDefault();
            reportsModule.modalReportsDashboard.show();
        });

        // Alertas
        document.getElementById('open-alertas-modal')?.addEventListener('click', e => {
            e.preventDefault();
            alertasModule.renderAlertsPage();
        });

        // Event listeners for notification dropdown items (similar to main.js)
        const newWithdrawalRequestsMenuItem = document.getElementById('new-withdrawal-requests-menu-item');
        const newAlertsMenuItem = document.getElementById('new-alerts-menu-item');
        const openAllNotificationsLink = document.getElementById('open-all-notifications-link');
        const hideNotificationDropdown = () => {
            bootstrap.Dropdown.getInstance(document.getElementById('alert-notification-bell'))?.hide();
        };

        if (newAlertsMenuItem) {
            newAlertsMenuItem.addEventListener('click', e => {
                e.preventDefault();
                setNewAlertsFlag(false);
                updateNotificationBellUI();
                alertasModule.renderAlertsPage();
                hideNotificationDropdown();
            });
        }
        if (newWithdrawalRequestsMenuItem) {
            newWithdrawalRequestsMenuItem.addEventListener('click', e => {
                e.preventDefault();
                setNewWithdrawalRequestsFlag(false);
                updateNotificationBellUI();
                retiradasModule.renderPendentesRetiradas();
                hideNotificationDropdown();
            });
        }
        if (openAllNotificationsLink) {
            openAllNotificationsLink.addEventListener('click', e => {
                e.preventDefault();
                setNewAlertsFlag(false);
                setNewWithdrawalRequestsFlag(false);
                updateNotificationBellUI();
                alertasModule.renderAlertsPage(); // Or a combined notification view
                hideNotificationDropdown();
            });
        }
    }

    function bindLogoutLink() {
        document.getElementById('logout-link')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof window.logout === 'function') window.logout();
            else console.warn("Função global 'logout' não encontrada.");
        });
    }

    async function checkAlertsNotification() {
        try {
            const alertsCount = await apiService.getUnviewedAlertsCount();
            if (alertsCount > 0) {
                setNewAlertsFlag(true);
            } else {
                setNewAlertsFlag(false);
            }
            updateNotificationBellUI();
        } catch (error) {
            console.error('checkAlertsNotification: Erro ao verificar notificações', error);
            setNewAlertsFlag(false);
            setNewWithdrawalRequestsFlag(false);
        }
    }

    let ws;

    function connectAlertsWebSocket() {
        const userId = getUserIdFromToken();
        console.log("UserID para WebSocket:", userId);

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/almoxarifado/ws/alerts${userId ? `?user_id=${userId}` : ''}`;

        ws = new WebSocket(wsUrl);

        ws.onopen = (event) => {
            console.log("WebSocket para notificações conectado:", event);
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("Mensagem WebSocket recebida", message);

            // Notification handling for Almoxarifado/Direcao (similar logic)
            if (message.type === "new_alert") {
                setNewAlertsFlag(true);
                showAlert("Novo alerta: " + message.message, "info", 5000);
                try {
                    const audio = new Audio(NOTIFICATION_SOUND_PATH);
                    audio.play().catch(e => console.error("Erro ao tocar som de notificação:", e));
                } catch (e) {
                    console.error("Não foi possível criar objeto de áudio para notificação:", e);
                }
            } else if (message.type === "new_withdrawal_request") {
                setNewWithdrawalRequestsFlag(true);
                showAlert("Nova solicitação de retirada: " + message.message, "primary", 5000);
                try {
                    const audio = new Audio(NOTIFICATION_SOUND_PATH_RETIRADA);
                    audio.play().catch(e => console.error("Erro ao tocar som de notificação", e));
                } catch (e) {
                    console.error("Não foi possível criar objeto de áudio para notificação:", e);
                }
            }
            updateNotificationBellUI();
        };

        ws.onclose = (event) => {
            console.warn("WebSocket para notificações desconectado:", event.code, event.reason);
            setTimeout(connectAlertsWebSocket, 5000);
        };

        ws.onerror = (error) => {
            console.error("Erro no WebSocket para notificações:", error);
            ws.close();
        };
    }

    // Initialize modules
    solicitarRetiradaModule.init();
    selecionarItemModule.init();
    reportsModule.init();
    alertasModule.init();
    usuariosModule.init(); // Initialize the new module

    // Bind initial links for Direcao dashboard
    bindDirecaoLinks();
    checkAlertsNotification();
    connectAlertsWebSocket();
    reinitializeBootstrapDropdowns();
});
