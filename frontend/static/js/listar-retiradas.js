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

const statusMapUpdate = {
  AUTORIZADA: 2,
  NEGADA: 4
};

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

// Abre modal de detalhe de item
function openItemDetail(item, qtdRetirada) {
  document.getElementById('itemNome').textContent        = item.nome_item_original;
  document.getElementById('itemEstoque').textContent     = item.quantidade_item;
  document.getElementById('itemQtdRetirada').textContent = qtdRetirada;
  document.getElementById('itemEstoqueMin').textContent  = item.quantidade_minima_item;
  document.getElementById('itemValidade').textContent    = new Date(item.data_validade_item).toLocaleDateString('pt-BR');
  new bootstrap.Modal(document.getElementById('modalDetalheItem')).show();
}

// Monta a lista de itens dentro de um container
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

// Render histórico completo
async function renderHistoricoRetiradas() {
  allRetiradas = await fetchAllRetiradas();
  const { usuarioMap } = await buildLookupMaps(allRetiradas);

  allRetiradas.forEach(r => {
    r.usuario_nome = r.solicitado_localmente_por 
      ? r.solicitado_localmente_por 
      : usuarioMap[r.usuario_id];
  });

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
              <td>${r.usuario_nome}</td>
              <td>${new Date(r.data_solicitacao).toLocaleDateString()}</td>
              <td>${statusMap[r.status]}</td>
              <td>
                <button class="btn btn-sm btn-primary btn-detalhes-retirada" data-id="${r.retirada_id}">
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

  pendentesRetiradas.forEach(r => {
    r.usuario_nome = r.solicitado_localmente_por 
      ? r.solicitado_localmente_por 
      : usuarioMap[r.usuario_id];
    r.setor_nome = setorMap[r.setor_id];
  });

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
              <td>${r.usuario_nome}</td>
              <td>${r.setor_nome}</td>
              <td>${new Date(r.data_solicitacao).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-sm btn-success btn-autorizar-retirada" data-id="${r.retirada_id}">
                  Autorizar/Negar
                </button>
                <button class="btn btn-sm btn-info btn-detalhes-retirada" data-id="${r.retirada_id}">
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
  document.querySelectorAll('.btn-detalhes-retirada').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.dataset.id;
      const r = allRetiradas.find(x => x.retirada_id === id)
             || pendentesRetiradas.find(x => x.retirada_id === id);
      fillModalDetalhes(r);
      new bootstrap.Modal(document.getElementById('modalVerDetalhesRetirada')).show();
    };
  });

  document.querySelectorAll('.btn-autorizar-retirada').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.dataset.id;
      const r = pendentesRetiradas.find(x => x.retirada_id === id);
      fillModalAutorizar(r);
      new bootstrap.Modal(document.getElementById('modalAutorizarRetirada')).show();
    };
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


// 6) Handler dos botões Autorizar / Negar
document.getElementById('btn-autorizar-retirada').onclick = async e => {
  const id     = +e.currentTarget.dataset.id;
  const detalhe = document.getElementById('autorizarDetalheStatus').value.trim();
  const token  = localStorage.getItem('token');

  try {
    const resp = await fetch(`/api/almoxarifado/retiradas/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: statusMapUpdate.AUTORIZADA,
        detalhe_status: detalhe
      })
    });

    if (resp.ok) {
      showAlert('Retirada autorizada com sucesso!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('modalAutorizarRetirada')).hide();
      document.querySelectorAll('.modal-backdrop').forEach(el=>el.remove());
      renderPendentesRetiradas();
    } else {
      const err = await resp.json().catch(() => null);
      showAlert(err?.detail || 'Erro ao autorizar retirada.', 'danger');
    }
  } catch {
    showAlert('Erro de conexão ao autorizar.', 'danger');
  }
};

// Negar
document.getElementById('btn-negar-retirada').onclick = async e => {
  const id     = +e.currentTarget.dataset.id;
  const detalhe= document.getElementById('autorizarDetalheStatus').value.trim();
  const token  = localStorage.getItem('token');

  try {
    const resp = await fetch(`/api/almoxarifado/retiradas/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: statusMapUpdate.NEGADA,
        detalhe_status: detalhe
      })
    });

    if (resp.ok) {
      showAlert('Retirada negada com sucesso.', 'success');
      bootstrap.Modal.getInstance(document.getElementById('modalAutorizarRetirada')).hide();
      document.querySelectorAll('.modal-backdrop').forEach(el=>el.remove());
      renderPendentesRetiradas();
    } else {
      const err = await resp.json().catch(() => null);
      showAlert(err?.detail || 'Erro ao negar retirada.', 'danger');
    }
  } catch {
    showAlert('Erro de conexão ao negar.', 'danger');
  }
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
