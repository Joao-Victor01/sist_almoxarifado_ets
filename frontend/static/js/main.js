// frontend/static/js/main.js

import { retiradasModule } from './retiradasModule.js';
import { solicitarRetiradaModule } from './solicitar-retirada.js';
import { selecionarItemModule } from './selecionar-item-module.js';
import { reportsModule } from './reportsModule.js';
import { alertasModule } from './alertasModule.js';
import { apiService } from './apiService.js';
import { setNewAlertsFlag, getNewAlertsFlag, updateNotificationBellUI, showAlert, setNewWithdrawalRequestsFlag, getUserIdFromToken, formatDateTime } from './utils.js'; // Importar getUserIdFromToken e formatDateTime
// Import uiService
import { uiService } from './uiService.js';
import estadoGlobal from './estadoGlobal.js'; // Importar estadoGlobal para acessar statusMap
import { dataService } from './dataService.js'; // Importar dataService

// NOVO: Importar o módulo do histórico do servidor
import { historicoServidorModule } from './historicoServidorModule.js';

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
    const homeButton = document.getElementById('home-button');
    if (homeButton && mainContent) {
        homeButton.addEventListener('click', e => {
            e.preventDefault();
            mainContent.innerHTML = defaultHTML;
            // ATUALIZADO: Chamar loadDashboardOverview e bindQuickAccessLinks após a inicialização dos módulos
            loadDashboardOverview(); 
            bindQuickAccessLinks(); 
            bindLogoutLink();
            checkAlertsNotification(); // (Manter para a verificação inicial ao carregar a página)
            reinitializeBootstrapDropdowns();
        });
    }

    function bindQuickAccessLinks() {
        // Vincula o clique do card "Solicitar Retirada de Itens"
        document.getElementById('solicitar-retirada-servidor-link')?.addEventListener('click', e => {
            e.preventDefault();
            solicitarRetiradaModule.openModal();
        });

        // Vincula o clique do card "Meu Histórico de Retiradas"
        document.getElementById('historico-retiradas-servidor-link')?.addEventListener('click', e => {
            e.preventDefault();
            historicoServidorModule.renderMinhasRetiradas();
        });

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
            if (typeof window.renderizarListItens === 'function') window.renderizarListItens();
            else console.warn("Função global 'renderizarListItens' não encontrada. Verifique se listar-i");
        });

        document.getElementById('listar-item-link-quick')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof window.renderizarListItens === 'function') window.renderizarListItens();
            else console.warn("Função global 'renderizarListItens' não encontrada.");
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
            if (typeof window.renderizarCategorias === 'function') window.renderizarCategorias();
            else console.warn("Função global 'renderizarCategorias' não encontrada. Verifique se listar-");
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

        // Clique no sino de notificação
        const alertBell = document.getElementById('alert-notification-bell');
        if (alertBell) {
            // O sino agora é um dropdown toggle, seu comportamento é gerido pelo Bootstrap
            // Os itens do dropdown terão seus próprios listeners
        }

        // Determina o comportamento do sino com base na URL do dashboard
        const currentPath = window.location.pathname;
        const isServidorDashboard = currentPath.includes('/dashboardServidor');

        const newWithdrawalRequestsMenuItem = document.getElementById('new-withdrawal-requests-menu-item');
        const newAlertsMenuItem = document.getElementById('new-alerts-menu-item');
        const openAllNotificationsLink = document.getElementById('open-all-notifications-link');

        // Função para fechar o dropdown do sino
        const hideNotificationDropdown = () => {
            bootstrap.Dropdown.getInstance(document.getElementById('alert-notification-bell'))?.hide();
        };

        // Comportamento para "Novos Alertas"
        if (newAlertsMenuItem) {
            newAlertsMenuItem.addEventListener('click', e => {
                e.preventDefault();
                setNewAlertsFlag(false);
                updateNotificationBellUI();
                if (isServidorDashboard) {
                    historicoServidorModule.renderMinhasRetiradas(); // Para servidor
                } else {
                    alertasModule.renderAlertsPage(); // Para almoxarifado/direção
                }
                hideNotificationDropdown();
            });
        }

        // Comportamento para "Novas Solicitações de Retirada"
        if (newWithdrawalRequestsMenuItem) {
            newWithdrawalRequestsMenuItem.addEventListener('click', e => {
                e.preventDefault();
                setNewWithdrawalRequestsFlag(false);
                updateNotificationBellUI();
                if (isServidorDashboard) {
                    historicoServidorModule.renderMinhasRetiradas(); // Para servidor
                } else {
                    retiradasModule.renderPendentesRetiradas(); // Para almoxarifado/direção
                }
                hideNotificationDropdown();
            });
        }

        // Comportamento para "Ver todas as notificações"
        if (openAllNotificationsLink) {
            openAllNotificationsLink.addEventListener('click', e => {
                e.preventDefault();
                setNewAlertsFlag(false);
                setNewWithdrawalRequestsFlag(false);
                updateNotificationBellUI();
                if (isServidorDashboard) {
                    historicoServidorModule.renderMinhasRetiradas(); // Para servidor
                } else {
                    alertasModule.renderAlertsPage(); // Por padrão, leva para a página de alertas para
                }
                hideNotificationDropdown();
            });
        }

        // NOVO: Adiciona listener para o link "Importar Tabela"
        document.getElementById('btn-open-importar-tabela')?.addEventListener('click', e => {
            e.preventDefault();
            try {
                // Adiciona um log para depuração
                console.log('uiService no click do botão', uiService);
                const modalImportarTabela = uiService.getModalInstance('modalImportarTabelaItens');

                // Limpa o formulário e feedback de importação antes de abrir
                document.getElementById('form-importar-tabela-itens').reset();
                document.getElementById('import-feedback').style.display = 'none';
                document.getElementById('import-alert').className = 'alert'; // Reseta a classe
                document.getElementById('import-alert').textContent = '';
                document.getElementById('import-errors-list').innerHTML = '';

                modalImportarTabela.show();
            } catch (error) {
                // Captura qualquer ReferenceError ou outro erro ao acessar uiService
                console.error("Erro ao abrir modal de importação:", error);
                showAlert("Erro ao tentar abrir a tela de importação. Por favor, tente novamente.", "danger");
            }
        });

        // NOVO: Adiciona listener para o botão de enviar tabela
        document.getElementById('btn-enviar-tabela-itens')?.addEventListener('click', async () => {
            const form = document.getElementById('form-importar-tabela-itens');
            const fileInput = document.getElementById('arquivoItens');
            const importFeedback = document.getElementById('import-feedback');
            const importAlert = document.getElementById('import-alert');
            const importErrorsList = document.getElementById('import-errors-list');

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            if (!fileInput.files || fileInput.files.length === 0) {
                showAlert('Por favor, selecione um arquivo para enviar.', 'warning');
                return;
            }

            const file = fileInput.files[0];

            uiService.showLoading();
            importFeedback.style.display = 'block';
            importAlert.className = 'alert'; // Reseta a classe
            importAlert.textContent = '';
            importErrorsList.innerHTML = '';

            try {
                const result = await apiService.uploadBulkItems(file);

                importAlert.classList.add('alert-success');
                importAlert.textContent = `Processamento concluído: ${result.total_items_processed} itens processados.`;

                if (result.errors && result.errors.length > 0) {
                    importAlert.classList.remove('alert-success');
                    importAlert.classList.add('alert-warning');
                    importAlert.textContent += ` Foram encontrados ${result.errors.length} erros.`;
                    result.errors.forEach(error => {
                        const li = document.createElement('li');
                        li.className = 'list-group-item list-group-item-danger';
                        li.textContent = `Linha ${error.row}: ${error.error}`;
                        importErrorsList.appendChild(li);
                    });
                }

                // Re-renderiza a lista de itens após o upload em massa
                if (typeof window.renderizarListItens === 'function') {
                    window.renderizarListItens();
                }

            } catch (error) {
                importAlert.classList.add('alert-danger');
                importAlert.textContent = `Erro ao importar tabela: ${error.message || 'Erro desconhecido.'}`;
                console.error('Erro no upload em massa', error);
            } finally {
                uiService.hideLoading();
            }
        });
    }

    function bindLogoutLink() {
        document.getElementById('logout-link')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof window.logout === 'function') window.logout();
            else console.warn("Função global 'logout' não encontrada. Verifique se logout.js está carreg");
        });
    }

    // Função para verificar alertas e solicitações de retirada (agora chamada inicialmente e via WebSoc
    async function checkAlertsNotification() {
        try {
            const alertsCount = await apiService.getUnviewedAlertsCount();
            // Futuramente, você pode ter um endpoint para contar novas solicitações de retirada
            // Por enquanto, o flag será definido apenas pelo WebSocket

            if (alertsCount > 0) {
                setNewAlertsFlag(true);
            } else {
                setNewAlertsFlag(false);
            }
            // setNewWithdrawalRequestsFlag será chamado pelo WebSocket ao receber a notificação
            updateNotificationBellUI(); // Garante que o sino seja atualizado com base em ambos os flags
        } catch (error) {
            console.error('checkAlertsNotification: Erro ao verificar notificações', error);
            setNewAlertsFlag(false);
            setNewWithdrawalRequestsFlag(false);
        }
    }

    // NOVO: Função para carregar e exibir informações do dashboard do servidor
    async function loadDashboardOverview() {
        uiService.showLoading();
        // Obtenha as referências para os elementos de carregamento/sem solicitações
        const loadingRecentWithdrawals = document.getElementById('loading-recent-withdrawals');
        const noRecentWithdrawals = document.getElementById('no-recent-withdrawals');

        try {
            const userId = getUserIdFromToken();
            if (userId) {
                // 1. Carregar e exibir detalhes do usuário
                const userDetails = await apiService.getCurrentUserDetails(userId);
                document.getElementById('welcome-user-name').textContent = userDetails.name;
                document.getElementById('user-siape').textContent = userDetails.siape || 'N/A';
                document.getElementById('user-sector').textContent = userDetails.sectorName || 'N/A';

                // 2. Carregar e exibir as últimas 3 solicitações de retirada
                // Garanta que os elementos de status estejam visíveis antes de buscar dados
                if (loadingRecentWithdrawals) loadingRecentWithdrawals.style.display = 'block';
                if (noRecentWithdrawals) noRecentWithdrawals.style.display = 'none';

                // ATUALIZADO: Usar dataService para processar as retiradas
                const recentWithdrawalsData = await dataService.getProcessedRetiradas(apiService.fetchUserRetiradasPaginated.bind(apiService), 1, 3);
                
                // ATUALIZADO: Popula estadoGlobal.minhasRetiradas com os itens recentes PROCESSADOS
                estadoGlobal.minhasRetiradas = recentWithdrawalsData.items; 
                renderRecentWithdrawals(recentWithdrawalsData.items);
            } else {
                console.warn("Usuário não logado ou ID de usuário não encontrado para carregar o overview do dashboard.");
                if (loadingRecentWithdrawals) loadingRecentWithdrawals.style.display = 'none';
                if (noRecentWithdrawals) noRecentWithdrawals.style.display = 'block';
            }
        } catch (error) {
            console.error("Erro ao carregar o overview do dashboard do servidor:", error);
            showAlert("Erro ao carregar informações do dashboard. Tente novamente.", "danger");
            if (loadingRecentWithdrawals) loadingRecentWithdrawals.style.display = 'none';
            if (noRecentWithdrawals) {
                noRecentWithdrawals.textContent = "Erro ao carregar solicitações.";
                noRecentWithdrawals.style.display = 'block';
            }
        } finally {
            uiService.hideLoading();
        }
    }

    // NOVO: Função para renderizar as últimas solicitações com barra de progresso
    function renderRecentWithdrawals(withdrawals) {
        const container = document.getElementById('latest-withdrawals-container');
        // Obtenha as referências para os elementos de carregamento/sem solicitações
        const loadingRecentWithdrawals = document.getElementById('loading-recent-withdrawals');
        const noRecentWithdrawals = document.getElementById('no-recent-withdrawals');

        // Esconda os indicadores de carregamento/sem dados antes de popular a lista
        if (loadingRecentWithdrawals) loadingRecentWithdrawals.style.display = 'none';
        if (noRecentWithdrawals) noRecentWithdrawals.style.display = 'none';
        
        container.innerHTML = ''; // Limpa o conteúdo existente

        if (withdrawals.length === 0) {
            if (noRecentWithdrawals) noRecentWithdrawals.style.display = 'block';
            return;
        } 

        withdrawals.forEach(retirada => {
            let progress = 0;
            let progressBarClass = 'bg-secondary';
            let statusText = estadoGlobal.statusMap[retirada.status] || 'Desconhecido';

            switch (retirada.status) {
                case 1: // PENDENTE
                    progress = 25;
                    progressBarClass = 'bg-info';
                    break;
                case 2: // AUTORIZADA
                    progress = 50;
                    progressBarClass = 'bg-primary';
                    break;
                case 3: // CONCLUÍDA
                    progress = 100;
                    progressBarClass = 'bg-success';
                    break;
                case 4: // NEGADA
                    progress = 100; // Ainda mostra 100% mas com cor de erro
                    progressBarClass = 'bg-danger';
                    break;
            }

            const withdrawalHtml = `
                <div class="list-group-item list-group-item-action py-3 px-4 mb-2 rounded-lg shadow-sm recent-withdrawal-item" data-retirada-id="${retirada.retirada_id}">
                    <div class="d-flex w-100 justify-content-between align-items-center">
                        <h6 class="mb-1">Solicitação ID: ${retirada.retirada_id}</h6>
                        <small class="text-muted">${formatDateTime(retirada.data_solicitacao)}</small>
                    </div>
                    <p class="mb-2">Status: <strong>${statusText}</strong></p>
                    <div class="progress" style="height: 10px;">
                        <div class="progress-bar ${progressBarClass}" role="progressbar" style="width: ${progress}%;" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <small class="text-muted mt-2 d-block">
                        ${retirada.justificativa ? `Justificativa: ${retirada.justificativa}` : ''}
                        ${retirada.detalhe_status ? `Detalhe: ${retirada.detalhe_status}` : ''}
                    </small>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', withdrawalHtml);
        });

        // Remove o listener de evento anterior para evitar duplicação
        container.removeEventListener('click', handleRecentWithdrawalItemClick);
        // Adiciona o listener de evento por delegação após a renderização
        container.addEventListener('click', handleRecentWithdrawalItemClick);
    }

    // NOVO: Função para lidar com o clique nos itens de últimas solicitações
    function handleRecentWithdrawalItemClick(e) {
        const clickedItem = e.target.closest('.recent-withdrawal-item');
        if (clickedItem) {
            const retiradaId = parseInt(clickedItem.dataset.retiradaId);
            // Encontra a retirada correspondente no estado global
            const retirada = estadoGlobal.minhasRetiradas.find(r => r.retirada_id === retiradaId);
            
            if (retirada) {
                // ATUALIZADO: Passar isServerView como true para o modal de detalhes do servidor
                uiService.fillModalDetalhes(retirada, true); 
                uiService.getModalInstance('modalVerDetalhesRetirada').show();
            } else {
                // Se a retirada não estiver no estado global, tente buscar via API para garantir
                // que os detalhes sejam carregados mesmo se a lista recente não estiver completa
                uiService.showLoading();
                // ATUALIZADO: Usar dataService para processar a retirada individual também
                apiService.get(`/retiradas/${retiradaId}`)
                    .then(rawRetirada => dataService.getProcessedRetiradas(async () => ({ items: [rawRetirada], total: 1, page: 1, pages: 1 }), 1, 1))
                    .then(processedData => {
                        const fullRetirada = processedData.items[0];
                        // ATUALIZADO: Passar isServerView como true para o modal de detalhes do servidor
                        uiService.fillModalDetalhes(fullRetirada, true); 
                        uiService.getModalInstance('modalVerDetalhesRetirada').show();
                    })
                    .catch(error => {
                        console.error("Erro ao carregar detalhes da solicitação:", error);
                        showAlert('Não foi possível carregar os detalhes da solicitação. Tente novamente.', 'danger');
                    })
                    .finally(() => {
                        uiService.hideLoading();
                    });
            }
        }
    }


    // Chamada inicial de binding
    // ATUALIZADO: Mover bindQuickAccessLinks para depois das inicializações dos módulos
    // bindQuickAccessLinks(); 
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

    // NOVO: Listener para o link "Ver todas as solicitações" na seção de últimas solicitações
    // ATUALIZADO: Mudar para delegação de eventos
    // document.getElementById('view-all-my-withdrawals-link')?.addEventListener('click', e => {
    //     e.preventDefault();
    //     historicoServidorModule.renderMinhasRetiradas();
    // });
    mainContent.addEventListener('click', e => {
        const viewAllLink = e.target.closest('#view-all-my-withdrawals-link');
        if (viewAllLink) {
            e.preventDefault();
            historicoServidorModule.renderMinhasRetiradas();
        }
    });


    // Inicializar os módulos
    solicitarRetiradaModule.init();
    selecionarItemModule.init();
    reportsModule.init();
    alertasModule.init();
    historicoServidorModule.init(); // NOVO: Inicializar o módulo do histórico do servidor

    // ATUALIZADO: Chamar bindQuickAccessLinks após a inicialização dos módulos
    bindQuickAccessLinks();

    // Iniciar a verificação inicial de alertas (ao carregar a página)
    checkAlertsNotification();

    // Conectar ao WebSocket para receber alertas em tempo real
    let ws; // Variável para a instância do WebSocket

    function connectAlertsWebSocket() {
        // Obtém o ID do usuário logado do token JWT
        const userId = getUserIdFromToken();
        console.log("UserID para WebSocket:", userId);

        // Usa wss:// para HTTPS e ws:// para HTTP
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // URL do WebSocket para corresponder ao endpoint do backend, incluindo o user_id
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
                // No DashboardServidor, processar APENAS as atualizações de status das próprias retiradas
                if (message.type === "withdrawal_status_update") {
                    setNewWithdrawalRequestsFlag(true); // Usar o mesmo flag para indicar nova notificação
                    // Usar estadoGlobal.statusMap para converter o status numérico para texto
                    const statusText = estadoGlobal.statusMap[message.status] || 'Desconhecido';
                    showAlert(`Sua solicitação de retirada ID ${message.retirada_id} foi atualizada para: ${statusText}.`, "primary", 5000);
                    try {
                        const audio = new Audio(NOTIFICATION_SOUND_PATH_RETIRADA);
                        audio.play().catch(e => console.error("Erro ao tocar som de notificação de retirada:", e));
                    } catch (e) {
                        console.error("Não foi possível criar objeto de audio para notificação:", e);
                    }
                    // Após receber uma atualização, recarregar as últimas solicitações para atualizar a barra de progresso
                    loadDashboardOverview(); 
                }
                // Ignorar "new_alert" e "new_withdrawal_request" broadcasts neste dashboard
            } else {
                // Nos outros dashboards (Almoxarifado/Direção), processar alertas e novas solicitações gerais
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
                // Ignorar "withdrawal_status_update" neste dashboard, pois é específica do usuário
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

    // Re-inicializa os dropdowns do Bootstrap uma vez que o DOM está pronto e todos os scripts foram ca
    reinitializeBootstrapDropdowns();

    // Carrega os dados do overview do dashboard assim que a página é carregada
    loadDashboardOverview();
});
