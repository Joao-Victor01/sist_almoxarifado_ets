// frontend/static/js/main.js
import { retiradasModule } from './retiradasModule.js';
// Não importamos listar-itens, listar-categorias, etc. diretamente aqui,
// pois eles são scripts CLÁSSICOS (não módulos ES6) e expõem funções globais (como renderizarListaItens).
// Usaremos typeof para verificar a existência dessas funções globais antes de chamá-las.

document.addEventListener('DOMContentLoaded', () => {
    // --- Lógica de Inicialização Global (substitui o antigo initPage e initBindings) ---
    const mainContent = document.getElementById('main-content');
    const defaultHTML = mainContent ? mainContent.innerHTML : ''; // Captura o conteúdo inicial da dashboard

    // 1. Home Button (restaura o conteúdo inicial e re-binda)
    const homeButton = document.getElementById('home-button');
    if (homeButton && mainContent) {
        homeButton.addEventListener('click', e => {
            e.preventDefault();
            mainContent.innerHTML = defaultHTML; // Restaura o HTML original do acesso rápido
            // Re-inicializa os binds de acesso rápido e logout após restaurar o HTML
            bindQuickAccessLinks();
            bindLogoutLink();
        });
    }

    // 2. Quick Access links e Modals (ex: Cadastrar Item/Categoria)
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

        // Chame as funções de renderização de listas (se forem globais)
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
    }

    // 3. Logout Link
    function bindLogoutLink() {
        document.getElementById('logout-link')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof logout === 'function') logout(); // Assumindo 'logout' é global de logout.js
            else console.warn("Função global 'logout' não encontrada. Verifique se logout.js está carregado e expõe a função globalmente.");
        });
    }

    // Chame as funções de bind iniciais uma única vez no DOMContentLoaded
    bindQuickAccessLinks();
    bindLogoutLink();

    // --- Lógica de Retiradas (modular) ---
    // Links de navegação para as telas de Retiradas
    document.getElementById('listar-retiradas-link')?.addEventListener('click', e => {
        e.preventDefault();
        retiradasModule.renderHistoricoRetiradas();
    });
    document.getElementById('listar-retiradas-pendentes-link')?.addEventListener('click', e => {
        e.preventDefault();
        retiradasModule.renderPendentesRetiradas();
    });
    document.getElementById('listar-retiradas-pendentes-quick')?.addEventListener('click', e => {
        e.preventDefault();
        retiradasModule.renderPendentesRetiradas();
    });

    // Anexar listeners para os botões de CONFIRMAÇÃO do modal de Autorização/Negação
    // Estes botões são estáticos e não são removidos do DOM, portanto, os listeners são anexados uma única vez.
    const btnConfirmarAutorizar = document.getElementById('btn-confirmar-autorizar-retirada');
    if (btnConfirmarAutorizar) {
        btnConfirmarAutorizar.addEventListener('click', retiradasModule._handleAuthorizeDeny.bind(retiradasModule, 'AUTORIZADA'));
    }

    const btnConfirmarNegar = document.getElementById('btn-confirmar-negar-retirada');
    if (btnConfirmarNegar) {
        btnConfirmarNegar.addEventListener('click', retiradasModule._handleAuthorizeDeny.bind(retiradasModule, 'NEGADA'));
    }
});