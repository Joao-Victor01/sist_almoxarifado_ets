// frontend\static\js\estadoGlobal.js

const estadoGlobal = {
    allRetiradas: [],
    pendentesRetiradas: [],
    currentHistoricoPage: 1,
    totalHistoricoPages: 1,
    currentHistoricoPageSize: 10,
    currentHistoricoFilters: {},

    currentPendentesPage: 1,
    totalPendentesPages: 1,
    currentPendentesPageSize: 10,

    // NOVO: Estado para o histórico de retiradas do servidor
    currentMinhasRetiradasPage: 1,
    totalMinhasRetiradasPages: 1,
    currentMinhasRetiradasPageSize: 10,

    PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],

    statusMap: { // converter de INT para STRING (para exibição)
        1: 'PENDENTE',
        2: 'AUTORIZADA',
        3: 'CONCLUÍDA',
        4: 'NEGADA'
    },
    statusMapUpdate: {  // converter de STRING para INT (para envio à API)
        PENDENTE: 1,
        AUTORIZADA: 2,
        CONCLUIDA: 3,
        NEGADA: 4
    },

    // Métodos para atualizar o estado de forma controlada

    setHistoricoPagination(currentPage, totalPages, pageSize, filters) {
        this.currentHistoricoPage = currentPage;
        this.totalHistoricoPages = totalPages;
        this.currentHistoricoPageSize = pageSize;
        this.currentHistoricoFilters = { ...filters };
    },

    setPendentesPagination(currentPage, totalPages, pageSize) {
        this.currentPendentesPage = currentPage;
        this.totalPendentesPages = totalPages;
        this.currentPendentesPageSize = pageSize;
    },

    //  Método para atualizar o estado de paginação das minhas retiradas
    setMinhasRetiradasPagination(currentPage, totalPages, pageSize) {
        this.currentMinhasRetiradasPage = currentPage;
        this.totalMinhasRetiradasPages = totalPages;
        this.currentMinhasRetiradasPageSize = pageSize;
    },

    setAllRetiradas(data) {
        this.allRetiradas = data;
    },

    setPendentesRetiradas(data) {
        this.pendentesRetiradas = data;
    },

    //  Método para definir as minhas retiradas
    setMinhasRetiradas(data) {
        // Pode ser um array separado ou parte de allRetiradas se o filtro for sempre aplicado
        // Para simplificar e manter a separação, vou usar um novo array.
        this.minhasRetiradas = data;
    }
};

export default estadoGlobal;
