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

    PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100], 

    statusMap: { // converter de INT para STRING (para exibição)
        1: 'PENDENTE',
        2: 'AUTORIZADA',
        3: 'CONCLUÍDA', // Verifique se está presente
        4: 'NEGADA'
    },
    statusMapUpdate: { //  converter de STRING para INT (para envio à API)
        PENDENTE: 1, 
        AUTORIZADA: 2,
        CONCLUIDA: 3, // Verifique se está presente
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

    setAllRetiradas(data) {
        this.allRetiradas = data;
    },

    setPendentesRetiradas(data) {
        this.pendentesRetiradas = data;
    }
};

export default estadoGlobal;