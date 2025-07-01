// frontend/static/js/main.js

import { retiradasModule } from './retiradasModule.js';
import { solicitarRetiradaModule } from './solicitar-retirada.js';
import { selecionarItemModule } from './selecionar-item-module.js';
import { reportsModule } from './reportsModule.js';
import { alertasModule } from './alertasModule.js';
import { apiService } from './apiService.js';
import { setNewAlertsFlag,  updateNotificationBellUI, showAlert, setNewWithdrawalRequestsFlag, getUserIdFromToken, formatDateTime } from './utils.js'; 
import estadoGlobal from './estadoGlobal.js'; 
import { dataService } from './dataService.js'; 
import { historicoServidorModule } from './historicoServidorModule.js';
import { usuariosModule } from './usuariosModule.js';
import { uiService } from './uiService.js';

const NOTIFICATION_SOUND_PATH = '/static/audio/notificacao01.mp3';
const NOTIFICATION_SOUND_PATH_RETIRADA = '/static/audio/notificacao02.mp3';

// Função auxiliar para re-inicializar dropdowns do Bootstrap
export function reinitializeBootstrapDropdowns() {
    const dropdownToggleList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
    dropdownToggleList.map(function (dropdownToggleEl) {
        const dropdownInstance = bootstrap.Dropdown.getInstance(dropdownToggleEl);
        if (dropdownInstance) {
            return dropdownInstance;
        }
        return new bootstrap.Dropdown(dropdownToggleEl);
    });
}

const mainContent = document.getElementById('main-content');
let defaultHTML = mainContent ? mainContent.innerHTML : ''; // Armazena o conteúdo inicial

document.addEventListener('DOMContentLoaded', () => {
    // Determine the dashboard type once on DOMContentLoaded
    const currentPath = window.location.pathname;
    const isServidorDashboard = currentPath.includes('/dashboardServidor');
    const isAlmoxarifadoDashboard = currentPath.includes('/dashboardAlmoxarifado'); // Adicionado para Almoxarifado

    const homeButton = document.getElementById('home-button');
    if (homeButton && mainContent) {
        homeButton.addEventListener('click', e => {
            e.preventDefault();
            mainContent.innerHTML = defaultHTML;
            // Chamar a função de overview correta se for o dashboard
            if (isServidorDashboard) {
                window.loadDashboardOverview();
            } else if (isAlmoxarifadoDashboard) { // Adicionado para Almoxarifado
                loadAlmoxarifadoWelcomeSection();
            }
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
            solicitarRetiradaModule.openModal(isServidorDashboard); // Passa a flag isServidorDashboard
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
            else console.warn("Função global 'renderizarListItens' não encontrada. Verifique se listar-itens.js está carregado.");
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
            else console.warn("Função global 'renderizarCategorias' não encontrada. Verifique se listar-categorias.js está carregado.");
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

        // Listener para o link "Listar Alertas" do menu de navegação principal
        document.getElementById('open-alertas-modal')?.addEventListener('click', e => {
            e.preventDefault();
            alertasModule.renderAlertsPage();
        });

        // Clique no sino de notificação

        //Editar perfil próprio
        document.getElementById('edit-profile-link')?.addEventListener('click', async e => {
            e.preventDefault();
            await usuariosModule.openEditProfileModal();
        });

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
                    historicoServidorModule.renderMinhasRetiradas();
                } else {
                    alertasModule.renderAlertsPage();
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
                    historicoServidorModule.renderMinhasRetiradas();
                } else {
                    retiradasModule.renderPendentesRetiradas();
                }
                hideNotificationDropdown();
            });
        }

        // Adiciona listener para o link "Importar Tabela"
        document.getElementById('btn-open-importar-tabela')?.addEventListener('click', e => {
            e.preventDefault();
            try {
                console.log('uiService no click do botão', uiService);
                const modalImportarTabela = uiService.getModalInstance('modalImportarTabelaltens');

                document.getElementById('form-importar-tabela-itens').reset();
                document.getElementById('import-feedback').style.display = 'none';
                document.getElementById('import-alert').className = 'alert';
                document.getElementById('import-alert').textContent = '';
                document.getElementById('import-errors-list').innerHTML = '';

                modalImportarTabela.show();
            } catch (error) {
                console.error("Erro ao abrir modal de importação:", error);
                showAlert("Erro ao tentar abrir a tela de importação. Por favor, tente novamente.", "danger");
            }
        });

        // NOVO: Adiciona listener para o botão de enviar tabela
        document.getElementById('btn-enviar-tabela-itens')?.addEventListener('click', async () => {
            const form = document.getElementById('form-importar-tabela-itens');
            const fileInput = document.getElementById('arquivoltens');
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
            importAlert.className = 'alert';
            importAlert.textContent = '';
            importErrorsList.innerHTML = '';

            try {
                const result = await apiService.uploadBulkItems(file);

                importAlert.classList.add('alert-success');
                importAlert.textContent = `Processamento concluído: ${result.total_items_processed} itens processados. Clique em 'cancelar' para sair.`;

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

        // Handler para o link "Solicitar Retirada" no menu de navegação (para Almoxarifado/Direcao)
        document.getElementById('btn-open-solicitar-retirada')?.addEventListener('click', e => {
            e.preventDefault();
            solicitarRetiradaModule.openModal(false); // Sempre false para este link (não é dashboard do servidor)
        });
    }

    function bindLogoutLink() {
        document.getElementById('logout-link')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof window.logout === 'function') window.logout();
            else console.warn("Função global 'logout' não encontrada. Verifique se logout.js está carregado.");
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

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/almoxarifado/ws/alerts${userId ? `?user_id=${userId}` : ''}`;

        ws = new WebSocket(wsUrl);


        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("Mensagem WebSocket recebida", message);

            const isServidorDashboard = window.location.pathname.includes('/dashboardServidor');

            if (isServidorDashboard) {
                if (message.type === "withdrawal_status_update") {
                    setNewWithdrawalRequestsFlag(true);
                    const statusText = estadoGlobal.statusMap[message.status] || 'Desconhecido';
                    showAlert(`Sua solicitação de retirada ID ${message.retirada_id} foi atualizada para: ${statusText}.`, "primary", 5000);
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

    connectAlertsWebSocket();
    reinitializeBootstrapDropdowns();

    // Exportar loadDashboardOverview para ser acessível globalmente (Servidor)
    window.loadDashboardOverview = async function() {
        uiService.showLoading();
        const loadingRecentWithdrawals = document.getElementById('loading-recent-withdrawals');
        const noRecentWithdrawals = document.getElementById('no-recent-withdrawals');

        try {
            const userId = getUserIdFromToken();
            if (userId) {
                const welcomeUserName = document.getElementById('welcome-user-name');
                const userSiape = document.getElementById('user-siape');
                const userSector = document.getElementById('user-sector');

                if (welcomeUserName && userSiape && userSector) {
                    const userDetails = await apiService.getCurrentUserDetails(userId);
                    welcomeUserName.textContent = userDetails.name;
                    userSiape.textContent = userDetails.siape || 'N/D';
                    userSector.textContent = userDetails.sectorName || 'N/D';
                } else {
                    console.warn("Elementos de detalhes do usuário não encontrados no DOM. Ignorando atualização.");
                }

                if (loadingRecentWithdrawals) loadingRecentWithdrawals.style.display = 'block';
                if (noRecentWithdrawals) noRecentWithdrawals.style.display = 'none';

                const recentWithdrawalsData = await dataService.getProcessedRetiradas(apiService.fetchUserRetiradasPaginated.bind(apiService), 1, 3);
                
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

    // Função para carregar e exibir as informações do usuário no dashboard do Almoxarifado
    async function loadAlmoxarifadoWelcomeSection() {
        uiService.showLoading();
        const welcomeUserNameAlmoxarifado = document.getElementById('welcome-user-name-almoxarifado');
        const userSiapeAlmoxarifado = document.getElementById('user-siape-almoxarifado');
        const userSectorAlmoxarifado = document.getElementById('user-sector-almoxarifado');

        try {
            const userId = getUserIdFromToken();
            if (userId) {
                if (welcomeUserNameAlmoxarifado && userSiapeAlmoxarifado && userSectorAlmoxarifado) {
                    const userDetails = await apiService.getCurrentUserDetails(userId);
                    welcomeUserNameAlmoxarifado.textContent = userDetails.name || 'Usuário';
                    userSiapeAlmoxarifado.textContent = userDetails.siape || 'N/D';
                    userSectorAlmoxarifado.textContent = userDetails.sectorName || 'N/D';
                } else {
                    console.warn("Elementos de detalhes do usuário para Almoxarifado não encontrados no DOM. Ignorando atualização.");
                }
            } else {
                console.warn("Usuário não logado ou ID de usuário não encontrado para carregar o overview do almoxarifado.");
                if (welcomeUserNameAlmoxarifado) welcomeUserNameAlmoxarifado.textContent = 'Usuário';
                if (userSiapeAlmoxarifado) userSiapeAlmoxarifado.textContent = 'N/D';
                if (userSectorAlmoxarifado) userSectorAlmoxarifado.textContent = 'N/D';
            }
        } catch (error) {
            console.error("Erro ao carregar o overview do dashboard do almoxarifado:", error);
            showAlert("Erro ao carregar informações do dashboard do almoxarifado. Tente novamente.", "danger");
            if (welcomeUserNameAlmoxarifado) welcomeUserNameAlmoxarifado.textContent = 'Erro';
            if (userSiapeAlmoxarifado) userSiapeAlmoxarifado.textContent = 'N/D';
            if (userSectorAlmoxarifado) userSectorAlmoxarifado.textContent = 'N/D';
        } finally {
            uiService.hideLoading();
        }
    }


    function renderRecentWithdrawals(withdrawals) {
        const container = document.getElementById('latest-withdrawals-container');
        if (!container) {
            console.warn("Elemento 'latest-withdrawals-container' não encontrado. Não é um dashboard de servidor.");
            return;
        }

        const loadingRecentWithdrawals = document.getElementById('loading-recent-withdrawals');
        const noRecentWithdrawals = document.getElementById('no-recent-withdrawals');

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
                case 1:
                    progress = 25;
                    progressBarClass = 'bg-info';
                    break;
                case 2:
                    progress = 50;
                    progressBarClass = 'bg-primary';
                    break;
                case 3:
                    progress = 100;
                    progressBarClass = 'bg-success';
                    break;
                case 4:
                    progress = 100;
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

        container.removeEventListener('click', handleRecentWithdrawalItemClick);
        container.addEventListener('click', handleRecentWithdrawalItemClick);
    }

    function handleRecentWithdrawalItemClick(e) {
        const clickedItem = e.target.closest('.recent-withdrawal-item');
        if (clickedItem) {
            const retiradaId = parseInt(clickedItem.dataset.retiradaId);
            const retirada = estadoGlobal.minhasRetiradas.find(r => r.retirada_id === retiradaId);
            
            if (retirada) {
                uiService.fillModalDetalhes(retirada, true); 
                uiService.getModalInstance('modalVerDetalhesRetirada').show();
            } else {
                uiService.showLoading();
                apiService.get(`/retiradas/${retiradaId}`)
                    .then(rawRetirada => dataService.getProcessedRetiradas(async () => ({ items: [rawRetirada], total: 1, page: 1, pages: 1 }), 1, 1))
                    .then(processedData => {
                        const fullRetirada = processedData.items[0];
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


    bindLogoutLink();

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

    mainContent.addEventListener('click', e => {
        const viewAllLink = e.target.closest('#view-all-my-withdrawals-link');
        if (viewAllLink) {
            e.preventDefault();
            historicoServidorModule.renderMinhasRetiradas();
        }
    });


    solicitarRetiradaModule.init();
    selecionarItemModule.init();
    reportsModule.init();
    alertasModule.init();
    historicoServidorModule.init();
    usuariosModule.init()

    bindQuickAccessLinks();

    checkAlertsNotification();

    // Inicializa o dashboard correto ao carregar a página
    if (isServidorDashboard) {
        window.loadDashboardOverview();
    } else if (isAlmoxarifadoDashboard) {
        loadAlmoxarifadoWelcomeSection();
    }
});
