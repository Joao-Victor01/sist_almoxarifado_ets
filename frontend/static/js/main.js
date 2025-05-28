// frontend/static/js/main.js

import { retiradasModule } from './retiradasModule.js';
import { solicitarRetiradaModule } from './solicitar-retirada.js';
import { selecionarItemModule } from './selecionar-item-module.js';
import { reportsModule } from './reportsModule.js';
import { alertasModule } from './alertasModule.js';
import { apiService } from './apiService.js';
import { setNewAlertsFlag, getNewAlertsFlag, updateNotificationBellUI } from './utils.js';

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
            checkAlertsNotification();
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
            else console.warn("Função global 'renderizarCategorias não encontrada.");
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
                setNewAlertsFlag(false);
                await apiService.markAllAlertsAsViewed();
                alertasModule.renderAlertsPage();
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

    // Função para verificar alertas e atualizar o sino
    async function checkAlertsNotification() {
        console.log('checkAlertsNotification: Verificando alertas...');
        try {
            const count = await apiService.getUnviewedAlertsCount();
            console.log('checkAlertsNotification: Contagem de alertas não visualizados:', count);

            if (count > 0) {
                setNewAlertsFlag(true);
                console.log('checkAlertsNotification: Novos alertas detectados. Flag definida para true.');
            } else {
                setNewAlertsFlag(false);
                console.log('checkAlertsNotification: Nenhum novo alerta. Flag definida para false.');
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

    // Iniciar a verificação periódica de alertas
    checkAlertsNotification(); // Verifica imediatamente ao carregar a página
    setInterval(checkAlertsNotification, 30000); // E então verifica a cada 30 segundos

    // Re-inicializa os dropdowns do Bootstrap uma vez que o DOM está pronto e todos os scripts foram carregados
    reinitializeBootstrapDropdowns();
});
