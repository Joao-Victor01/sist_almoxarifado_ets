// frontend/static/js/item-cadastro.js
import { postJson } from './api.js';
import { renderizarListaItens } from './pagination.js';
import { initGenericModal } from './modal.js';

document.addEventListener('DOMContentLoaded', () => {
  // configura e abre modal
  initGenericModal({
    openSelectors: ['#btn-open-cadastrar-item', '#btn-open-cadastrar-item-dropdown'],
    modalId: 'modalCadastrarItem',
    cancelId: 'btn-cancelar-item'
  });

  // handler salvar
  const form = document.getElementById('form-cadastrar-item');
  document.getElementById('btn-salvar-item').addEventListener('click', async ()=>{
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(form).entries());
    // filtra e converte…
    const { status, payload } = await postJson('/api/almoxarifado/itens/', data);
    if (status===201) {
      alert('✔ Item cadastrado!');
      form.reset();
      document.querySelector('.modal').querySelector('.btn-close').click();
      if (typeof renderizarListaItens==='function') renderizarListaItens();
    } else {
      alert(JSON.stringify(payload.detail || payload));
    }
  });
});
