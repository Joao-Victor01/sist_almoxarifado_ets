// frontend/static/js/main.js

import { retiradasModule } from './retiradasModule.js';
import { solicitarRetiradaModule } from './solicitar-retirada.js';
import { selecionarItemModule } from './selecionar-item-module.js';
import { reportsModule } from './reportsModule.js';
import { alertasModule } from './alertasModule.js';
import { apiService } from './apiService.js';
import { setNewAlertsFlag, getNewAlertsFlag, updateNotificationBellUI, showAlert, setNewWithdrawalRequestsFlag, getNewWithdrawalRequestsFlag } from './utils.js';

const NOTIFICATION_SOUND_PATH = '/static/audio/notificacao01.mp3';
const NOTIFICATION_SOUND_PATH_RETIRADA = '/static/audio/notificacao02.mp3';


// Função auxiliar para re-inicializar dropdowns do Bootstrap
export function reinitializeBootstrapDropdowns() {
    const dropdownToggleList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
    dropdownToggleList.map(function (dropdownToggleEl) {
        const dropdownInstance = bootstrap.Dropdown.getInstance(dropdownToggleEl);
        if (!dropdownInstance) {
            return new bootstrap.Dropdown(dropdownToggleEl);
        }
        return dropdownInstance;
    });
}

const mainContent = document.getElementById('main-content');
let defaultHTML = mainContent ? mainContent.innerHTML : ''; // Store initial content

document.addEventListener('DOMContentLoaded', () => {
    const homeButton = document.getElementById('home-button');

    if (homeButton && mainContent) {
        homeButton.addEventListener('click', e => {
            e.preventDefault();
            mainContent.innerHTML = defaultHTML;
            bindQuickAccessLinks();
            bindLogoutLink();
            checkAlertsNotification(); // (Manter para a verificação inicial ao carregar a página)
            reinitializeBootstrapDropdowns();
        });
    }

    function bindQuickAccessLinks() {
        const modalCadastrarItemEl = document.getElementById('modalCadastrarItem');
        if (modalCadastrarItemEl) {
            const modalItem = new bootstrap.Modal(modalCadastrarItemEl);
            document.querySelectorAll('#btn-open-cadastrar-item').forEach(btn => {
                btn.onclick = e => {
                    e.preventDefault();
                    modalItem.show();
                };
            });
        }

        document.getElementById('listar-item-link')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof window.renderizarListaltens === 'function') window.renderizarListaltens();
            else console.warn("Função global 'renderizarListaltens' não encontrada. Verifique se listar-itens.js está carregado.");
        });

        document.getElementById('listar-item-link-quick')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof window.renderizarListaltens === 'function') window.renderizarListaltens();
            else console.warn("Função global 'renderizarListaltens' não encontrada.");
        });

        const modalCadastrarCategoriaEl = document.getElementById('modalCadastrarCategoria');
        if (modalCadastrarCategoriaEl) {
            const modalCat = new bootstrap.Modal(modalCadastrarCategoriaEl);
            document.getElementById('btn-open-cadastrar-categoria')?.addEventListener('click', e => {
                e.preventDefault();
                modalCat.show();
            });
        }

        document.getElementById('listar-categoria-link')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof window.renderizarCategorias === 'function') window.renderizarCategorias();
            else console.warn("Função global renderizarCategorias não encontrada. Verifique se listar-categorias.js está carregado.");
        });

        document.getElementById('listar-categoria-link-quick')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof window.renderizarCategorias === 'function') window.renderizarCategorias();
            else console.warn("Função global 'renderizarCategorias' não encontrada.");
        });

        document.getElementById('listar-retiradas-pendentes-quick')?.addEventListener('click', e => {
            e.preventDefault();
            retiradasModule.renderPendentesRetiradas();
        });

        // Modal de relatórios
        document.getElementById('open-reports-dashboard')?.addEventListener('click', e => {
            e.preventDefault();
            reportsModule.modalReportsDashboard.show();
        });

        // NOVO: Listener para o link "Listar Alertas" do menu de navegação principal
        document.getElementById('open-alertas-modal')?.addEventListener('click', e => {
            e.preventDefault();
            alertasModule.renderAlertsPage();
        });

        // Clique no sino de notificação - AGORA ABRE UM DROPDOWN
        const alertBell = document.getElementById('alert-notification-bell');
        if (alertBell) {
            // O sino agora é um dropdown toggle, seu comportamento é gerido pelo Bootstrap
            // Os itens do dropdown terão seus próprios listeners
        }

        // NOVO: Listeners para os itens do dropdown de notificação
        document.getElementById('new-alerts-menu-item')?.addEventListener('click', e => {
            e.preventDefault();
            setNewAlertsFlag(false); // Limpa o flag de alertas
            updateNotificationBellUI(); // Atualiza a UI do sino
            alertasModule.renderAlertsPage(); // Redireciona para a página de alertas
            bootstrap.Dropdown.getInstance(document.getElementById('alert-notification-bell'))?.hide(); // Fecha o dropdown
        });

        document.getElementById('new-withdrawal-requests-menu-item')?.addEventListener('click', e => {
            e.preventDefault();
            setNewWithdrawalRequestsFlag(false); // Limpa o flag de solicitações de retirada
            updateNotificationBellUI(); // Atualiza a UI do sino
            retiradasModule.renderPendentesRetiradas(); // Redireciona para a página de retiradas pendentes
            bootstrap.Dropdown.getInstance(document.getElementById('alert-notification-bell'))?.hide(); // Fecha o dropdown
        });

        // NOVO: Listener para o link "Ver todas as notificações"
        document.getElementById('open-all-notifications-link')?.addEventListener('click', e => {
            e.preventDefault();
            // Limpa ambos os flags ao clicar em "Ver todas"
            setNewAlertsFlag(false);
            setNewWithdrawalRequestsFlag(false);
            updateNotificationBellUI();
            alertasModule.renderAlertsPage(); // Por padrão, leva para a página de alertas
            bootstrap.Dropdown.getInstance(document.getElementById('alert-notification-bell'))?.hide(); // Fecha o dropdown
        });
    }

    function bindLogoutLink() {
        document.getElementById('logout-link')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof window.logout === 'function') window.logout();
            else console.warn("Função global 'logout' não encontrada. Verifique se logout.js está carregado.");
        });
    }

    // Função para verificar alertas e solicitações de retirada (agora chamada inicialmente e via WebSocket)
    async function checkAlertsNotification() {
        try {
            const alertsCount = await apiService.getUnviewedAlertsCount();
            // Futuramente, você pode ter um endpoint para contar novas solicitações de retirada
            // Por enquanto, o flag será definido apenas pelo WebSocket
            // const withdrawalRequestsCount = await apiService.getUnviewedWithdrawalRequestsCount();

            if (alertsCount > 0) {
                setNewAlertsFlag(true);
            } else {
                setNewAlertsFlag(false);
            }
            // O setNewWithdrawalRequestsFlag será chamado pelo WebSocket ao receber a notificação
            updateNotificationBellUI(); // Garante que a UI do sino seja atualizada com base em ambos os flags
        } catch (error) {
            console.error('checkAlertsNotification: Erro ao verificar notificações:', error);
            setNewAlertsFlag(false);
            setNewWithdrawalRequestsFlag(false);
        }
    }

    // Chamada inicial de binding
    bindQuickAccessLinks();
    bindLogoutLink();

    // Lógica de Retiradas (modular) listeners que estão fora do main-content
    document.getElementById('listar-retiradas-link')?.addEventListener('click', e => {
        e.preventDefault();
        retiradasModule.renderHistoricoRetiradas();
    });

    document.getElementById('listar-retiradas-pendentes-link')?.addEventListener('click', e => {
        e.preventDefault();
        retiradasModule.renderPendentesRetiradas();
    });

    const btnConfirmarAutorizar = document.getElementById('btn-confirmar-autorizar-retirada');
    if (btnConfirmarAutorizar) {
        btnConfirmarAutorizar.addEventListener('click', retiradasModule._handleAuthorizeDeny.bind(retiradasModule, 'AUTORIZADA'));
    }

    const btnConfirmarNegar = document.getElementById('btn-confirmar-negar-retirada');
    if (btnConfirmarNegar) {
        btnConfirmarNegar.addEventListener('click', retiradasModule._handleAuthorizeDeny.bind(retiradasModule, 'NEGADA'));
    }

    // Inicializar os módulos
    solicitarRetiradaModule.init();
    selecionarItemModule.init();
    reportsModule.init();
    alertasModule.init();

    // Iniciar a verificação inicial de alertas (ao carregar a página)
    checkAlertsNotification();

    // Conectar ao WebSocket para receber alertas em tempo real
    let ws; // Variável para a instância do WebSocket

    function connectAlertsWebSocket() {
        // Usa wss:// para HTTPS e ws:// para HTTP
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // URL do WebSocket para corresponder ao endpoint do backend
        const wsUrl = `${protocol}//${window.location.host}/api/almoxarifado/ws/alerts`;

        ws = new WebSocket(wsUrl);

        ws.onopen = (event) => {
            console.log("WebSocket para notificações conectado:", event);
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("Mensagem WebSocket recebida:", message);

            if (message.type === "new_alert") {
                setNewAlertsFlag(true);
                showAlert("Novo alerta: " + message.message, "info", 5000);
                // Tocar o som de notificação
                try {
                    const audio = new Audio(NOTIFICATION_SOUND_PATH);
                    audio.play().catch(e => console.error("Erro ao tocar som de notificação:", e));
                } catch (e) {
                    console.error("Não foi possível criar objeto de áudio para notificação:", e);
                }
            } else if (message.type === "new_withdrawal_request") {
                setNewWithdrawalRequestsFlag(true);
                showAlert("Nova solicitação de retirada: " + message.message, "primary", 5000);
                // Tocar o som de notificação 
                try {
                    const audio = new Audio(NOTIFICATION_SOUND_PATH_RETIRADA);
                    audio.play().catch(e => console.error("Erro ao tocar som de notificação:", e));
                } catch (e) {
                    console.error("Não foi possível criar objeto de áudio para notificação:", e);
                }
            }
            updateNotificationBellUI(); // Garante que o sino seja atualizado
        };

        ws.onclose = (event) => {
            console.warn("WebSocket para notificações desconectado:", event.code, event.reason);
            setTimeout(connectAlertsWebSocket, 5000); // Tenta reconectar a cada 5 segundos
        };

        ws.onerror = (error) => {
            console.error("Erro no WebSocket para notificações:", error);
            ws.close();
        };
    }

    // Chama a função para conectar ao WebSocket quando o DOM estiver pronto
    connectAlertsWebSocket();

    // Re-inicializa os dropdowns do Bootstrap uma vez que o DOM está pronto e todos os scripts foram carregados
    reinitializeBootstrapDropdowns();
});
