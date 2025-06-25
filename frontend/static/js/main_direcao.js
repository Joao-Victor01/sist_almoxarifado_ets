// frontend/static/js/main_direcao.js

import { retiradasModule } from './retiradasModule.js';
import { solicitarRetiradaModule } from './solicitar-retirada.js';
import { selecionarItemModule } from './selecionar-item-module.js';
import { reportsModule } from './reportsModule.js';
import { alertasModule } from './alertasModule.js';
import { apiService } from './apiService.js';
import { setNewAlertsFlag, updateNotificationBellUI, showAlert, setNewWithdrawalRequestsFlag, getUserIdFromToken } from './utils.js';
import { usuariosModule } from './usuariosModule.js';
import { setoresModule } from './setoresModule.js'; 
import { uiService } from './uiService.js';

const NOTIFICATION_SOUND_PATH = '/static/audio/notificacao01.mp3';

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
// defaultHTML deve ser capturado no DOMContentLoaded, mas apenas o HTML inicial do container
// e não o que pode ser injetado dinamicamente após
let defaultHTML = mainContent ? mainContent.innerHTML : ''; 

document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const isDirecaoDashboard = currentPath.includes('/dashboardDirecao'); 

    const homeButton = document.getElementById('home-button');
    if (homeButton && mainContent) {
        homeButton.addEventListener('click', e => {
            e.preventDefault();
            // Restaura o HTML padrão do mainContent antes de qualquer outra operação
            // É importante que 'defaultHTML' contenha o estado original do div#main-content
            // para que todos os elementos sejam recriados e possam ter os listeners vinculados.
            mainContent.innerHTML = defaultHTML; 
            
            // Rebind dos links e funções após restaurar o HTML
            bindDirecaoLinks(); 
            bindLogoutLink();
            checkAlertsNotification();
            reinitializeBootstrapDropdowns();

            // Chama a função de boas-vindas apenas se for o dashboard da Direção
            if (isDirecaoDashboard) { 
                window.loadDirecaoWelcomeSection(); // Chama a função global
            }
        });
    }

    function bindDirecaoLinks() {
        // Usuários
        document.getElementById('listar-usuarios-link')?.addEventListener('click', e => {
            e.preventDefault();
            usuariosModule.renderUsuariosList();
        });
        // Adicionado para o quick access card
        document.getElementById('listar-usuarios-link-quick')?.addEventListener('click', e => {
            e.preventDefault();
            usuariosModule.renderUsuariosList();
        });

        document.getElementById('btn-open-cadastrar-usuario')?.addEventListener('click', e => {
            e.preventDefault();
            usuariosModule.modalCadastrarUsuario.show(); // Trigger modal directly
        });

        // Setores
        document.getElementById('listar-setores-link')?.addEventListener('click', e => {
            e.preventDefault();
            setoresModule.renderSetoresList();
        });
        // Adicionado para o quick access card
        document.getElementById('listar-setores-link-quick')?.addEventListener('click', e => {
            e.preventDefault();
            setoresModule.renderSetoresList();
        });

        document.getElementById('btn-open-cadastrar-setor')?.addEventListener('click', e => {
            e.preventDefault();
            setoresModule.modalCadastrarSetor.show();
        });

        // Itens 
        document.getElementById('listar-item-link')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof window.renderizarListItens === 'function') {
                window.renderizarListItens(true); 
            } else {
                console.warn("Função global 'renderizarListItens' não encontrada.");
            }
        });

        // Retiradas
        document.getElementById('btn-open-solicitar-retirada')?.addEventListener('click', e => {
            e.preventDefault();
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
        // Adicionado para o quick access card
        document.getElementById('open-reports-dashboard-quick')?.addEventListener('click', e => {
            e.preventDefault();
            reportsModule.modalReportsDashboard.show();
        });

        // Alertas
        document.getElementById('open-alertas-modal')?.addEventListener('click', e => {
            e.preventDefault();
            alertasModule.renderAlertsPage();
        });
        // Adicionado para o quick access card
        document.getElementById('open-alertas-modal-quick')?.addEventListener('click', e => {
            e.preventDefault();
            alertasModule.renderAlertsPage();
        });

        //Editar perfil próprio
        document.getElementById('edit-profile-link')?.addEventListener('click', async e => {
            e.preventDefault();
            await usuariosModule.openEditProfileModal();
        });

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
                alertasModule.renderAlertsPage(); 
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
        }
        catch (error) {
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

            const isServidorDashboard = window.location.pathname.includes('/dashboardServidor');
            if (isServidorDashboard) {
                if (message.type === "withdrawal_status_update") {
                    setNewWithdrawalRequestsFlag(true);
                    const statusText = estadoGlobal.statusMap[message.status] || 'Desconhecido';
                    showAlert(`Sua solicitação de retirada ID ${message.retirada_id} foi atualizada para ${statusText}!`, 'info');
                    try {
                        const audio = new Audio(NOTIFICATION_SOUND_PATH_RETIRADA);
                        audio.play().catch(e => console.error("Erro ao tocar som de notificação de retirada:", e));
                    } catch (e) {
                        console.error("Não foi possível criar objeto de audio para notificação:", e);
                    }
                    window.loadDashboardOverview(); // Chamar a função global
                }
            } else { // Para Almoxarifado/Direção
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
                        audio.play().catch(e => console.error("Erro ao tocar som de notificação:", e));
                    } catch (e) {
                        console.error("Não foi possível criar objeto de áudio para notificação:", e);
                    }
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

    // Função para carregar e exibir as informações do usuário no dashboard da Direção
    // Esta função será exportada globalmente
    window.loadDirecaoWelcomeSection = async function() { // Tornada global
        uiService.showLoading();
        const welcomeUserNameDirecao = document.getElementById('welcome-user-name-direcao');
        const userSiapeDirecao = document.getElementById('user-siape-direcao');
        const userSectorDirecao = document.getElementById('user-sector-direcao');

        // Inicializa com texto padrão imediatamente para evitar "Carregando..." persistente
        if (welcomeUserNameDirecao) welcomeUserNameDirecao.textContent = 'Direção'; 
        if (userSiapeDirecao) userSiapeDirecao.textContent = 'N/D';
        if (userSectorDirecao) userSectorDirecao.textContent = 'N/D';

        try {
            const userId = getUserIdFromToken();
            if (userId) {
                if (welcomeUserNameDirecao && userSiapeDirecao && userSectorDirecao) {
                    const userDetails = await apiService.getCurrentUserDetails(userId);
                    welcomeUserNameDirecao.textContent = userDetails.name || 'Direção';
                    userSiapeDirecao.textContent = userDetails.siape || 'N/D';
                    userSectorDirecao.textContent = userDetails.sectorName || 'N/D';
                } else {
                    console.warn("Elementos de detalhes do usuário para Direção não encontrados no DOM. Ignorando atualização com dados da API.");
                }
            } else {
                console.warn("Usuário não logado ou ID de usuário não encontrado para carregar o overview da Direção. Exibindo valores padrão.");
            }
        } catch (error) {
            console.error("Erro ao carregar o overview do dashboard da Direção:", error);
            showAlert("Erro ao carregar informações do dashboard da Direção. Tente novamente.", "danger");
            if (welcomeUserNameDirecao) welcomeUserNameDirecao.textContent = 'Erro';
            if (userSiapeDirecao) userSiapeDirecao.textContent = 'N/D';
            if (userSectorDirecao) userSectorDirecao.textContent = 'N/D';
        } finally {
            uiService.hideLoading();
        }
    }


    // Initializar modules
    solicitarRetiradaModule.init();
    selecionarItemModule.init();
    reportsModule.init();
    alertasModule.init();
    usuariosModule.init(); 
    setoresModule.init(); 

    // Os links de acesso rápido da direção e a seção de boas-vindas
    // são inicializados no final do DOMContentLoaded para garantir que o HTML esteja pronto.
    bindDirecaoLinks();
    checkAlertsNotification();
    connectAlertsWebSocket();
    reinitializeBootstrapDropdowns();

    // Chama a função de boas-vindas ao carregar o dashboard da Direção, mas apenas UMA VEZ
    // na carga inicial da página. Se o botão "Home" for clicado, ele chamará a função global.
    if (isDirecaoDashboard) {
        window.loadDirecaoWelcomeSection();
    }
});
