// frontend/static/js/main.js
import { retiradasModule } from './retiradasModule.js';
import { solicitarRetiradaModule } from './solicitar-retirada.js'; // IMPORTAR O NOVO MÓDULO AQUI

document.addEventListener('DOMContentLoaded', () => {
    // Referência ao conteúdo principal da dashboard
    const mainContent = document.getElementById('main-content');
    // Armazena o HTML inicial da seção 'main-content' para restauração
    // ao clicar no botão "home"
    const defaultHTML = mainContent ? mainContent.innerHTML : '';

    // 1. Lógica do Botão Home (restaura o conteúdo inicial e re-binda eventos)
    const homeButton = document.getElementById('home-button');
    if (homeButton && mainContent) {
        homeButton.addEventListener('click', e => {
            e.preventDefault();
            // Restaura o HTML original da seção de acesso rápido
            mainContent.innerHTML = defaultHTML;
            // Re-inicializa os binds para os links de acesso rápido
            // e o link de logout após restaurar o HTML
            bindQuickAccessLinks();
            bindLogoutLink();
        });
    }

    // 2. Função para vincular eventos aos links de Acesso Rápido e Modais
    function bindQuickAccessLinks() {
        // Bind para o modal de Cadastrar Item
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

        // Bind para o link de Listar Itens (dropdown e quick access)
        document.getElementById('listar-item-link')?.addEventListener('click', e => {
            e.preventDefault();
            // Verifica se a função global renderizarListaItens existe (do script clássico)
            if (typeof renderizarListaItens === 'function') renderizarListaItens();
            else console.warn("Função global 'renderizarListaItens' não encontrada. Verifique se listar-itens.js está carregado e expõe a função globalmente.");
        });
        document.getElementById('listar-item-link-quick')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof renderizarListaItens === 'function') renderizarListaItens();
            else console.warn("Função global 'renderizarListaItens' não encontrada.");
        });

        // Bind para o modal de Cadastrar Categoria
        const modalCadastrarCategoriaEl = document.getElementById('modalCadastrarCategoria');
        if (modalCadastrarCategoriaEl) {
            const modalCat = new bootstrap.Modal(modalCadastrarCategoriaEl);
            document.getElementById('btn-open-cadastrar-categoria')?.addEventListener('click', e => {
                e.preventDefault();
                modalCat.show();
            });
        }
        // Bind para o link de Listar Categorias (dropdown e quick access)
        document.getElementById('listar-categoria-link')?.addEventListener('click', e => {
            e.preventDefault();
            // Verifica se a função global renderizarCategorias existe (do script clássico)
            if (typeof renderizarCategorias === 'function') renderizarCategorias();
            else console.warn("Função global 'renderizarCategorias' não encontrada. Verifique se listar-categorias.js está carregado e expõe a função globalmente.");
        });
        document.getElementById('listar-categoria-link-quick')?.addEventListener('click', e => {
            e.preventDefault();
            if (typeof renderizarCategorias === 'function') renderizarCategorias();
            else console.warn("Função global 'renderizarCategorias' não encontrada.");
        });

        // Bind para o link de Retiradas Pendentes (Card de Acesso Rápido)
        // Este link permanece no quick_cards.html
        document.getElementById('listar-retiradas-pendentes-quick')?.addEventListener('click', e => {
            e.preventDefault();
            retiradasModule.renderPendentesRetiradas();
        });

        // O link para 'btn-open-solicitar-retirada' AGORA ESTÁ NO NAVBAR,
        // então não precisamos re-bindá-lo aqui dentro da função `bindQuickAccessLinks`,
        // pois ele não faz mais parte dos quick cards.
        // O `solicitarRetiradaModule.init()` já cuida do bind para o elemento na navbar
        // uma única vez no DOMContentLoaded.
    }

    // 3. Função para vincular evento ao link de Logout
    function bindLogoutLink() {
        document.getElementById('logout-link')?.addEventListener('click', e => {
            e.preventDefault();
            // Assumindo que 'logout' é uma função global definida em logout.js
            if (typeof logout === 'function') logout();
            else console.warn("Função global 'logout' não encontrada. Verifique se logout.js está carregado e expõe a função globalmente.");
        });
    }

    // --- Chame as funções de bind iniciais UMA ÚNICA VEZ no DOMContentLoaded ---
    // Isso garante que todos os listeners para elementos que são carregados inicialmente
    // e/ou re-criados após a "home" sejam devidamente anexados.
    bindQuickAccessLinks();
    bindLogoutLink();

    // --- Lógica de Retiradas (modular) ---
    // Links de navegação para as telas de Retiradas (Dropdown da Navbar)
    // Estes elementos não são recriados ao voltar para a home, então seus listeners
    // são anexados uma única vez aqui.
    document.getElementById('listar-retiradas-link')?.addEventListener('click', e => {
        e.preventDefault();
        retiradasModule.renderHistoricoRetiradas();
    });
    document.getElementById('listar-retiradas-pendentes-link')?.addEventListener('click', e => {
        e.preventDefault();
        retiradasModule.renderPendentesRetiradas();
    });
    
    // Anexar listeners para os botões de CONFIRMAÇÃO do modal de Autorização/Negação
    // Estes botões são estáticos e não são removidos/recriados do DOM,
    // portanto, seus listeners são anexados uma única vez.
    const btnConfirmarAutorizar = document.getElementById('btn-confirmar-autorizar-retirada');
    if (btnConfirmarAutorizar) {
        btnConfirmarAutorizar.addEventListener('click', retiradasModule._handleAuthorizeDeny.bind(retiradasModule, 'AUTORIZADA'));
    }

    const btnConfirmarNegar = document.getElementById('btn-confirmar-negar-retirada');
    if (btnConfirmarNegar) {
        btnConfirmarNegar.addEventListener('click', retiradasModule._handleAuthorizeDeny.bind(retiradasModule, 'NEGADA'));
    }

    // --- Inicializar o módulo de solicitação de retirada ---
    // Este módulo é responsável por:
    // 1. Vincular o evento de clique ao botão 'btn-open-solicitar-retirada' (agora no navbar).
    // 2. Carregar dados iniciais (setores e itens) quando o modal é aberto.
    // 3. Gerenciar a adição/remoção de itens na solicitação.
    // 4. Enviar a solicitação à API.
    // Ele é inicializado uma única vez, pois o elemento que ele escuta (na navbar)
    // não é alterado/removido ao navegar entre as seções do 'main-content'.
    solicitarRetiradaModule.init(); 
});