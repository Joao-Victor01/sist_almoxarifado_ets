// frontend/static/js/pagination.js
import { fetchJson } from './api.js';

export let currentPage = 1;
export let pageSize = 10;

const pageSizeOptions = [5,10,25,50,100];

export async function carregarListaItens(page = currentPage, size = pageSize) {
  try {
    return await fetchJson(`/api/almoxarifado/itens/paginated?page=${page}&size=${size}`);
  } catch (err) {
    if (err.message === 'Unauthorized') {
      alert('Sessão expirada. Faça login novamente.');
      window.location.href = '/';
    }
    throw err;
  }
}

export function criarTabelaItens(items, total) {
  let html = `
    <h3 class="mb-3">Lista de Itens (Total: ${total})</h3>
    <div class="table-responsive"><table class="table table-striped">…</table></div>
  `;
  // … monta as linhas …
  return html;
}

export function criarControlesPaginacao(totalPages, total) {
  // … igual antes, gerando prev/next e selector …
}

export async function renderizarListaItens() {
  const data = await carregarListaItens();
  const { items, total_pages, total } = data;
  const main = document.getElementById('main-content');
  main.innerHTML = criarTabelaItens(items, total)
                 + criarControlesPaginacao(total_pages, total);
  bindPaginationControls(total_pages);
}

function bindPaginationControls(totalPages) {
  document.querySelector('[data-action="prev"]')?.addEventListener('click', e=>{
    e.preventDefault();
    if (currentPage>1) { currentPage--; renderizarListaItens(); }
  });
  document.querySelector('[data-action="next"]')?.addEventListener('click', e=>{
    e.preventDefault();
    if (currentPage<totalPages) { currentPage++; renderizarListaItens(); }
  });
  document.querySelectorAll('[data-page]').forEach(el=>{
    el.addEventListener('click', e=>{
      e.preventDefault();
      currentPage = +el.dataset.page;
      renderizarListaItens();
    });
  });
  document.getElementById('page-size-select')?.addEventListener('change', e=>{
    pageSize = +e.target.value; currentPage=1;
    renderizarListaItens();
  });
}

export function bindListarItens(selector) {
  document.querySelector(selector)?.addEventListener('click', e=>{
    e.preventDefault();
    currentPage = 1; pageSize = 10;
    renderizarListaItens();
  });
}
