//frontend\static\js\cadastrar-item.js

document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('modalCadastrarItem');
    const modal = new bootstrap.Modal(modalEl);
  
    // botões que abrem o modal
    document.querySelectorAll('#btn-open-cadastrar-item').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        modal.show();
      });
    });
  
    const form = document.getElementById('form-cadastrar-item');
    const btnSalvar = document.getElementById('btn-salvar-item');

    // 1) Cancelar
    document.getElementById('btn-cancelar-item').addEventListener('click', () => {
        modal.hide();
    });

    // 2) Ao esconder o modal, limpa backdrop e classe no body
    modalEl.addEventListener('hidden.bs.modal', () => {
        // remove sombra e bloqueio de clique
        document.body.classList.remove('modal-open');
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    });
  
    btnSalvar.addEventListener('click', async () => {
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
  
      // monta objeto e filtra valores vazios
      const formData = new FormData(form);
      const data = {};
      for (const [key, value] of formData.entries()) {
        if (value !== '') {
          // converte numéricos
          if (['quantidade_item','quantidade_minima_item','categoria_id'].includes(key)) {
            data[key] = Number(value);
          } else {
            data[key] = value;
          }
        }
      }
      // formata data_entrada_item se existir
      if (data.data_entrada_item) {
        data.data_entrada_item = new Date(data.data_entrada_item).toISOString();
      }
      // data_validade_item já vem em yyyy-mm-dd e o Pydantic aceita
  
      try {
        const token = localStorage.getItem('token');
        const resp = await fetch('/api/almoxarifado/itens/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
  
        if (resp.status === 201) {
          alert('✔ Item cadastrado com sucesso!');
          form.reset();
          modal.hide();
          // atualiza listagem se aberta
          if (typeof renderizarListaItens === 'function') renderizarListaItens();
        } else {
          // exibe erros vindo da API
          const err = await resp.json();
          if (Array.isArray(err.detail)) {
            // Pydantic retorna lista de erros
            const msgs = err.detail.map(e => `${e.loc.join('.')}: ${e.msg}`);
            alert('Erros:\n' + msgs.join('\n'));
          } else {
            alert(err.detail || 'Falha ao cadastrar item.');
          }
        }
      } catch (e) {
        console.error(e);
        alert('Erro de conexão com o servidor.');
      }
    });
  });
  