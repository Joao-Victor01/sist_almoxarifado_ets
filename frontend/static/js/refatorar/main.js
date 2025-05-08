// frontend/static/js/main.js
import { bindListarItens } from './pagination.js';
import './auth.js';          // login/logout já auto-bindam em DOMContentLoaded
import './item-cadastro.js'; // modal + cadastro
import './pagination.js';    // bind inicial de listar-itens
import './modal.js';         // para qualquer outro modal

document.addEventListener('DOMContentLoaded', () => {
  // Listar Itens no dropdown e quick-access
  bindListarItens('#listar-item-link');
  bindListarItens('#listar-item-link-quick');
});
