// frontend/static/js/uiService.js

import { formatDate, formatDateTime, getStatusText, showAlert, getUserTypeFromToken } from './utils.js';
import estadoGlobal from './estadoGlobal.js';

class UiService {
    constructor() {
        this.mainContent = document.getElementById('main-content');
        this.loadingSpinner = document.getElementById('loading-spinner');
    }

    renderPage(title, contentHtml) {
        if (this.mainContent) {
            this.mainContent.innerHTML = `<h3 class="mb-3">${title}</h3>${contentHtml}`;
        } else {
            console.error("Elemento 'main-content' não encontrado.");
        }
    }

    renderTable(headers, rows, options = {}) {
        const { tableId, noRecordsMessage = 'Nenhum registro encontrado.', rowMapper, actionsHtml = () => '' } = options;

        const tableContent =
            rows.length > 0 ? rows.map(item => `
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
                    </tr>
                </thead>
                <tbody>
                    ${tableContent}
                </tbody>
            </table>
        </div>
        `;
    }

    renderPagination(currentPage, totalPages, type, pageSizeSelectId, currentPageSize) {
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
            } else if (currentPage + 2 > totalPages) {
                startPage = totalPages - 4;
                endPage = totalPages;
            }
        }

        if (startPage > 1) {
            pageLinks += `<li class="page-item"><a class="page-link" href="#" data-page="${type}-1">1</a></li>`;
            if (startPage > 2) {
                pageLinks += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pageLinks += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${type}-${i}">${i}</a>
            </li>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageLinks += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            pageLinks += `<li class="page-item"><a class="page-link" href="#" data-page="${type}-${totalPages}">${totalPages}</a></li>`;
        }

        const pageSizeSelectOptions = estadoGlobal.PAGE_SIZE_OPTIONS.map(size =>
            `<option value="${size}" ${size === currentPageSize ? 'selected' : ''}>${size}</option>`
        ).join('');

        return `
        <nav aria-label="Page navigation" id="${type}-pagination-nav">
            <ul class="pagination justify-content-center">
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-action="${type}-prev">Anterior</a>
                </li>
                ${pageLinks}
                <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-action="${type}-next">Próximo</a>
                </li>
            </ul>
        </nav>
        <div class="d-flex justify-content-center my-2">
            <label class="me-2 align-self-center">Itens por página: </label>
            <select class="form-select w-auto" id="${pageSizeSelectId}" data-action="${type}-pagesize">
                ${pageSizeSelectOptions}
            </select>
        </div>
        `;
    }

    renderPageSizeSelect(id, currentPageSize) {
        const options = [5, 10, 25, 50, 100].map(size =>
            `<option value="${size}" ${currentPageSize === size ? 'selected' : ''}>${size}</option>`
        ).join('');

        return `
        <div class="d-flex justify-content-center my-2">
            <label class="me-2 align-self-center">Itens por página: </label>
            <select class="form-select w-auto" id="${id}">
                ${options}
            </select>
        </div>
        `;
    }

    // Abre o modal de detalhes do item, exibindo atributos padrão e controle de estoque apenas para tipo 2
    openItemDetail(item, qtdRetirada) {
        const userRole = getUserTypeFromToken();
        console.log(userRole);

        // Preenche campos comuns
        document.getElementById('itemNome').textContent = item.nome_item_original;
        document.getElementById('itemValidade').textContent = item.data_validade_item ? formatDate(item.data_validade_item) : '-';

        // Controle de exibição de estoque (somente para almoxarifado)
        const liItemEstoque = document.getElementById('liItemEstoque');
        const liItemEstoqueMin = document.getElementById('liItemEstoqueMin');
        const itemEstoqueElement = document.getElementById('itemEstoque');
        const itemEstoqueMinElement = document.getElementById('itemEstoqueMin');
        if (userRole === 2 || userRole == 3) {
            if (liItemEstoque) {
                liItemEstoque.style.display = 'block';
                if (itemEstoqueElement) itemEstoqueElement.textContent = item.quantidade_item;
            }
            if (liItemEstoqueMin) {
                liItemEstoqueMin.style.display = 'block';
                if (itemEstoqueMinElement) {
                    itemEstoqueMinElement.textContent =
                        item.quantidade_minima_item !== null ? item.quantidade_minima_item : 'N/D';
                }
            }
        } else {
            if (liItemEstoque) liItemEstoque.style.display = 'none';
            if (liItemEstoqueMin) liItemEstoqueMin.style.display = 'none';
        }

        // Controle do campo "Solicitado"
        const itemQtdRetiradaElement = document.getElementById('itemQtdRetirada');
        const itemQtdRetiradaLi = itemQtdRetiradaElement ? itemQtdRetiradaElement.closest('li') : null;
        if (qtdRetirada !== undefined && qtdRetirada !== null) {
            itemQtdRetiradaElement.textContent = qtdRetirada;
            if (itemQtdRetiradaLi) itemQtdRetiradaLi.style.display = 'block';
        } else {
            if (itemQtdRetiradaLi) itemQtdRetiradaLi.style.display = 'none';
        }

        this.getModalInstance('modalDetalheItem').show();
    }

    fillModalDetalhes(retirada) {
        document.getElementById('detalheRetiradaId').value = retirada.retirada_id;
        document.getElementById('detalheStatus').value = getStatusText(retirada.status);
        document.getElementById('detalheSetor').value = retirada.setor_nome || '-';
        document.getElementById('detalheUsuario').value = retirada.usuario_nome || '-';
        document.getElementById('detalheSolicitadoPor').value = retirada.solicitado_localmente_por || '-';
        document.getElementById('detalheAutorizadoPor').value = retirada.autorizado_por_nome || '-';
        document.getElementById('detalheData').value = formatDateTime(retirada.data_solicitacao);
        document.getElementById('detalheJustificativa').value = retirada.justificativa || '-';
        document.getElementById('detalheStatusDesc').value = retirada.detalhe_status || '-';

        // Passa somente itens; openItemDetail cuida da exibição baseada em userRole
        this.renderItemList('detalheItens', retirada.itens);
    }

    fillModalDetalhesItem(item) {
        if (!item) {
            console.error("Item inválido para preencher detalhes do modal.");
            return;
        }
        // Reaproveita openItemDetail para preencher e exibir modal
        this.openItemDetail(item, null);
    }

    renderItemList(containerId, items, isRestrictedView = false) {
        const cont = document.getElementById(containerId);
        if (!cont) {
            console.error(`Container com ID ${containerId} não encontrado.`);
            return;
        }
        cont.innerHTML = '';
        items.forEach(i => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'list-group-item list-group-item-action';
            btn.textContent = `${i.item.nome_item_original} Quantidade: ${i.quantidade_retirada}`;
            btn.onclick = () => this.openItemDetail(i.item, i.quantidade_retirada);
            cont.appendChild(btn);
        });
    }

    fillModalAutorizar(retirada) {
        document.getElementById('autorizarRetiradaId').value = retirada.retirada_id;
        document.getElementById('autorizarSetor').value = retirada.setor_nome || '-';
        document.getElementById('autorizarUsuario').value = retirada.usuario_nome || '-';
        document.getElementById('autorizarJustificativa').value = retirada.justificativa || '-';
        document.getElementById('autorizarData').value = formatDateTime(retirada.data_solicitacao);
        this.renderItemList('autorizarItens', retirada.itens);
        const btnConfirmarAutorizar = document.getElementById('btn-confirmar-autorizar-retirada');
        if (btnConfirmarAutorizar) btnConfirmarAutorizar.dataset.id = retirada.retirada_id;
        const btnConfirmarNegar = document.getElementById('btn-confirmar-negar-retirada');
        if (btnConfirmarNegar) btnConfirmarNegar.dataset.id = retirada.retirada_id;
    }

    fillModalConcluir(retirada) {
        document.getElementById('concluirRetiradaId').value = retirada.retirada_id;
        document.getElementById('concluirRetiradaDisplayId').textContent = retirada.retirada_id;
        document.getElementById('concluirDetalheStatus').value = retirada.detalhe_status || '';
    }

    getModalInstance(id) {
        const modalElement = document.getElementById(id);
        if (!modalElement) {
            console.error(`Elemento do modal com ID '${id}' não encontrado para getModalInstance.`);
            return null;
        }
        return bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    }

    showLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'block';
        }
    }

    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
        }
    }
}

export const uiService = new UiService();
