// frontend/static/js/main.js
import { retiradasModule } from './retiradasModule.js';

document.addEventListener('DOMContentLoaded', () => {
    // Hooks para chamar as views
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
    // Estes botões são estáticos e não são removidos do DOM.
    const btnConfirmarAutorizar = document.getElementById('btn-confirmar-autorizar-retirada');
    if (btnConfirmarAutorizar) {
        // Usar .bind(retiradasModule) para que 'this' dentro de _handleAuthorizeDeny se refira a 'retiradasModule'
        btnConfirmarAutorizar.addEventListener('click', retiradasModule._handleAuthorizeDeny.bind(retiradasModule, 'AUTORIZADA'));
    }

    const btnConfirmarNegar = document.getElementById('btn-confirmar-negar-retirada');
    if (btnConfirmarNegar) {
        btnConfirmarNegar.addEventListener('click', retiradasModule._handleAuthorizeDeny.bind(retiradasModule, 'NEGADA'));
    }
});