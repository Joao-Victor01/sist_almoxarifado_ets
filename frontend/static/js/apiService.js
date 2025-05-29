// frontend/static/js/apiService.js

class ApiService {

    constructor (baseUrl = '/api/almoxarifado') {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('token');
        if (!this.token) {
            console.warn("Token de autenticação não encontrado no localStorage.");
        }
    }

    _getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    async _fetch(endpoint, options = { }){
        const url = `${this.baseUrl}${endpoint}`;
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this._getHeaders(),
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido na resposta da API.' }));
                throw new Error(errorData.detail || `Erro na API: ${response.status} ${response.statusText}`);
            }
            // Se a resposta for 204 No Content, response.json() falhará.
            // Verifique o status antes de tentar parsear como JSON.
            if (response.status === 204) {
                return {}; // Retorna um objeto vazio para 204 No Content
            }
            return response.json();
        } catch (error) {
            console.error(`Falha na requisição para ${url}`, error);
            throw error;
        }
    }

    async get (endpoint, params = {}) {
        const queryString = new URLSearchParams (params).toString();
        const urlWithParams = `${endpoint}${queryString ? `?${queryString}` : ''}`;
        return await this._fetch(urlWithParams, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this._fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this._fetch(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async patch(endpoint, data = {}) {
        return this._fetch(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // Métodos específicos (mantidos do seu código original)

    async getUsuarioById(id) {
        try {
            const user = await this.get(`/usuarios/${id}`);
            return user.nome_usuario;
        } catch (e) {
            return `#${id}`;
        }
    }

    async getSetorById(id) {
        try {
            const setor = await this.get(`/setores/${id}`);
            return setor.nome_setor;
        } catch (e) {
            return `#${id}`;
        }
    }

    async fetchAllRetiradas (page, pageSize, filters) {
        const params = { page, page_size: pageSize };
        const queryParamsForApi = {};

        if (filters.status !== null && filters.status !== undefined && filters.status !== '') {
            queryParamsForApi.status = filters.status;
        }
        if (filters.solicitante) {
            queryParamsForApi.solicitante = filters.solicitante;
        }
        if (filters.start_date) {
            queryParamsForApi.start_date = filters.start_date;
        }
        if (filters.end_date) {
            queryParamsForApi.end_date = filters.end_date;
        }


        const hasActiveFilters = Object.keys(queryParamsForApi).length > 0;
        const endpoint = hasActiveFilters ? '/retiradas/search' : '/retiradas/paginated';


        const responseData = await this.get(endpoint, { ...params, ...queryParamsForApi });

        return {
            current_page: responseData.page,
            total_pages: responseData.pages,
            total_items: responseData.total,
            items: responseData.items
        };
    }

    async fetchRetiradasPendentes (page, pageSize) {
        const responseData = await this.get(`/retiradas/pendentes/paginated`, { page, page_size: pageSize });
        return {
            current_page: responseData.page,
            total_pages: responseData.pages,
            total_items: responseData.total,
            items: responseData.items
        };
    }

    async updateRetiradaStatus(id, status, detail) {
        return this.put(`/retiradas/${id}`, { status, detalhe_status: detail });
    }

    async fetchAllItens() {
        return this.get('/itens');
    }

    async fetchAllSetores() {
        return this.get('/setores');
    }

    async solicitarRetirada (data) {
        return this.post('/retiradas/', data);
    }

    async searchItems(nome = null, categoria = null, page = 1, size = 10) {
        const params = { page, size };
        if (nome) {
            params.nome = nome;
        }
        if (categoria) {
            params.categoria = categoria;
        }
        return this.get('/itens/buscar', params);
    }

    async getItemById(itemId) {
        return this.get(`/itens/${itemId}`);
    }

    // NOVO: Obter contagem de alertas não visualizados
    async getUnviewedAlertsCount() {
        try {
            const response = await this.get('/alertas/unviewed-count');
            return response.count;
        } catch (error) {
            console.error('Erro ao buscar contagem de alertas não visualizados:', error);
            return 0;
        }
    }

    //  Marcar todos os alertas como visualizados
    async markAllAlertsAsViewed() {
        try {
            await this.patch('/alertas/mark-viewed');
        } catch (error) {
            console.error('Erro ao marcar alertas como visualizados:', error);
        }
    }
}

export const apiService = new ApiService();
