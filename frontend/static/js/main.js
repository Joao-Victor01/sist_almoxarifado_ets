// frontend/static/js/main.js
import { retiradasModule } from './retiradasModule.js';
import { solicitarRetiradaModule } from './solicitar-retirada.js';
import { selecionarItemModule } from './selecionar-item-module.js'; 

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
        });
    }

    function bindQuickAccessLinks() {
        const modalCadastrarItemEl = document.getElementById('modalCadastrarItem');
        if (modalCadastrarItemEl) {
            const modalItem = new bootstrap.Modal(modalCadastrarItemEl);
            document.querySelectorAll('#btn-open-cadastrar-item').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    modalItem.show();
                });
            });
        }

        document.getElementById('listar-item-link')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof renderizarListaItens === 'function') renderizarListaItens();
            else console.warn("Função global 'renderizarListaItens' não encontrada. Verifique se listar-itens.js está carregado e expõe a função globalmente.");
        });
        document.getElementById('listar-item-link-quick')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof renderizarListaItens === 'function') renderizarListaItens();
            else console.warn("Função global 'renderizarListaItens' não encontrada.");
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
            if (typeof renderizarCategorias === 'function') renderizarCategorias();
            else console.warn("Função global 'renderizarCategorias' não encontrada. Verifique se listar-categorias.js está carregado e expõe a função globalmente.");
        });
        document.getElementById('listar-categoria-link-quick')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof renderizarCategorias === 'function') renderizarCategorias();
            else console.warn("Função global 'renderizarCategorias' não encontrada.");
        });

        document.getElementById('listar-retiradas-pendentes-quick')?.addEventListener('click', e => {
            e.preventDefault();
            retiradasModule.renderPendentesRetiradas();
        });
    }

    function bindLogoutLink() {
        document.getElementById('logout-link')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof logout === 'function') logout();
            else console.warn("Função global 'logout' não encontrada. Verifique se logout.js está carregado e expõe a função globalmente.");
        });
    }

    bindQuickAccessLinks();
    bindLogoutLink();

    // --- Lógica de Retiradas (modular) ---
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
});