/* frontend/static/js/listar-retiradas.js */

// Estado de paginação e filtros
let currentPage = 1;
let pageSize    = 10;
const pageSizeOptions = [5, 10, 25, 50, 100];
let filterStatus      = '';
let filterSolicitante = '';
let filterStart       = '';
let filterEnd         = '';

const statusMap = {
  1: 'PENDENTE',
  2: 'AUTORIZADA',
  3: 'CONCLUÍDA',
  4: 'NEGADA'
};

// Exibe alert no topo
function showAlert(message, type = 'success') {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  document.getElementById('main-content').prepend(wrapper);
}

// Fetch genérico paginado
async function fetchRetiradasPaginated(path, params = {}) {
  const token = localStorage.getItem('token');
  const qs = new URLSearchParams({
    page: currentPage,
    page_size: pageSize,
    ...params
  });
  const resp = await fetch(`/api/almoxarifado/retiradas${path}?${qs}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  if (!resp.ok) throw new Error(`Erro ${resp.status}: não foi possível carregar`);
  return resp.json();
}

// Renderers
function renderSearchBar() {
  return `
  <div class="row mb-3" id="search-bar">
    <div class="col-md-2">
      <select id="f-status" class="form-select form-select-sm">
        <option value="">Todos status</option>
        ${Object.entries(statusMap)
          .map(([k,v])=>`<option value="${k}">${v}</option>`)
          .join('')}
      </select>
    </div>
    <div class="col-md-3">
      <input type="text" id="f-solicitante" class="form-control form-control-sm"
             placeholder="Solicitante">
    </div>
    <div class="col-md-2">
      <input type="date" id="f-start" class="form-control form-control-sm">
    </div>
    <div class="col-md-2">
      <input type="date" id="f-end" class="form-control form-control-sm">
    </div>
    <div class="col-md-3 d-flex">
      <button id="btn-search" class="btn btn-primary btn-sm me-2">Buscar</button>
      <button id="btn-clear"  class="btn btn-secondary btn-sm">Limpar</button>
    </div>
  </div>`;
}

function renderTable(items) {
  return `
  <div class="table-responsive">
    <table class="table table-bordered table-striped">
      <thead class="table-secondary text-center">
        <tr>
          <th>ID</th>
          <th>Solicitante</th>
          <th>Data</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(r=>`
        <tr>
          <td>${r.retirada_id}</td>
          <td>${r.solicitado_localmente_por||r.usuario_id}</td>
          <td>${new Date(r.data_solicitacao).toLocaleDateString()}</td>
          <td>${statusMap[r.status]}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-info btn-detalhes" data-id="${r.retirada_id}">
              Detalhes
            </button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function renderPagination(pages) {
  let html = `<nav><ul class="pagination justify-content-center">`;

  html += `<li class="page-item ${currentPage===1?'disabled':''}">
      <a class="page-link" href="#" data-action="prev">«</a>
    </li>`;

  const start = Math.max(1, currentPage-2),
        end   = Math.min(pages, currentPage+2);

  for (let p = start; p <= end; p++) {
    html += `<li class="page-item ${p===currentPage?'active':''}">
        <a class="page-link" href="#" data-page="${p}">${p}</a>
      </li>`;
  }

  html += `<li class="page-item ${currentPage>=pages?'disabled':''}">
      <a class="page-link" href="#" data-action="next">»</a>
    </li>`;
  html += `</ul></nav>`;

  // select pageSize
  const opts = pageSizeOptions
    .map(opt=>`<option value="${opt}" ${opt===pageSize?'selected':''}>${opt}</option>`)
    .join('');

  html += `
    <div class="d-flex justify-content-center my-2">
      <label class="me-2">Itens/página:</label>
      <select id="page-size" class="form-select w-auto form-select-sm">
        ${opts}
      </select>
    </div>`;

  return html;
}

// Carrega e exibe tudo
async function renderRetiradas(path) {
  try {
    const params = {};
    if (filterStatus)      params.status = filterStatus;
    if (filterSolicitante) params.solicitante = filterSolicitante;
    if (filterStart && filterEnd) {
      params.start_date = new Date(filterStart).toISOString();
      params.end_date   = new Date(filterEnd).toISOString();
    }

    const data = await fetchRetiradasPaginated(path, params);
    const main = document.getElementById('main-content');
    main.innerHTML = renderSearchBar()
                   + renderTable(data.items)
                   + renderPagination(data.pages);

    bindSearch(path);
    bindPagination(path, data.pages);
    bindDetalhes();
  } catch (err) {
    showAlert(err.message, 'danger');
  }
}

// Eventos de busca
function bindSearch(path) {
  document.getElementById('btn-search').onclick = e => {
    e.preventDefault();
    filterStatus      = document.getElementById('f-status').value;
    filterSolicitante = document.getElementById('f-solicitante').value.trim();
    filterStart       = document.getElementById('f-start').value;
    filterEnd         = document.getElementById('f-end').value;
    currentPage = 1;
    renderRetiradas(path);
  };
  document.getElementById('btn-clear').onclick = e => {
    e.preventDefault();
    filterStatus = filterSolicitante = filterStart = filterEnd = '';
    currentPage = 1; pageSize = 10;
    renderRetiradas(path);
  };
}

// Eventos de paginação
function bindPagination(path, pages) {
  document.querySelector('[data-action="prev"]')?.onclick = e => {
    e.preventDefault();
    if (currentPage > 1) { currentPage--; renderRetiradas(path); }
  };
  document.querySelector('[data-action="next"]')?.onclick = e => {
    e.preventDefault();
    if (currentPage < pages) { currentPage++; renderRetiradas(path); }
  };
  document.querySelectorAll('[data-page]').forEach(el => {
    el.onclick = e => {
      e.preventDefault();
      currentPage = +el.dataset.page;
      renderRetiradas(path);
    };
  });
  document.getElementById('page-size').onchange = e => {
    pageSize = +e.target.value;
    currentPage = 1;
    renderRetiradas(path);
  };
}

// Eventos de detalhes
function bindDetalhes() {
  document.querySelectorAll('.btn-detalhes').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const data = await fetchRetiradasPaginated(`/${id}`, {});
      await fillModalDetalhes(data);
      new bootstrap.Modal(
        document.getElementById('modalVerDetalhesRetirada')
      ).show();
    };
  });
}

// Gatilhos iniciais
document.addEventListener('DOMContentLoaded', () => {
  // Navbar
  document.getElementById('listar-retiradas-link')
    .addEventListener('click', e => {
      e.preventDefault();
      currentPage = 1;
      renderRetiradas('/paginated');
    });
  document.getElementById('listar-retiradas-pendentes-link')
    .addEventListener('click', e => {
      e.preventDefault();
      currentPage = 1;
      renderRetiradas('/pendentes/paginated');
    });
  // Quick access
  document.getElementById('listar-retiradas-pendentes-quick')
    .addEventListener('click', e => {
      e.preventDefault();
      currentPage = 1;
      renderRetiradas('/pendentes/paginated');
    });

  // Inicia tooltips
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
    .forEach(el => new bootstrap.Tooltip(el));
});
