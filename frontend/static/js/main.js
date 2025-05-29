// frontend/static/js/main.js

import { retiradasModule } from './retiradasModule.js';
import { solicitarRetiradaModule } from './solicitar-retirada.js';
import { selecionarItemModule } from './selecionar-item-module.js';
import { reportsModule } from './reportsModule.js';
import { alertasModule } from './alertasModule.js'; 
import { apiService } from './apiService.js'; 

// Importar as funções de utilidade para o sino
import { setNewAlertsFlag, getNewAlertsFlag, updateNotificationBellUI, showAlert } from './utils.js'; 

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

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content'); 
    const defaultHTML = mainContent ? mainContent.innerHTML : ''; 
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
            const modalitem = new bootstrap.Modal(modalCadastrarItemEl); 
            document.querySelectorAll('#btn-open-cadastrar-item').forEach(btn => { 
                btn.onclick = e => { 
                    e.preventDefault(); 
                    modalitem.show(); 
                }; 
            }); 
        } 

        document.getElementById('listar-item-link')?.addEventListener('click', e => { 
            e.preventDefault(); 
            if (typeof renderizarListaltens === 'function') renderizarListaltens(); 
            else console.warn("Função global 'renderizarListaltens' não encontrada. Verifique se listar-itens.js está carregado."); 
        }); 

        document.getElementById('listar-item-link-quick')?.addEventListener('click', e => { 
            e.preventDefault(); 
            if (typeof renderizarListaltens === 'function') renderizarListaltens(); 
            else console.warn("Função global 'renderizarListaltens' não encontrada."); 
        }); 

        const modalCadastrarCategoriaEl = document.getElementById('modalCadastrarCategoria'); 
        if (modalCadastrarCategoriaEl) { 
            const modalcat = new bootstrap.Modal(modalCadastrarCategoriaEl); 
            document.getElementById('btn-open-cadastrar-categoria')?.addEventListener('click', e => { 
                e.preventDefault(); 
                modalcat.show(); 
            }); 
        } 

        document.getElementById('listar-categoria-link')?.addEventListener('click', e => { 
            e.preventDefault(); 
            if (typeof renderizarCategorias === 'function') renderizarCategorias(); 
            else console.warn("Função global renderizarCategorias não encontrada. Verifique se listar-categorias.js está carregado."); 
        }); 

        document.getElementById('listar-categoria-link-quick')?.addEventListener('click', e => { 
            e.preventDefault(); 
            if (typeof renderizarCategorias === 'function') renderizarCategorias(); 
            else console.warn("Função global 'renderizar Categorias não encontrada."); 
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

        // Alertas: Chamar renderAlertsPage()
        document.getElementById('open-alertas-modal')?.addEventListener('click', e => { 
            e.preventDefault(); 
            alertasModule.renderAlertsPage(); 
        }); 

        // Clique no sino de notificação
        const alertBell = document.getElementById('alert-notification-bell'); 
        if (alertBell) { 
            alertBell.addEventListener('click', async (e) => { 
                e.preventDefault(); 
                setNewAlertsFlag(false); // Limpa o flag imediatamente ao clicar
                updateNotificationBellUI(); // Atualiza a UI do sino para remover a animação
                await apiService.markAllAlertsAsViewed(); // Marca todos como visualizados no backend
                alertasModule.renderAlertsPage(); // Re-renderiza a página de alertas
            }); 
        } 
    }

    function bindLogoutLink() {
        document.getElementById('logout-link')?.addEventListener('click', e => { 
            e.preventDefault(); 
            if (typeof logout === 'function') logout(); 
            else console.warn("Função global 'logout' não encontrada. Verifique se logout.js está carregado."); 
        }); 
    } 

    // Função para verificar alertas (agora chamada inicialmente e via WebSocket)
    async function checkAlertsNotification() { 
        try {
            const count = await apiService.getUnviewedAlertsCount(); 
            if (count > 0) { 
                setNewAlertsFlag(true); 
            } else { 
                setNewAlertsFlag(false); 
            }
        } catch (error) { 
            console.error('checkAlertsNotification: Erro ao verificar alertas para notificação:', error); 
            setNewAlertsFlag(false); 
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
        //  URL do WebSocket para corresponder ao endpoint do backend
        const wsUrl = `${protocol}//${window.location.host}/api/almoxarifado/ws/alerts`;

        ws = new WebSocket(wsUrl);

        ws.onopen = (event) => {
            console.log("WebSocket para alertas conectado:", event);
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("Mensagem WebSocket recebida:", message);
            if (message.type === "new_alert") {
                // Um novo alerta foi gerado no backend, atualiza a UI
                setNewAlertsFlag(true); // Define o flag de novos alertas
                updateNotificationBellUI(); // Atualiza a UI do sino imediatamente
                showAlert("Novo alerta: " + message.message, "info", 5000); // Exibe uma notificação toast
 
            }
        };

        ws.onclose = (event) => {
            console.warn("WebSocket para alertas desconectado:", event.code, event.reason);
            // Tenta reconectar após um atraso, a menos que seja um fechamento intencional
            setTimeout(connectAlertsWebSocket, 5000); // Tenta reconectar a cada 5 segundos
        };

        ws.onerror = (error) => {
            console.error("Erro no WebSocket para alertas:", error);
            // Fecha a conexão para disparar o onclose e tentar reconectar
            ws.close();
        };
    }

    // Chama a função para conectar ao WebSocket quando o DOM estiver pronto
    connectAlertsWebSocket();


    // Re-inicializa os dropdowns do Bootstrap uma vez que o DOM está pronto e todos os scripts foram carregados
    reinitializeBootstrapDropdowns(); //
});