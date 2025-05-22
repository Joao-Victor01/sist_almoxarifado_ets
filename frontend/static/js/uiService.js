// frontend/static/js/uiService.js
import { formatDate, formatDateTime, getStatusText, showAlert } from './utils.js';
import estadoGlobal from './estadoGlobal.js';

class UiService {
    constructor() {
        this.mainContent = document.getElementById('main-content');
    }

    renderPage(title, contentHtml) {
        if (this.mainContent) {
            this.mainContent.innerHTML = `<h3 class="mb-3">${title}</h3>${contentHtml}`;
        } else {
            console.error("Elemento 'main-content' não encontrado.");
        }
    }

    renderTable(headers, rows, options = {}) {
        const { tableId = '', noRecordsMessage = 'Nenhum registro encontrado.', rowMapper, actionsHtml = (item) => '' } = options;
        const tableContent = rows.length > 0 ? rows.map(item => `
            <tr>
                ${rowMapper(item).map(cell => `<td>${cell}</td>`).join('')}
                <td>${actionsHtml(item)}</td>
            </tr>
        `).join('') : `<tr><td colspan="${headers.length + 1}" class="text-center">${noRecordsMessage}</td></tr>`;

        return `
            <div class="table-responsive">
                <table class="table table-bordered table-striped" ${tableId ? `id="${tableId}"` : ''}>
                    <thead class="table-secondary">
                        <tr>
                            ${headers.map(header => `<th>${header}</th>`).join('')}
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableContent}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderPagination(currentPage, totalPages, type) {
        let pageLinks = '';
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (totalPages <= 5) {
            startPage = 1;
            endPage = totalPages;
        } else {
            if (currentPage <= 3) {
                startPage = 1;
                endPage = 5;
            } else if (currentPage + 2 >= totalPages) {
                startPage = totalPages - 4;
                endPage = totalPages;
            }
        }

        if (startPage > 1) {
            pageLinks += `<li class="page-item"><a class="page-link" href="#" data-page-${type}="1">1</a></li>`;
            if (startPage > 2) {
                pageLinks += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pageLinks += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page-${type}="${i}">${i}</a>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageLinks += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            pageLinks += `<li class="page-item"><a class="page-link" href="#" data-page-${type}="${totalPages}">${totalPages}</a></li>`;
        }

        return `
            <nav aria-label="Page navigation">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-action="prev-${type}">Anterior</a>
                    </li>
                    ${pageLinks}
                    <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-action="next-${type}">Próximo</a>
                    </li>
                </ul>
            </nav>
        `;
    }

    renderPageSizeSelect(id, currentPageSize) {
        const options = [5, 10, 25, 50, 100].map(size => `
            <option value="${size}" ${currentPageSize === size ? 'selected' : ''}>${size}</option>
        `).join('');
        return `
            <div class="d-flex justify-content-center my-2">
                <label class="me-2 align-self-center">Itens por página:</label>
                <select class="form-select w-auto" id="${id}">
                    ${options}
                </select>
            </div>
        `;
    }

    renderItemList(containerId, items) {
        const cont = document.getElementById(containerId);
        if (!cont) {
            console.error(`Container com ID '${containerId}' não encontrado.`);
            return;
        }
        cont.innerHTML = '';
        items.forEach(i => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'list-group-item list-group-item-action';
            btn.textContent = `${i.item.nome_item_original} — ${i.quantidade_retirada}`;
            btn.onclick = () => this.openItemDetail(i.item, i.quantidade_retirada);
            cont.appendChild(btn);
        });
    }

    openItemDetail(item, qtdRetirada) {
        document.getElementById('itemNome').textContent = item.nome_item_original;
        document.getElementById('itemEstoque').textContent = item.quantidade_item;
        document.getElementById('itemQtdRetirada').textContent = qtdRetirada;
        document.getElementById('itemEstoqueMin').textContent = item.quantidade_minima_item;
        document.getElementById('itemValidade').textContent = formatDate(item.data_validade_item);
        this.getModalInstance('modalDetalheItem').show();
    }

    fillModalDetalhes(retirada) {
        document.getElementById('detalheRetiradaId').value = retirada.retirada_id;
        document.getElementById('detalheStatus').value = getStatusText(retirada.status);
        document.getElementById('detalheSetor').value = retirada.setor_nome || '—';
        document.getElementById('detalheUsuario').value = retirada.usuario_nome || '—';
        document.getElementById('detalheSolicitadoPor').value = retirada.solicitado_localmente_por || '—';
        document.getElementById('detalheAutorizadoPor').value = retirada.autorizado_por || '—';
        document.getElementById('detalheData').value = formatDateTime(retirada.data_solicitacao);
        document.getElementById('detalheJustificativa').value = retirada.justificativa || '';
        document.getElementById('detalheStatusDesc').value = retirada.detalhe_status || '—';

        this.renderItemList('detalheItens', retirada.itens);
    }

    fillModalAutorizar(retirada) {
        // Use o operador de encadeamento opcional (?.) para evitar erros se o elemento for null
        document.getElementById('autorizarRetiradaId').value = retirada.retirada_id;
        document.getElementById('autorizarSetor').value = retirada.setor_nome || '';
        document.getElementById('autorizarUsuario').value = retirada.usuario_nome;
        document.getElementById('autorizarJustificativa').value = retirada.justificativa || '';
        document.getElementById('autorizarData').value = formatDateTime(retirada.data_solicitacao);
        document.getElementById('autorizarDetalheStatus').value = '';

        this.renderItemList('autorizarItens', retirada.itens);

        // AQUI: Os botões de confirmar/negar são estáticos. Apenas atualizamos o dataset.id.
        // Os event listeners são anexados uma única vez no main.js.
        const btnConfirmarAutorizar = document.getElementById('btn-confirmar-autorizar-retirada');
        if (btnConfirmarAutorizar) {
            btnConfirmarAutorizar.dataset.id = retirada.retirada_id;
        } else {
            console.warn("Elemento 'btn-confirmar-autorizar-retirada' não encontrado.");
        }

        const btnConfirmarNegar = document.getElementById('btn-confirmar-negar-retirada');
        if (btnConfirmarNegar) {
            btnConfirmarNegar.dataset.id = retirada.retirada_id;
        } else {
            console.warn("Elemento 'btn-confirmar-negar-retirada' não encontrado.");
        }
    }
}

export const uiService = new UiService();