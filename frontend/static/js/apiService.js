// frontend/static/js/apiService.js

class ApiService {
    constructor(baseUrl = '/api/almoxarifado') {
        this.baseUrl = baseUrl;
    }

    // ========== MÉTODOS AUXILIARES INTERNOS ==========

    _getHeaders() {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn("Token de autenticação não encontrado no localStorage para a requisição.");
        }
        return headers;
    }

    async _fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const requestHeaders = {
            ...this._getHeaders(),
            ...options.headers
        };
        options.headers = requestHeaders;

        if (options.body instanceof FormData) {
            delete options.headers['Content-Type'];
        } else if (!options.headers['Content-Type']) {
            options.headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: options.headers
            });

            if (!response.ok) {
                if (response.status === 204) return {};
                
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido na resposta da API.' }));
                
                let errorMessage = 'Erro desconhecido na API.';
                // Verifica se o erro é um erro de validação do FastAPI (detail é uma lista de objetos)
                if (errorData && Array.isArray(errorData.detail) && errorData.detail.length > 0) {
                    errorMessage = errorData.detail.map(err => {
                        // Tenta extrair a localização e a mensagem do erro
                        const loc = err.loc ? err.loc.join('.') : 'unknown_location';
                        const msg = err.msg || 'Erro de validação';
                        return `${loc}: ${msg}`;
                    }).join('; ');
                } else if (errorData && errorData.detail) {
                    // Para erros que têm a propriedade 'detail' como uma string
                    errorMessage = errorData.detail;
                } else if (response.statusText) {
                    // Fallback para o statusText se não houver um 'detail' claro
                    errorMessage = `Erro na API: ${response.status} ${response.statusText}`;
                }

                throw new Error(errorMessage);
            }

            if (response.status === 204) return {};
            return response.json();

        } catch (error) {
            console.error(`Falha na requisição para ${url}:`, error);
            throw error;
        }
    }

    // ========== MÉTODOS HTTP GENÉRICOS ==========

    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
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

    async delete(endpoint) {
        return this._fetch(endpoint, {
            method: 'DELETE'
        });
    }

    // ========== USUÁRIOS ==========

    async getUsuarioById(id) {
        try {
            const user = await this.get(`/usuarios/${id}`);
            return user.nome_usuario;
        } catch (e) {
            return `#${id}`;
        }
    }

    async getCurrentUserDetails(userId) {
        try {
            const user = await this.get(`/usuarios/${userId}`);
            const sectorName = await this.getSetorById(user.setor_id);
            return {
                name: user.nome_usuario,
                siape: user.siape_usuario,
                sectorName: sectorName,
                sectorId: user.setor_id
            };
        } catch (error) {
            console.error("Erro ao carregar detalhes do usuário ou setor:", error);
            return { name: 'Usuário', siape: 'N/A', sectorName: 'N/A', sectorId: null };
        }
    }

    async searchUsers(query) {
        return this.get('/usuarios/search', { query });
    }

    async resetPasswordSimple(usernameOrEmail, newPassword) {
        return this.post('/usuarios/reset-password-simple', {
            username_or_email: usernameOrEmail,
            new_password: newPassword
        });
    }

    async checkUserForPasswordReset(usernameOrEmail) {
        const url = `${this.baseUrl}/usuarios/check-user-for-reset`;
        const headers = {
            'Content-Type': 'application/json',
            ...this._getHeaders()
        };
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ username_or_email: usernameOrEmail })
        });

        if (response.status === 200) return true;
        if (response.status === 404) return false;

        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = { detail: 'Erro desconhecido na resposta da API.' };
        }
        throw new Error(errorData.detail || `Erro na API: ${response.status} ${response.statusText}`);
    }

    // ========== SETORES ==========

    async getSetorById(id) {
        try {
            const setor = await this.get(`/setores/${id}`);
            return setor.nome_setor;
        } catch (e) {
            return `#${id}`;
        }
    }

    async fetchAllSetores() {
        return this.get('/setores');
    }

    // ========== ITENS ==========

    async fetchAllItens() {
        return this.get('/itens');
    }

    async getItemById(itemId) {
        return this.get(`/itens/${itemId}`);
    }

    async searchItems(nome = null, categoria = null, page = 1, size = 10) {
        const params = { page, size };
        if (nome) params.nome = nome;
        if (categoria) params.categoria = categoria;
        return this.get('/itens/buscar', params);
    }

    async uploadBulkItems(file) {
        const formData = new FormData();
        formData.append('file', file);
        return this._fetch('/itens/upload-bulk/', {
            method: 'POST',
            body: formData,
        });
    }

    // ========== RETIRADAS ==========

    async fetchAllRetiradas(page, pageSize, filters = {}) {
        const params = { page, page_size: pageSize };
        const queryParamsForApi = {};

        if (filters.status) queryParamsForApi.status = filters.status;
        if (filters.solicitante) queryParamsForApi.solicitante = filters.solicitante;
        if (filters.start_date) queryParamsForApi.start_date = filters.start_date;
        if (filters.end_date) queryParamsForApi.end_date = filters.end_date;

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

    async fetchRetiradasPendentes(page, pageSize) {
        const responseData = await this.get('/retiradas/pendentes/paginated', { page, page_size: pageSize });
        return {
            current_page: responseData.page,
            total_pages: responseData.pages,
            total_items: responseData.total,
            items: responseData.items
        };
    }

    async fetchUserRetiradasPaginated(page, pageSize) {
        const responseData = await this.get('/retiradas/minhas-retiradas/paginated', { page, page_size: pageSize });
        return {
            current_page: responseData.page,
            total_pages: responseData.pages,
            total_items: responseData.total,
            items: responseData.items
        };
    }

    async solicitarRetirada(data) {
        return this.post('/retiradas/', data);
    }

    async updateRetiradaStatus(id, status, detail) {
        return this.put(`/retiradas/${id}`, { status, detalhe_status: detail });
    }

    async deleteRetiradasByPeriod(startDate, endDate) {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
        return this._fetch(`/retiradas/soft-delete-by-period?${params.toString()}`, {
            method: 'DELETE',
        });
    }

    // ========== ALERTAS ==========

    async getUnviewedAlertsCount() {
        try {
            const response = await this.get('/alertas/unviewed-count');
            return response.count;
        } catch (error) {
            console.error('Erro ao buscar contagem de alertas não visualizados', error);
            return 0;
        }
    }

    async markAllAlertsAsViewed() {
        try {
            await this.patch('/alertas/mark-viewed');
        } catch (error) {
            console.error('Erro ao marcar alertas como visualizados', error);
            throw error;
        }
    }
}

export const apiService = new ApiService();
