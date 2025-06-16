// frontend/static/js/main_direcao.js

import { historicoDirecaoModule } from './historicoDirecaoModule.js';
import { solicitarRetiradaModule } from './solicitar-retirada.js';
import { selecionarItemModule } from './selecionar-item-module.js';
import { reportsModule } from './reportsModule.js';
import { alertasModule } from './alertasModule.js';
import { apiService } from './apiService.js';
import { setNewAlertsFlag, updateNotificationBellUI, showAlert, setNewWithdrawalRequestsFlag, getUserIdFromToken } from './utils.js';
import { usuariosModule } from './usuariosModule.js';

const NOTIFICATION_SOUND_PATH = '/static/audio/notificacao01.mp3';

// Função auxiliar para re-inicializar dropdowns do Bootstrap
export function reinitializeBootstrapDropdowns() {
    const dropdownToggleList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
    dropdownToggleList.map(function (dropdownToggleEl) {
        const dropdownInstance = bootstrap.Dropdown.getInstance(dropdownToggleEl);
        if (dropdownInstance) {
            dropdownInstance.dispose(); // Descarta instâncias antigas para evitar duplicação
        }
        return new bootstrap.Dropdown(dropdownToggleEl);
    });
    console.log('Dropdowns do Bootstrap re-inicializados.'); // Log de depuração
}

const mainContent = document.getElementById('main-content');
let defaultHTML = mainContent ? mainContent.innerHTML : ''; // Armazena o conteúdo inicial

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded em main_direcao.js. Iniciando módulos e bindings.'); // Log de depuração

    const currentPath = window.location.pathname;
    const isDirecaoDashboard = currentPath.includes('/dashboardDirecao');

    const homeButton = document.getElementById('home-button');
    if (homeButton && mainContent) {
        homeButton.addEventListener('click', e => {
            e.preventDefault();
            console.log('Clique no botão Home detectado.'); // Log de depuração
            mainContent.innerHTML = defaultHTML;
            // Rebind all links and reinitialize Bootstrap dropdowns after restoring default HTML
            bindDirecaoLinks();
            bindLogoutLink();
            checkAlertsNotification();
            reinitializeBootstrapDropdowns();
        });
    }

    // Inicialização dos módulos
    solicitarRetiradaModule.init();
    selecionarItemModule.init();
    reportsModule.init();
    alertasModule.init();
    usuariosModule.init(); // Certifique-se de que o módulo de usuários é inicializado

    // Vincula os listeners de links após todos os módulos estarem inicializados
    bindDirecaoLinks(); // Chamada inicial para vincular eventos
    bindLogoutLink();
    checkAlertsNotification();
    reinitializeBootstrapDropdowns(); // Re-inicializa Bootstrap dropdowns

    connectAlertsWebSocket(); // Conecta o WebSocket para alertas
});

function bindDirecaoLinks() {
    console.log('bindDirecaoLinks() chamado. Preparando delegação de eventos.'); // Log de depuração

    // Usando delegação de eventos para os links do dropdown de usuários e outros
    document.body.addEventListener('click', e => {
        // Log para cada clique no corpo, para depuração
        // console.log('Clique no body detectado. Target:', e.target);

        // Captura de clique para "Cadastrar Usuário"
        const cadastrarUsuarioLink = e.target.closest('#btn-open-cadastrar-usuario');
        if (cadastrarUsuarioLink) {
            e.preventDefault();
            console.log('Clique em "Cadastrar Usuário" detectado via delegação.'); // Log de depuração
            if (usuariosModule.modalCadastrarUsuario) {
                usuariosModule.formCadastrarUsuario.reset(); // Limpa o formulário antes de abrir
                // populateSetoresInForm será chamado no 'shown.bs.modal' listener do modal
                usuariosModule.modalCadastrarUsuario.show();
                console.log('Modal de cadastro de usuário deveria ter sido exibido.'); // Log de depuração
            } else {
                console.error('Erro: Instância do modalCadastrarUsuario não encontrada.');
                showAlert('Erro interno: Modal de cadastro de usuário não inicializado.', 'danger');
            }
            return; // Importante para evitar que outros listeners capturem o mesmo clique
        }

        // Captura de clique para "Listar Usuários"
        const listarUsuariosLink = e.target.closest('#listar-usuarios-link');
        if (listarUsuariosLink) {
            e.preventDefault();
            console.log('Clique em "Listar Usuários" detectado via delegação.'); // Log de depuração
            usuariosModule.renderUsuariosList();
            console.log('Função renderUsuariosList() de usuariosModule chamada.'); // Log de depuração
            return;
        }

        // Outros links (manter os listeners diretos ou converter para delegação conforme necessário)

        // Itens (read-only)
        const listarItemLink = e.target.closest('#listar-item-link');
        if (listarItemLink) {
            e.preventDefault();
            console.log('Clique em "Listar Itens" detectado (Direção - somente leitura).'); // Log de depuração
            if (typeof window.renderizarListItens === 'function') {
                window.renderizarListItens(true); // true para modo somente leitura
            } else {
                console.warn("Função global 'renderizarListItens' não encontrada.");
            }
            return;
        }

        // Retiradas - Solicitar Retirada
        const solicitarRetiradaLink = e.target.closest('#btn-open-solicitar-retirada');
        if (solicitarRetiradaLink) {
            e.preventDefault();
            console.log('Clique em "Solicitar Retirada" detectado.'); // Log de depuração
            solicitarRetiradaModule.openModal(false); // Sempre false para este link (não é dashboard do servidor)
            return;
        }

        // Retiradas - Histórico de Retiradas
        const historicoRetiradasLink = e.target.closest('#listar-retiradas-link');
        if (historicoRetiradasLink) {
            e.preventDefault();
            console.log('Clique em "Histórico de Retiradas" detectado.'); // Log de depuração
            historicoDirecaoModule.renderRetiradasDirecao();
            return;
        }

        // Retiradas - Solicitações Pendentes
        const retiradasPendentesLink = e.target.closest('#listar-retiradas-pendentes-link');
        if (retiradasPendentesLink) {
            e.preventDefault();
            console.log('Clique em "Solicitações Pendentes" detectado.'); // Log de depuração
            historicoDirecaoModule.renderPendentesRetiradas();
            return;
        }

        // Relatórios
        const reportsDashboardLink = e.target.closest('#open-reports-dashboard');
        if (reportsDashboardLink) {
            // Note: Este link já tem data-bs-toggle="modal", então o Bootstrap já deve abri-lo.
            // O preventDefault() aqui pode interferir com o Bootstrap.
            // Se o modal não abrir, remova o e.preventDefault() para este link específico.
            // e.preventDefault(); 
            console.log('Clique em "Relatórios" detectado.'); // Log de depuração
            // A abertura do modalReportsDashboard já é manipulada pelo Bootstrap via data-bs-target
            // reportsModule.modalReportsDashboard.show(); // Desnecessário se data-bs-toggle está ativo
            return;
        }

        // Alertas
        const alertasModalLink = e.target.closest('#open-alertas-modal');
        if (alertasModalLink) {
            e.preventDefault();
            console.log('Clique em "Histórico de Alertas" detectado.'); // Log de depuração
            alertasModule.renderAlertsPage();
            return;
        }

        // Event listeners for notification dropdown items
        const newAlertsMenuItem = e.target.closest('#new-alerts-menu-item');
        if (newAlertsMenuItem) {
            e.preventDefault();
            console.log('Clique em "Novos Alertas" detectado.'); // Log de depuração
            setNewAlertsFlag(false);
            updateNotificationBellUI();
            alertasModule.renderAlertsPage();
            bootstrap.Dropdown.getInstance(document.getElementById('alert-notification-bell'))?.hide();
            return;
        }

        const openAllNotificationsLink = e.target.closest('#open-all-notifications-link');
        if (openAllNotificationsLink) {
            e.preventDefault();
            console.log('Clique em "Ver todas as notificações" detectado.'); // Log de depuração
            setNewAlertsFlag(false);
            setNewWithdrawalRequestsFlag(false); // Garante que a flag de retirada também seja limpa
            updateNotificationBellUI();
            alertasModule.renderAlertsPage(); // Direção visualiza alertas
            bootstrap.Dropdown.getInstance(document.getElementById('alert-notification-bell'))?.hide();
            return;
        }
    });
}

function bindLogoutLink() {
    console.log('bindLogoutLink() chamado.'); // Log de depuração
    document.getElementById('logout-link')?.addEventListener('click', e => {
        e.preventDefault();
        console.log('Clique em "Sair" detectado.'); // Log de depuração
        if (typeof window.logout === 'function') window.logout();
        else console.warn("Função global 'logout' não encontrada.");
    });
}

async function checkAlertsNotification() {
    console.log('checkAlertsNotification() chamado.'); // Log de depuração
    // Explicitly ensure withdrawal requests flag is false for Direção dashboard
    setNewWithdrawalRequestsFlag(false);

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
    }
}

let ws;
function connectAlertsWebSocket() {
    console.log('connectAlertsWebSocket() chamado.'); // Log de depuração
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

        if (message.type === "new_alert") {
            setNewAlertsFlag(true);
            showAlert("Novo alerta:" + message.message, "info", 5000);
            try {
                const audio = new Audio(NOTIFICATION_SOUND_PATH);
                audio.play().catch(e => console.error("Erro ao tocar som de notificação:", e));
            } catch (e) {
                console.error("Não foi possível criar objeto de áudio para notificação:", e);
            }
        }
        // Bloco 'new_withdrawal_request' não processado para a Direção

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
