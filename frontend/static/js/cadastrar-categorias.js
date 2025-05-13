
// frontend/static/js/cadastrar-categorias.js

document.addEventListener('DOMContentLoaded', () => {
  const modalEl = document.getElementById('modalCadastrarCategoria');
  const modal   = new bootstrap.Modal(modalEl);
  const form    = document.getElementById('form-cadastrar-categoria');

  // Abrir
  document.getElementById('btn-open-cadastrar-categoria')?.addEventListener('click', e => {
    e.preventDefault(); form.reset(); modal.show();
  });
  document.getElementById('btn-cancelar-categoria')?.addEventListener('click', () => {
    modal.hide(); document.querySelectorAll('.modal-backdrop').forEach(el=>el.remove());
  });

  // Salvar cadastro
  document.getElementById('btn-salvar-categoria').onclick = async () => {
    if(!form.checkValidity()) return form.reportValidity();
    const data = { nome_categoria: form.nome_categoria.value, descricao_categoria: form.descricao_categoria.value || undefined };
    const token = localStorage.getItem('token');
    const res = await fetch('/api/almoxarifado/categorias/', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body: JSON.stringify(data)
    });
    if(!res.ok) return alert('Erro ao cadastrar categoria');

    form.reset(); modal.hide(); document.querySelectorAll('.modal-backdrop').forEach(el=>el.remove());
    renderizarCategorias();

    // alerta de sucesso
    const alertBox = document.getElementById('alert-categoria');
    alertBox.innerHTML = `<div class="alert alert-success alert-dismissible fade show" role="alert">Categoria cadastrada com sucesso!<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button></div>`;
    setTimeout(()=>{ const a = alertBox.querySelector('.alert'); if(a) bootstrap.Alert.getOrCreateInstance(a).close(); },3000);
  };
});
