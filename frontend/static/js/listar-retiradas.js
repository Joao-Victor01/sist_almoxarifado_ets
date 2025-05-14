// frontend/static/js/listar-retiradas.js

// Estado global
let allRetiradas = [];
let pendentesRetiradas = [];

const statusMap = {
  1: 'PENDENTE',
  2: 'AUTORIZADA',
  3: 'CONCLUÍDA',
  4: 'NEGADA'
};

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

// Busca na API
async function fetchAllRetiradas() {
  const token = localStorage.getItem('token');
  const resp = await fetch('/api/almoxarifado/retiradas', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!resp.ok) throw new Error('Falha ao carregar histórico');
  return resp.json();
}

async function fetchRetiradasPendentes() {
  const token = localStorage.getItem('token');
  const resp = await fetch('/api/almoxarifado/retiradas/pendentes', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!resp.ok) throw new Error('Falha ao carregar pendentes');
  return resp.json();
}

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

// Render histórico completo
async function renderHistoricoRetiradas() {
  // passa o resultado para o global
  allRetiradas = await fetchAllRetiradas();
  const { usuarioMap } = await buildLookupMaps(allRetiradas);

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <h3 class="mb-3">Histórico de Retiradas</h3>
    <div class="table-responsive">
      <table class="table table-bordered table-striped">
        <thead class="table-secondary">
          <tr>
            <th>ID</th><th>Usuário</th><th>Data</th><th>Status</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${allRetiradas.map(r => `
            <tr>
              <td>${r.retirada_id}</td>
              <td>${ r.solicitado_localmente_por
                      ? r.solicitado_localmente_por
                      : usuarioMap[r.usuario_id] }</td>
              <td>${new Date(r.data_solicitacao).toLocaleDateString()}</td>
              <td>${statusMap[r.status]}</td>                
              <td>
                <button class="btn btn-sm btn-primary btn-detalhes-retirada"
                        data-id="${r.retirada_id}">
                  Ver detalhes
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  bindRetiradaActions();
}

// Render pendentes
async function renderPendentesRetiradas() {
  pendentesRetiradas = await fetchRetiradasPendentes();
  const { usuarioMap, setorMap } = await buildLookupMaps(pendentesRetiradas);

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
          ${pendentesRetiradas.map(r => `
            <tr>
              <td>${r.retirada_id}</td>
              <td>${ r.solicitado_localmente_por
                      ? r.solicitado_localmente_por
                      : usuarioMap[r.usuario_id] }</td>
              <td>${setorMap[r.setor_id]}</td>
              <td>${new Date(r.data_solicitacao).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-sm btn-success btn-autorizar-retirada"
                        data-id="${r.retirada_id}">
                  Autorizar
                </button>
                <button class="btn btn-sm btn-info btn-detalhes-retirada"
                        data-id="${r.retirada_id}">
                  Ver detalhes
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  bindRetiradaActions();
}

// Bind dos botões (detalhes & autorizar)
function bindRetiradaActions() {
  // detalhes
  document.querySelectorAll('.btn-detalhes-retirada').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.dataset.id;
      const r = allRetiradas.find(x=>x.retirada_id===id)
             || pendentesRetiradas.find(x=>x.retirada_id===id);
      fillModalDetalhes(r);
      new bootstrap.Modal(
        document.getElementById('modalVerDetalhesRetirada')
      ).show();
    };
  });

  // autorizar
  document.querySelectorAll('.btn-autorizar-retirada').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.dataset.id;
      const r = pendentesRetiradas.find(x=>x.retirada_id===id);
      fillModalAutorizar(r);
      new bootstrap.Modal(
        document.getElementById('modalAutorizarRetirada')
      ).show();
    };
  });
}


// 4) Popula modal de detalhes
function fillModalDetalhes(r) {
  const dl = document.getElementById('detalhes-retirada-body');
  dl.innerHTML = `
    <dt class="col-sm-4">ID</dt><dd class="col-sm-8">${r.retirada_id}</dd>
    <dt class="col-sm-4">Usuário</dt><dd class="col-sm-8">${r.usuario_nome}</dd>
    <dt class="col-sm-4">Data</dt><dd class="col-sm-8">${new Date(r.data_solicitacao).toLocaleString()}</dd>
    <dt class="col-sm-4">Status</dt><dd class="col-sm-8">${r.status}</dd>
    <dt class="col-sm-4">Itens</dt>
    <dd class="col-sm-8">
      <ul>
        ${r.itens.map(i=>`<li>${i.nome_item} x${i.quantidade}</li>`).join('')}
      </ul>
    </dd>
    ${r.justificativa ? `<dt class="col-sm-4">Justificativa</dt><dd class="col-sm-8">${r.justificativa}</dd>` : ''}
  `;
}

// 5) Popula modal de autorizar
function fillModalAutorizar(r) {
  const dl = document.getElementById('autorizar-retirada-body');
  dl.innerHTML = `
    <dt class="col-sm-4">ID</dt><dd class="col-sm-8">${r.retirada_id}</dd>
    <dt class="col-sm-4">Usuário</dt><dd class="col-sm-8">${r.usuario_nome}</dd>
    <dt class="col-sm-4">Data</dt><dd class="col-sm-8">${new Date(r.data_solicitacao).toLocaleString()}</dd>
    <dt class="col-sm-4">Itens</dt>
    <dd class="col-sm-8">
      <ul>${r.itens.map(i=>`<li>${i.nome_item} x${i.quantidade}</li>`).join('')}</ul>
    </dd>
  `;
  // guarda id nos botões
  document.getElementById('btn-autorizar-retirada').dataset.id = r.retirada_id;
  document.getElementById('btn-negar-retirada').dataset.id     = r.retirada_id;
}

// 6) Handler dos botões Autorizar / Negar
document.getElementById('btn-autorizar-retirada').onclick = async e => {
  const id = +e.currentTarget.dataset.id;
  const justificativa = document.getElementById('justificativa').value.trim();
  const token = localStorage.getItem('token');
  await fetch(`/api/almoxarifado/retiradas/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type':'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status: 'AUTORIZADO', justificativa })
  });
  bootstrap.Modal.getInstance(document.getElementById('modalAutorizarRetirada')).hide();
  document.querySelectorAll('.modal-backdrop').forEach(el=>el.remove());
  renderPendentesRetiradas();
};

document.getElementById('btn-negar-retirada').onclick = async e => {
  const id = +e.currentTarget.dataset.id;
  const justificativa = document.getElementById('justificativa').value.trim();
  const token = localStorage.getItem('token');
  await fetch(`/api/almoxarifado/retiradas/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type':'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status: 'NEGADO', justificativa })
  });
  bootstrap.Modal.getInstance(document.getElementById('modalAutorizarRetirada')).hide();
  document.querySelectorAll('.modal-backdrop').forEach(el=>el.remove());
  renderPendentesRetiradas();
};

// 7) Hooks para chamar as views
document.getElementById('listar-retiradas-link')?.addEventListener('click', e => {
  e.preventDefault(); renderHistoricoRetiradas();
});
document.getElementById('listar-retiradas-pendentes-link')?.addEventListener('click', e => {
  e.preventDefault(); renderPendentesRetiradas();
});
document.getElementById('listar-retiradas-pendentes-quick')?.addEventListener('click', e => {
  e.preventDefault(); renderPendentesRetiradas();
});
