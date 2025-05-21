/* frontend/static/js/listar-retiradas.js */

// Estado global de paginação e filtros
let currentPage = 1;
let pageSize    = 10;
const pageSizeOptions = [5,10,25,50,100];
let filterStatus = '';
let filterSolicitante = '';

const statusMap = {
  1:'PENDENTE',
  2:'AUTORIZADA',
  3:'CONCLUÍDA',
  4:'NEGADA'
};

const statusMapUpdate = {
  AUTORIZADA:2, 
  NEGADA:4
};

function showAlert(msg, type='success') {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
  document.getElementById('main-content').prepend(wrapper);
}

// --------------- INICIO helpers de API ---------------
async function fetchRetiradas(path, params={}) {
  const token = localStorage.getItem('token');
  const qs = new URLSearchParams({
    page: currentPage,
    page_size: pageSize,
    ...params
  });
  const resp = await fetch(`/api/almoxarifado/retiradas${path}?${qs}`, {
    headers:{ 'Authorization':`Bearer ${token}` }
  });
  if(!resp.ok) throw new Error('Erro ao buscar retiradas');
  return resp.json();
}

async function fetchRetiradasPendentes(path, params={}) {
  const token = localStorage.getItem('token');
  const qs = new URLSearchParams({
    page: currentPage,
    page_size: pageSize,
    ...params
  });
  const resp = await fetch(`/api/almoxarifado/retiradas/pendentes/paginated${path}?${qs}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!resp.ok) throw new Error('Falha ao carregar retiradas pendentes');
  return resp.json();
}

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
// --------------- FIM helpers de API ---------------


// Monta lookup maps
async function buildLookupMaps(retiradas) {
  const userIds  = [...new Set(retiradas.map(r => r.usuario_id))];
  const setorIds = [...new Set(retiradas.map(r => r.setor_id))];

  const usuariosArr = await Promise.all(
    userIds.map(id => getUsuarioById(id).then(name => [id, name]))
  );
  const setoresArr = await Promise.all(
    setorIds.map(id => getSetorById(id).then(name => [id, name]))
  );

  return {
    usuarioMap: Object.fromEntries(usuariosArr),
    setorMap:   Object.fromEntries(setoresArr)
  };
}

// Abre modal de detalhe de item
function openItemDetail(item, qtdRetirada) {
  document.getElementById('itemNome').textContent        = item.nome_item_original;
  document.getElementById('itemEstoque').textContent     = item.quantidade_item;
  document.getElementById('itemQtdRetirada').textContent = qtdRetirada;
  document.getElementById('itemEstoqueMin').textContent  = item.quantidade_minima_item;
  document.getElementById('itemValidade').textContent    = new Date(item.data_validade_item).toLocaleDateString('pt-BR');
  new bootstrap.Modal(document.getElementById('modalDetalheItem')).show();
}

// ----- render completo com paginação -----
async function renderHistoricoRetiradas() {
  try {
    // filtros
    const params = {};
    if(filterStatus) params.status = filterStatus;
    if(filterSolicitante) params.solicitante = filterSolicitante;

    // busca paginada
    const data = await fetchRetiradas('/paginated', params);
    let arr = data.items;
    // carrega nomes
    const {usuarioMap} = await buildLookupMaps(arr);
    arr.forEach(r=> {
      r.usuario_nome = r.solicitado_localmente_por || usuarioMap[r.usuario_id];
    });

    // monta HTML
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <h3 class="mb-3">Histórico de Retiradas</h3>
      ${renderFiltros()}
      ${renderTable(arr, false)}
      ${renderPagination(data.pages)}
    `;
    bindTableActions();
    bindFiltros(renderHistoricoRetiradas);
    bindPagination(renderHistoricoRetiradas);
  } catch(e){
    showAlert(e.message,'danger');
  }
}

async function renderPendentesRetiradas() {
  try {
    const params = {};
    if(filterStatus) params.status = filterStatus;
    if(filterSolicitante) params.solicitante = filterSolicitante;

    const data = await fetchRetiradas('/search', params); 
    // Filtra pendentes localmente (ou criar /pendentes/paginated)
    let arr = data.filter(r=>r.status===1);
    const {usuarioMap,setorMap} = await buildLookupMaps(arr);
    arr.forEach(r=> {
      r.usuario_nome = r.solicitado_localmente_por || usuarioMap[r.usuario_id];
      r.setor_nome   = setorMap[r.setor_id];
    });
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <h3 class="mb-3">Retiradas Pendentes</h3>
      ${renderFiltros()}
      ${renderTable(arr, true)}
      ${renderPagination(Math.ceil(arr.length/pageSize))}
    `;
    bindTableActions();
    bindFiltros(renderPendentesRetiradas);
    bindPagination(renderPendentesRetiradas);
  } catch(e){
    showAlert(e.message,'danger');
  }
}

// monta barra de filtros
function renderFiltros(){
  return `
    <div class="row mb-3">
      <div class="col-md-2">
        <select id="f-status" class="form-select form-select-sm">
          <option value="">Todos status</option>
          ${Object.entries(statusMap)
             .map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
        </select>
      </div>
      <div class="col-md-4">
        <input type="text" id="f-solicitante" class="form-control form-control-sm"
               placeholder="Solicitante">
      </div>
      <div class="col-md-6 d-flex">
        <button id="btn-search" class="btn btn-primary btn-sm me-2">Buscar</button>
        <button id="btn-clear"  class="btn btn-secondary btn-sm">Limpar</button>
      </div>
    </div>`;
}

// monta a tabela — pendentes adiciona coluna Setor
function renderTable(arr, isPendentes){
  return `
    <div class="table-responsive">
      <table class="table table-bordered table-striped">
        <thead class="table-secondary">
          <tr>
            <th>ID</th>
            <th>Usuário</th>
            ${isPendentes?'<th>Setor</th>':''}
            <th>Data</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${arr.map(r=>`
          <tr>
            <td>${r.retirada_id}</td>
            <td>${r.usuario_nome}</td>
            ${isPendentes?`<td>${r.setor_nome}</td>`:''}
            <td>${new Date(r.data_solicitacao).toLocaleDateString()}</td>
            <td>${statusMap[r.status]}</td>
            <td>
              ${isPendentes?`
                <button class="btn btn-sm btn-success btn-autorizar-retirada" data-id="${r.retirada_id}">
                  Autorizar/Negar
                </button>`:''}
              <button class="btn btn-sm btn-info btn-detalhes-retirada" data-id="${r.retirada_id}">
                Ver detalhes
              </button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// monta paginação simples
function renderPagination(totalPages){
  let html = `<nav><ul class="pagination">`;
  html += `<li class="page-item ${currentPage===1?'disabled':''}">
    <a class="page-link" href="#" data-action="prev">«</a></li>`;
  for(let p=1;p<=totalPages;p++){
    html += `<li class="page-item ${p===currentPage?'active':''}">
      <a class="page-link" href="#" data-page="${p}">${p}</a></li>`;
  }
  html += `<li class="page-item ${currentPage>=totalPages?'disabled':''}">
    <a class="page-link" href="#" data-action="next">»</a></li>`;
  html += `</ul></nav>`;
  html += `<div class="d-flex align-items-center">
    <label class="me-2">Por página:</label>
    <select id="page-size" class="form-select form-select-sm w-auto">
      ${pageSizeOptions.map(o=>`<option value="${o}" ${o===pageSize?'selected':''}>${o}</option>`).join('')}
    </select>
  </div>`;
  return html;
}

// bind dos filtros
function bindFiltros(cb){
  document.getElementById('btn-search').onclick = e=>{
    e.preventDefault();
    filterStatus      = document.getElementById('f-status').value;
    filterSolicitante = document.getElementById('f-solicitante').value.trim();
    currentPage = 1;
    cb();
  };
  document.getElementById('btn-clear').onclick = e=>{
    e.preventDefault();
    filterStatus = filterSolicitante = '';
    currentPage = 1; pageSize=10;
    cb();
  };
}

// bind paginação
function bindPagination(cb){
  document.querySelector('[data-action="prev"]').onclick = e=>{
    e.preventDefault();
    if(currentPage>1){ currentPage--; cb(); }
  };
  document.querySelector('[data-action="next"]').onclick = e=>{
    e.preventDefault();
    currentPage++; cb();
  };
  document.querySelectorAll('[data-page]').forEach(el=>{
    el.onclick = e=>{
      e.preventDefault();
      currentPage = +el.dataset.page; cb();
    };
  });
  document.getElementById('page-size').onchange = e=>{
    pageSize = +e.target.value; currentPage=1; cb();
  };
}

// bind detalhes e autorizar
function bindRetiradaActions(){
  document.querySelectorAll('.btn-detalhes-retirada').forEach(btn=>{
    btn.onclick = ()=>{
      const id = +btn.dataset.id;
      const r = allRetiradas.find(x=>x.retirada_id===id) ||
                pendentesRetiradas.find(x=>x.retirada_id===id);
      fillModalDetalhes(r);
      new bootstrap.Modal(document.getElementById('modalVerDetalhesRetirada')).show();
    };
  });
  document.querySelectorAll('.btn-autorizar-retirada').forEach(btn=>{
    btn.onclick = ()=>{/* idêntico ao seu handler atual */}
  });
}

// Popula modal de detalhes
function fillModalDetalhes(r) {
  document.getElementById('detalheRetiradaId').value     = r.retirada_id;
  document.getElementById('detalheStatus').value        = statusMap[r.status];
  document.getElementById('detalheSetor').value         = r.setor_id || '';
  document.getElementById('detalheUsuario').value       = r.usuario_id;
  document.getElementById('detalheSolicitadoPor').value = r.solicitado_localmente_por || '—';
  document.getElementById('detalheAutorizadoPor').value = r.autorizado_por || '—';
  document.getElementById('detalheData').value          = new Date(r.data_solicitacao).toLocaleString('pt-BR');
  document.getElementById('detalheJustificativa').value = r.justificativa || '';
  document.getElementById('detalheStatusDesc').value    = r.detalhe_status || '—';

  // novos itens
  renderItemList('detalheItens', r.itens);
}

// Popula modal de autorizar
function fillModalAutorizar(r) {
  document.getElementById('autorizarRetiradaId').value     = r.retirada_id;
  document.getElementById('autorizarSetor').value         = r.setor_nome || '';
  document.getElementById('autorizarUsuario').value       = r.usuario_nome;
  document.getElementById('autorizarJustificativa').value = r.justificativa || '';
  document.getElementById('autorizarData').value          = new Date(r.data_solicitacao).toLocaleString('pt-BR');
  document.getElementById('autorizarDetalheStatus').value = '';

  renderItemList('autorizarItens', r.itens);

  document.getElementById('btn-autorizar-retirada').dataset.id = r.retirada_id;
  document.getElementById('btn-negar-retirada').dataset.id     = r.retirada_id;
}

// hooks de navegação
document.getElementById('listar-retiradas-link')
  .addEventListener('click', e=>{
    e.preventDefault();
    renderHistoricoRetiradas();
});
document.getElementById('listar-retiradas-pendentes-link')
  .addEventListener('click', e=>{
    e.preventDefault();
    renderPendentesRetiradas();
});
document.getElementById('listar-retiradas-pendentes-quick')
  .addEventListener('click', e=>{
    e.preventDefault();
    renderPendentesRetiradas();
});
