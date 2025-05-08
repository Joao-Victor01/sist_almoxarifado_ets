// frontend/static/js/listar-itens.js

// Estado de paginação
let currentPage = 1;
let pageSize    = 10;

// Itens permitidos no seletor
const pageSizeOptions = [5, 10, 25, 50, 100];

// --- 1) Carregamento paginado via API ---
async function carregarListaItens(page = currentPage, size = pageSize) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Sessão expirada. Faça login novamente.');
    window.location.href = '/';
    return null;
  }

  const url = `/api/almoxarifado/itens/paginated?page=${page}&size=${size}`;
  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept':        'application/json'
    }
  });

  if (resp.status === 401) {
    alert('Sessão expirada. Faça login novamente.');
    localStorage.removeItem('token');
    window.location.href = '/';
    return null;
  }
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json(); // { items: [...], total_pages: W, … }
}

// --- 2) HTML da tabela + ações ---
function criarTabelaItens(itens) {
  let html = `
    <h3 class="mb-3">Lista de Itens do Almoxarifado</h3>
    <div class="table-responsive">
      <table class="table table-bordered table-striped">
        <thead class="table-secondary text-center">
          <tr>
            <th>Nome</th>
            <th>Descrição</th>
            <th>Unidade</th>
            <th>Quantidade</th>
            <th>Validade</th>
            <th>Entrada</th>
            <th>Marca</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  itens.forEach(item => {
    html += `
      <tr>
        <td>${item.nome_item}</td>
        <td>${item.descricao_item}</td>
        <td>${item.unidade_medida_item}</td>
        <td class="text-center">${item.quantidade_item}</td>
        <td class="text-center">${
          item.data_validade_item
            ? new Date(item.data_validade_item).toLocaleDateString()
            : '-'
        }</td>
        <td class="text-center">${
          item.data_entrada_item
            ? new Date(item.data_entrada_item).toLocaleDateString()
            : '-'
        }</td>
        <td>${item.marca_item || '-'}</td>
        <td class="text-center">
          <a href="#"
             class="btn btn-sm btn-primary me-1 btn-editar"
             data-id="${item.item_id}">
            Editar
          </a>
          <button class="btn btn-sm btn-danger btn-deletar"
                  data-id="${item.item_id}">
            Deletar
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;
  return html;
}

// --- 3) Controles de paginação + selector ---
function criarControlesPaginacao(totalPages) {
  let html = `<nav aria-label="Paginação"><ul class="pagination justify-content-center">`;

  // Anterior
  html += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-action="prev">Anterior</a>
    </li>`;

  // Números
  const startPage = Math.max(1, currentPage - 2);
  const endPage   = Math.min(totalPages, currentPage + 2);
  for (let p = startPage; p <= endPage; p++) {
    html += `
      <li class="page-item ${p === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${p}">${p}</a>
      </li>`;
  }

  // Próximo
  html += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-action="next">Próximo</a>
    </li>
  `;
  html += `</ul></nav>`;

  // Selector de size
  html += `
    <div class="d-flex justify-content-center align-items-center my-2">
      <label for="page-size-select" class="me-2">Itens por página:</label>
      <select id="page-size-select" class="form-select w-auto">
        ${pageSizeOptions.map(opt =>
          `<option value="${opt}" ${opt === pageSize ? 'selected' : ''}>${opt}</option>`
        ).join('')}
      </select>
    </div>`;
  return html;
}

// --- 4) Render + bindings ---
async function renderizarListaItens() {
  try {
    const data = await carregarListaItens();
    if (!data) return;

    const { items, total_pages } = data;
    const main = document.getElementById('main-content');

    main.innerHTML = criarTabelaItens(items)
                   + criarControlesPaginacao(total_pages);

    // 4.1 Paginação
    document.querySelectorAll('[data-action="prev"]').forEach(el =>
      el.addEventListener('click', e => {
        e.preventDefault();
        if (currentPage > 1) {
          currentPage--;
          renderizarListaItens();
        }
      })
    );
    document.querySelectorAll('[data-action="next"]').forEach(el =>
      el.addEventListener('click', e => {
        e.preventDefault();
        if (currentPage < total_pages) {
          currentPage++;
          renderizarListaItens();
        }
      })
    );
    document.querySelectorAll('[data-page]').forEach(el =>
      el.addEventListener('click', e => {
        e.preventDefault();
        const p = Number(el.getAttribute('data-page'));
        if (p !== currentPage) {
          currentPage = p;
          renderizarListaItens();
        }
      })
    );
    document.getElementById('page-size-select')
      .addEventListener('change', e => {
        pageSize    = Number(e.target.value);
        currentPage = 1;
        renderizarListaItens();
      });

    // 4.2 Deletar
    document.querySelectorAll('.btn-deletar').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        if (!confirm('Tem certeza que deseja excluir este item?')) return;
        try {
          const token = localStorage.getItem('token');
          const resp  = await fetch(
            `/api/almoxarifado/itens/${id}`, {
              method:  'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          renderizarListaItens();
        } catch (err) {
          alert('Erro ao excluir: ' + err.message);
        }
      });
    });

    // 4.3 Editar
    document.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault();
        const id    = btn.getAttribute('data-id');
        const token = localStorage.getItem('token');

        // GET item by id
        const resp = await fetch(
          `/api/almoxarifado/itens/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        if (!resp.ok) {
          return alert('Erro ao carregar dados do item.');
        }
        const item = await resp.json();

        // Preenche form
        document.getElementById('edit-nome_item').value             = item.nome_item;
        document.getElementById('edit-unidade_medida_item').value   = item.unidade_medida_item;
        document.getElementById('edit-descricao_item').value        = item.descricao_item;
        document.getElementById('edit-quantidade_item').value       = item.quantidade_item;
        document.getElementById('edit-quantidade_minima_item').value =
          item.quantidade_minima_item || '';
        document.getElementById('edit-data_validade_item').value    =
          item.data_validade_item?.split('T')[0] || '';
        document.getElementById('edit-data_entrada_item').value     =
          item.data_entrada_item?.slice(0,16) || '';
        document.getElementById('edit-marca_item').value            = item.marca_item || '';
        document.getElementById('edit-categoria_id').value          = item.categoria_id;

        // Guarda id
        const saveBtn = document.getElementById('btn-salvar-editar-item');
        saveBtn.setAttribute('data-id', id);

        // Exibe modal de edição
        new bootstrap.Modal(
          document.getElementById('modalEditarItem')
        ).show();
      });
    });

  } catch (err) {
    console.error('Erro ao renderizar itens:', err);
    document.getElementById('main-content').innerHTML = `
      <div class="alert alert-warning">
        Não foi possível carregar a lista de itens (${err.message}).
      </div>`;
  }
}

// 5) Listener único para salvar edição no modal
document.getElementById('btn-salvar-editar-item')
  .addEventListener('click', async e => {
    const id = e.target.getAttribute('data-id');
    if (!id) return;

    const form = document.getElementById('form-editar-item');
    const data = {
      nome_item:           form.nome_item.value,
      unidade_medida_item: form.unidade_medida_item.value,
      descricao_item:      form.descricao_item.value,
      quantidade_item:     Number(form.quantidade_item.value),
      categoria_id:        Number(form.categoria_id.value),
    };

    if (form.quantidade_minima_item.value) {
      data.quantidade_minima_item = Number(form.quantidade_minima_item.value);
    }
    if (form.data_validade_item.value) {
      data.data_validade_item = form.data_validade_item.value;
    }
    if (form.marca_item.value) {
      data.marca_item = form.marca_item.value;
    }

    try {
      const token = localStorage.getItem('token');
      const resp  = await fetch(`/api/almoxarifado/itens/${id}`, {
        method:  'PUT',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      // Fecha modal e recarrega lista
      bootstrap.Modal
        .getInstance(document.getElementById('modalEditarItem'))
        .hide();
      renderizarListaItens();
    } catch (err) {
      alert('Erro ao salvar alterações: ' + err.message);
    }
  });

// 6) Inicia a listagem ao clicar no menu “Listar Itens”
document.addEventListener('DOMContentLoaded', () => {
  const link = document.getElementById('listar-item-link');
  if (link) {
    link.addEventListener('click', e => {
      e.preventDefault();
      currentPage = 1;
      pageSize    = 10;
      renderizarListaItens();
    });
  }
});
