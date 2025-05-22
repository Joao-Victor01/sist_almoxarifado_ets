// frontend/static/js/listar-retiradas.js

// Estado global
let allRetiradas = [];
let pendentesRetiradas = [];
let currentHistoricoPage = 1;
let totalHistoricoPages = 1;
let currentHistoricoPageSize = 10;
let currentHistoricoFilters = {};

let currentPendentesPage = 1;
let totalPendentesPages = 1;
let currentPendentesPageSize = 10;

const statusMap = {
  1: 'PENDENTE',
  2: 'AUTORIZADA',
  3: 'CONCLUÍDA',
  4: 'NEGADA'
};

const statusMapUpdate = {
  AUTORIZADA: 2,
  NEGADA: 4
};

function showAlert(message, type = 'success') {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>`;
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.prepend(wrapper);
  } else {
    console.error("Elemento 'main-content' não encontrado para exibir alerta.");
  }
}

// --- Helpers de API ---
async function getUsuarioById(id) {
  const token = localStorage.getItem('token');
  try {
    const resp = await fetch(`/api/almoxarifado/usuarios/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) return `#${id}`;
    const u = await resp.json();
    return u.nome_usuario;
  } catch {
    return `#${id}`;
  }
}

async function getSetorById(id) {
  const token = localStorage.getItem('token');
  try {
    const resp = await fetch(`/api/almoxarifado/setores/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) return `#${id}`;
    const s = await resp.json();
    return s.nome_setor;
  } catch {
    return `#${id}`;
  }
}

async function fetchAllRetiradas(page = 1, pageSize = 10, filters = {}) {
  console.log(`WorkspaceAllRetiradas - page: ${page}, pageSize: ${pageSize}, filters:`, filters);
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({ page, page_size: pageSize });

  for (const key in filters) {
    if (filters[key]) {
      params.append(key, filters[key]);
    }
  }

  const url = Object.values(filters).some(val => val) ? // Verifica se algum filtro tem valor
    `/api/almoxarifado/retiradas/search?${params.toString()}` :
    `/api/almoxarifado/retiradas/paginated?${params.toString()}`;

  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Falha ao carregar histórico. Resposta não JSON.'}));
    throw new Error(errorData.detail || 'Falha ao carregar histórico');
  }
  const data = await resp.json();
  console.log("fetchAllRetiradas - data received:", data);
  return data;
}

async function fetchRetiradasPendentes(page = 1, pageSize = 10) {
  console.log(`WorkspaceRetiradasPendentes - page: ${page}, pageSize: ${pageSize}`);
  const token = localStorage.getItem('token');
  const resp = await fetch(`/api/almoxarifado/retiradas/pendentes/paginated?page=${page}&page_size=${pageSize}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Falha ao carregar pendentes. Resposta não JSON.'}));
    throw new Error(errorData.detail || 'Falha ao carregar pendentes');
  }
  const data = await resp.json();
  console.log("fetchRetiradasPendentes - data received:", data);
  return data;
}

async function buildLookupMaps(retiradas) {
  const userIds = [...new Set(retiradas.map(r => r.usuario_id).filter(id => id != null))];
  const setorIds = [...new Set(retiradas.map(r => r.setor_id).filter(id => id != null))];

  const usuariosArr = await Promise.all(
    userIds.map(id => getUsuarioById(id).then(name => [id, name]))
  );
  const setoresArr = await Promise.all(
    setorIds.map(id => getSetorById(id).then(name => [id, name]))
  );

  return {
    usuarioMap: Object.fromEntries(usuariosArr),
    setorMap: Object.fromEntries(setoresArr)
  };
}

function openItemDetail(item, qtdRetirada) {
  document.getElementById('itemNome').textContent = item.nome_item_original;
  document.getElementById('itemEstoque').textContent = item.quantidade_item;
  document.getElementById('itemQtdRetirada').textContent = qtdRetirada;
  document.getElementById('itemEstoqueMin').textContent = item.quantidade_minima_item;
  document.getElementById('itemValidade').textContent = new Date(item.data_validade_item).toLocaleDateString('pt-BR');
  new bootstrap.Modal(document.getElementById('modalDetalheItem')).show();
}

function renderItemList(containerId, itens) {
  const cont = document.getElementById(containerId);
  cont.innerHTML = '';
  itens.forEach(i => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'list-group-item list-group-item-action';
    btn.textContent = `${i.item.nome_item_original} — ${i.quantidade_retirada}`;
    btn.onclick = () => openItemDetail(i.item, i.quantidade_retirada);
    cont.appendChild(btn);
  });
}

// Render histórico de retiradas
async function renderHistoricoRetiradas(page = 1, filters = currentHistoricoFilters, pageSize = currentHistoricoPageSize) {
  try {
    const data = await fetchAllRetiradas(page, pageSize, filters);
    currentHistoricoPage = data.current_page;
    totalHistoricoPages = data.total_pages;
    currentHistoricoPageSize = pageSize;
    currentHistoricoFilters = filters;

    console.log(`renderHistoricoRetiradas - Atualizado: currentHistoricoPage=${currentHistoricoPage}, totalHistoricoPages=${totalHistoricoPages}`);

    const { usuarioMap } = await buildLookupMaps(data.items);

    allRetiradas = data.items.map(r => ({
      ...r,
      usuario_nome: r.solicitado_localmente_por || usuarioMap[r.usuario_id] || 'N/A'
    }));

    const main = document.getElementById('main-content');
    main.innerHTML = `
      <h3 class="mb-3">Histórico de Retiradas</h3>
      <div class="card mb-4">
        <div class="card-header">Filtros de Busca</div>
        <div class="card-body">
          <form id="form-filter-historico">
            <div class="row g-3">
              <div class="col-md-4">
                <label for="filterStatus" class="form-label">Status</label>
                <select class="form-select" id="filterStatus">
                  <option value="">Todos</option>
                  <option value="PENDENTE" ${filters.status === 'PENDENTE' ? 'selected' : ''}>Pendente</option>
                  <option value="AUTORIZADA" ${filters.status === 'AUTORIZADA' ? 'selected' : ''}>Autorizada</option>
                  <option value="CONCLUIDA" ${filters.status === 'CONCLUIDA' ? 'selected' : ''}>Concluída</option>
                  <option value="NEGADA" ${filters.status === 'NEGADA' ? 'selected' : ''}>Negada</option>
                </select>
              </div>
              <div class="col-md-4">
                <label for="filterSolicitante" class="form-label">Solicitante</label>
                <input type="text" class="form-control" id="filterSolicitante" value="${filters.solicitante || ''}">
              </div>
              <div class="col-md-4">
                <label for="filterStartDate" class="form-label">Data Inicial</label>
                <input type="date" class="form-control" id="filterStartDate" value="${filters.start_date || ''}">
              </div>
              <div class="col-md-4">
                <label for="filterEndDate" class="form-label">Data Final</label>
                <input type="date" class="form-control" id="filterEndDate" value="${filters.end_date || ''}">
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-primary" id="btn-search-historico">Buscar</button>
                <button type="button" class="btn btn-secondary ms-2" id="btn-clear-filters">Limpar Filtros</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-bordered table-striped">
          <thead class="table-secondary">
            <tr>
              <th>ID</th><th>Usuário</th><th>Data</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${allRetiradas.length > 0 ? allRetiradas.map(r => `
              <tr>
                <td>${r.retirada_id}</td>
                <td>${r.usuario_nome}</td>
                <td>${new Date(r.data_solicitacao).toLocaleDateString('pt-BR')}</td>
                <td>${statusMap[r.status]}</td>
                <td>
                  <button class="btn btn-sm btn-primary btn-detalhes-retirada" data-id="${r.retirada_id}">
                    Ver detalhes
                  </button>
                </td>
              </tr>
            `).join('') : `<tr><td colspan="5" class="text-center">Nenhuma retirada encontrada.</td></tr>`}
          </tbody>
        </table>
      </div>
      <nav aria-label="Page navigation">
        <ul class="pagination justify-content-center">
          <li class="page-item ${currentHistoricoPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-action="prev-historico">Anterior</a>
          </li>
          ${(() => {
            let pageLinks = '';
            let startPage = Math.max(1, currentHistoricoPage - 2);
            let endPage = Math.min(totalHistoricoPages, currentHistoricoPage + 2);

            if (totalHistoricoPages <= 5) {
                startPage = 1;
                endPage = totalHistoricoPages;
            } else {
                if (currentHistoricoPage <= 3) {
                    startPage = 1;
                    endPage = 5;
                } else if (currentHistoricoPage + 2 >= totalHistoricoPages) {
                    startPage = totalHistoricoPages - 4;
                    endPage = totalHistoricoPages;
                }
            }

            if (startPage > 1) {
              pageLinks += `<li class="page-item"><a class="page-link" href="#" data-page-historico="1">1</a></li>`;
              if (startPage > 2) {
                pageLinks += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
              }
            }

            for (let i = startPage; i <= endPage; i++) {
              pageLinks += `
                <li class="page-item ${i === currentHistoricoPage ? 'active' : ''}">
                  <a class="page-link" href="#" data-page-historico="${i}">${i}</a>
                </li>
              `;
            }

            if (endPage < totalHistoricoPages) {
              if (endPage < totalHistoricoPages - 1) {
                pageLinks += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
              }
              pageLinks += `<li class="page-item"><a class="page-link" href="#" data-page-historico="${totalHistoricoPages}">${totalHistoricoPages}</a></li>`;
            }
            return pageLinks;
          })()}
          <li class="page-item ${currentHistoricoPage === totalHistoricoPages || totalHistoricoPages === 0 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-action="next-historico">Próximo</a>
          </li>
        </ul>
      </nav>
      <div class="d-flex justify-content-center my-2">
        <label class="me-2 align-self-center">Itens por página:</label>
        <select class="form-select w-auto" id="historicoPageSize">
          <option value="5" ${currentHistoricoPageSize === 5 ? 'selected' : ''}>5</option>
          <option value="10" ${currentHistoricoPageSize === 10 ? 'selected' : ''}>10</option>
          <option value="25" ${currentHistoricoPageSize === 25 ? 'selected' : ''}>25</option>
          <option value="50" ${currentHistoricoPageSize === 50 ? 'selected' : ''}>50</option>
          <option value="100" ${currentHistoricoPageSize === 100 ? 'selected' : ''}>100</option>
        </select>
      </div>
    `;

    bindRetiradaActions();
    bindHistoricoPagination(totalHistoricoPages); // Passando totalHistoricoPages

    document.getElementById('form-filter-historico').addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('filterStatus').value;
      const solicitante = document.getElementById('filterSolicitante').value;
      const startDate = document.getElementById('filterStartDate').value;
      const endDate = document.getElementById('filterEndDate').value;

      const newFilters = { status, solicitante, start_date: startDate, end_date: endDate };
      await renderHistoricoRetiradas(1, newFilters, currentHistoricoPageSize);
    });

    document.getElementById('btn-clear-filters').addEventListener('click', async () => {
      document.getElementById('filterStatus').value = '';
      document.getElementById('filterSolicitante').value = '';
      document.getElementById('filterStartDate').value = '';
      document.getElementById('filterEndDate').value = '';
      await renderHistoricoRetiradas(1, {}, currentHistoricoPageSize);
    });

  } catch (error) {
    console.error("Erro em renderHistoricoRetiradas:", error);
    showAlert(error.message || 'Ocorreu um erro inesperado.', 'danger');
  }
}

// Render retiradas pendentes
async function renderPendentesRetiradas(page = 1, pageSize = currentPendentesPageSize) {
  try {
    const data = await fetchRetiradasPendentes(page, pageSize);
    currentPendentesPage = data.current_page;
    totalPendentesPages = data.total_pages;
    currentPendentesPageSize = pageSize;

    console.log(`renderPendentesRetiradas - Atualizado: currentPendentesPage=${currentPendentesPage}, totalPendentesPages=${totalPendentesPages}`);


    const { usuarioMap, setorMap } = await buildLookupMaps(data.items);

    pendentesRetiradas = data.items.map(r => ({
      ...r,
      usuario_nome: r.solicitado_localmente_por || usuarioMap[r.usuario_id] || 'N/A',
      setor_nome: setorMap[r.setor_id] || 'N/A'
    }));

    const main = document.getElementById('main-content');
    main.innerHTML = `
      <h3 class="mb-3">Retiradas Pendentes</h3>
      <div class="table-responsive">
        <table class="table table-bordered table-striped">
          <thead class="table-secondary">
            <tr>
              <th>ID</th><th>Usuário</th><th>Setor</th><th>Data</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${pendentesRetiradas.length > 0 ? pendentesRetiradas.map(r => `
              <tr>
                <td>${r.retirada_id}</td>
                <td>${r.usuario_nome}</td>
                <td>${r.setor_nome}</td>
                <td>${new Date(r.data_solicitacao).toLocaleDateString('pt-BR')}</td>
                <td>
                  <button class="btn btn-sm btn-success btn-autorizar-retirada-trigger" data-id="${r.retirada_id}">
                    Autorizar/Negar
                  </button>
                  <button class="btn btn-sm btn-info btn-detalhes-retirada" data-id="${r.retirada_id}">
                    Ver detalhes
                  </button>
                </td>
              </tr>
            `).join('') : `<tr><td colspan="5" class="text-center">Nenhuma retirada pendente encontrada.</td></tr>`}
          </tbody>
        </table>
      </div>
      <nav aria-label="Page navigation">
        <ul class="pagination justify-content-center">
          <li class="page-item ${currentPendentesPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-action="prev-pendentes">Anterior</a>
          </li>
          ${(() => {
            let pageLinks = '';
            let startPage = Math.max(1, currentPendentesPage - 2);
            let endPage = Math.min(totalPendentesPages, currentPendentesPage + 2);

            if (totalPendentesPages <= 5) {
                startPage = 1;
                endPage = totalPendentesPages;
            } else {
                if (currentPendentesPage <= 3) {
                    startPage = 1;
                    endPage = 5;
                } else if (currentPendentesPage + 2 >= totalPendentesPages) {
                    startPage = totalPendentesPages - 4;
                    endPage = totalPendentesPages;
                }
            }

            if (startPage > 1) {
              pageLinks += `<li class="page-item"><a class="page-link" href="#" data-page-pendentes="1">1</a></li>`;
              if (startPage > 2) {
                pageLinks += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
              }
            }

            for (let i = startPage; i <= endPage; i++) {
              pageLinks += `
                <li class="page-item ${i === currentPendentesPage ? 'active' : ''}">
                  <a class="page-link" href="#" data-page-pendentes="${i}">${i}</a>
                </li>
              `;
            }

            if (endPage < totalPendentesPages) {
              if (endPage < totalPendentesPages - 1) {
                pageLinks += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
              }
              pageLinks += `<li class="page-item"><a class="page-link" href="#" data-page-pendentes="${totalPendentesPages}">${totalPendentesPages}</a></li>`;
            }
            return pageLinks;
          })()}
          <li class="page-item ${currentPendentesPage === totalPendentesPages || totalPendentesPages === 0 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-action="next-pendentes">Próximo</a>
          </li>
        </ul>
      </nav>
      <div class="d-flex justify-content-center my-2">
        <label class="me-2 align-self-center">Itens por página:</label>
        <select class="form-select w-auto" id="pendentesPageSize">
          <option value="5" ${currentPendentesPageSize === 5 ? 'selected' : ''}>5</option>
          <option value="10" ${currentPendentesPageSize === 10 ? 'selected' : ''}>10</option>
          <option value="25" ${currentPendentesPageSize === 25 ? 'selected' : ''}>25</option>
          <option value="50" ${currentPendentesPageSize === 50 ? 'selected' : ''}>50</option>
          <option value="100" ${currentPendentesPageSize === 100 ? 'selected' : ''}>100</option>
        </select>
      </div>
    `;
    bindRetiradaActions();
    bindPendentesPagination(totalPendentesPages); // Passando totalPendentesPages

  } catch (error) {
    console.error("Erro em renderPendentesRetiradas:", error);
    showAlert(error.message || 'Ocorreu um erro inesperado.', 'danger');
  }
}

function bindRetiradaActions() {
  document.querySelectorAll('.btn-detalhes-retirada').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.dataset.id;
      const r = allRetiradas.find(x => x.retirada_id === id) || pendentesRetiradas.find(x => x.retirada_id === id);
      if (r) {
        fillModalDetalhes(r);
        new bootstrap.Modal(document.getElementById('modalVerDetalhesRetirada')).show();
      }
    };
  });

  document.querySelectorAll('.btn-autorizar-retirada-trigger').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.dataset.id;
      const r = pendentesRetiradas.find(x => x.retirada_id === id);
      if (r) {
        fillModalAutorizar(r);
        new bootstrap.Modal(document.getElementById('modalAutorizarRetirada')).show();
      }
    };
  });
}

function bindHistoricoPagination(totalPagesParam) {
  console.log('Bind Histórico - totalPagesParam:', totalPagesParam, 'currentHistoricoPage global:', currentHistoricoPage);
  const prevButton = document.querySelector('[data-action="prev-historico"]');
  const nextButton = document.querySelector('[data-action="next-historico"]');
  
  console.log('Bind Histórico - Prev Button encontrado:', prevButton);
  console.log('Bind Histórico - Next Button encontrado:', nextButton);

  if (prevButton) {
    prevButton.onclick = e => {
      e.preventDefault();
      console.log('Prev Histórico clicado. currentHistoricoPage:', currentHistoricoPage);
      if (currentHistoricoPage > 1) {
        renderHistoricoRetiradas(currentHistoricoPage - 1, currentHistoricoFilters, currentHistoricoPageSize);
      } else {
        console.log('Prev Histórico - Já na primeira página.');
      }
    };
  }

  if (nextButton) {
    nextButton.onclick = e => {
      e.preventDefault();
      console.log('Next Histórico clicado. currentHistoricoPage:', currentHistoricoPage, 'totalPagesParam:', totalPagesParam);
      if (currentHistoricoPage < totalPagesParam) {
        renderHistoricoRetiradas(currentHistoricoPage + 1, currentHistoricoFilters, currentHistoricoPageSize);
      } else {
        console.log('Next Histórico - Já na última página ou totalPagesParam inválido.');
      }
    };
  }

  document.querySelectorAll('[data-page-historico]').forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      const page = parseInt(e.target.dataset.pageHistorico);
      console.log('Link de página Histórico clicado:', page);
      renderHistoricoRetiradas(page, currentHistoricoFilters, currentHistoricoPageSize);
    };
  });

  const pageSizeSelect = document.getElementById('historicoPageSize');
  if (pageSizeSelect) {
    pageSizeSelect.onchange = e => {
      const newPageSize = parseInt(e.target.value);
      console.log('Page size Histórico alterado para:', newPageSize);
      renderHistoricoRetiradas(1, currentHistoricoFilters, newPageSize);
    };
  }
}

function bindPendentesPagination(totalPagesParam) {
  console.log('Bind Pendentes - totalPagesParam:', totalPagesParam, 'currentPendentesPage global:', currentPendentesPage);
  const prevButton = document.querySelector('[data-action="prev-pendentes"]');
  const nextButton = document.querySelector('[data-action="next-pendentes"]');

  console.log('Bind Pendentes - Prev Button encontrado:', prevButton);
  console.log('Bind Pendentes - Next Button encontrado:', nextButton);

  if (prevButton) {
    prevButton.onclick = e => {
      e.preventDefault();
      console.log('Prev Pendentes clicado. currentPendentesPage:', currentPendentesPage);
      if (currentPendentesPage > 1) {
        renderPendentesRetiradas(currentPendentesPage - 1, currentPendentesPageSize);
      } else {
         console.log('Prev Pendentes - Já na primeira página.');
      }
    };
  }

  if (nextButton) {
    nextButton.onclick = e => {
      e.preventDefault();
      console.log('Next Pendentes clicado. currentPendentesPage:', currentPendentesPage, 'totalPagesParam:', totalPagesParam);
      if (currentPendentesPage < totalPagesParam) {
        renderPendentesRetiradas(currentPendentesPage + 1, currentPendentesPageSize);
      } else {
        console.log('Next Pendentes - Já na última página ou totalPagesParam inválido.');
      }
    };
  }

  document.querySelectorAll('[data-page-pendentes]').forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      const page = parseInt(e.target.dataset.pagePendentes);
      console.log('Link de página Pendentes clicado:', page);
      renderPendentesRetiradas(page, currentPendentesPageSize);
    };
  });

  const pageSizeSelect = document.getElementById('pendentesPageSize');
  if (pageSizeSelect) {
    pageSizeSelect.onchange = e => {
      const newPageSize = parseInt(e.target.value);
      console.log('Page size Pendentes alterado para:', newPageSize);
      renderPendentesRetiradas(1, newPageSize);
    };
  }
}

function fillModalDetalhes(r) {
  document.getElementById('detalheRetiradaId').value = r.retirada_id;
  document.getElementById('detalheStatus').value = statusMap[r.status];
  document.getElementById('detalheSetor').value = r.setor_nome || '—';
  document.getElementById('detalheUsuario').value = r.usuario_nome || '—';
  document.getElementById('detalheSolicitadoPor').value = r.solicitado_localmente_por || '—';
  document.getElementById('detalheAutorizadoPor').value = r.autorizado_por || '—';
  document.getElementById('detalheData').value = new Date(r.data_solicitacao).toLocaleString('pt-BR');
  document.getElementById('detalheJustificativa').value = r.justificativa || '';
  document.getElementById('detalheStatusDesc').value = r.detalhe_status || '—';

  renderItemList('detalheItens', r.itens);
}

function fillModalAutorizar(r) {
  document.getElementById('autorizarRetiradaId').value = r.retirada_id;
  document.getElementById('autorizarSetor').value = r.setor_nome || '';
  document.getElementById('autorizarUsuario').value = r.usuario_nome;
  document.getElementById('autorizarJustificativa').value = r.justificativa || '';
  document.getElementById('autorizarData').value = new Date(r.data_solicitacao).toLocaleString('pt-BR');
  document.getElementById('autorizarDetalheStatus').value = '';

  renderItemList('autorizarItens', r.itens);

  document.getElementById('btn-confirmar-autorizar-retirada').dataset.id = r.retirada_id;
  document.getElementById('btn-confirmar-negar-retirada').dataset.id = r.retirada_id;
}

document.addEventListener('DOMContentLoaded', () => {
    const btnConfirmarAutorizar = document.getElementById('btn-confirmar-autorizar-retirada');
    if (btnConfirmarAutorizar) {
        btnConfirmarAutorizar.onclick = async e => {
            const id = +e.currentTarget.dataset.id;
            const detalhe = document.getElementById('autorizarDetalheStatus').value.trim();
            const token = localStorage.getItem('token');

            try {
                const resp = await fetch(`/api/almoxarifado/retiradas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: statusMapUpdate.AUTORIZADA,
                    detalhe_status: detalhe
                })
                });

                const modalElement = document.getElementById('modalAutorizarRetirada');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);

                if (resp.ok) {
                    showAlert('Retirada autorizada com sucesso!', 'success');
                    if (modalInstance) modalInstance.hide();

                    renderPendentesRetiradas(currentPendentesPage, currentPendentesPageSize);
                } else {
                    const err = await resp.json().catch(() => ({detail: 'Erro desconhecido'}));
                    showAlert(err?.detail || 'Erro ao autorizar retirada.', 'danger');
                }
            } catch(error) {
                console.error("Erro ao autorizar:", error);
                showAlert('Erro de conexão ao autorizar.', 'danger');
            }
        };
    }

    const btnConfirmarNegar = document.getElementById('btn-confirmar-negar-retirada');
    if (btnConfirmarNegar) {
        btnConfirmarNegar.onclick = async e => {
            const id = +e.currentTarget.dataset.id;
            const detalhe = document.getElementById('autorizarDetalheStatus').value.trim();
            const token = localStorage.getItem('token');

            if (!detalhe) {
                showAlert('O detalhe do status (justificativa da negação) é obrigatório ao negar.', 'warning');
                document.getElementById('autorizarDetalheStatus').focus();
                return;
            }

            try {
                const resp = await fetch(`/api/almoxarifado/retiradas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: statusMapUpdate.NEGADA,
                    detalhe_status: detalhe
                })
                });
                
                const modalElement = document.getElementById('modalAutorizarRetirada');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);

                if (resp.ok) {
                    showAlert('Retirada negada com sucesso.', 'success');
                    if (modalInstance) modalInstance.hide();
                    renderPendentesRetiradas(currentPendentesPage, currentPendentesPageSize);
                } else {
                    const err = await resp.json().catch(() => ({detail: 'Erro desconhecido'}));
                    showAlert(err?.detail || 'Erro ao negar retirada.', 'danger');
                }
            } catch(error) {
                console.error("Erro ao negar:", error);
                showAlert('Erro de conexão ao negar.', 'danger');
            }
        };
    }

    // Hooks para chamar as views
    document.getElementById('listar-retiradas-link')?.addEventListener('click', e => {
      e.preventDefault();
      renderHistoricoRetiradas(1, {}, currentHistoricoPageSize); // Mantem o page size atual ou default
    });
    document.getElementById('listar-retiradas-pendentes-link')?.addEventListener('click', e => {
      e.preventDefault();
      renderPendentesRetiradas(1, currentPendentesPageSize); // Mantem o page size atual ou default
    });
    document.getElementById('listar-retiradas-pendentes-quick')?.addEventListener('click', e => {
      e.preventDefault();
      renderPendentesRetiradas(1, currentPendentesPageSize); // Mantem o page size atual ou default
    });
});