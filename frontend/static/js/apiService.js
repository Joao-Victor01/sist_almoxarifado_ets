// frontend/static/js/apiService.js

class ApiService {
    constructor(baseUrl = '/api/almoxarifado') {
        this.baseUrl = baseUrl;
    }

    _getHeaders() {
        const token = localStorage.getItem('token'); // Obter o token mais recente
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
            ...options.headers // Mescla com quaisquer headers específicos da requisição
        };
        options.headers = requestHeaders; // Atribui os headers mesclados de volta às opções

        if (options.body instanceof FormData) {
            delete options.headers['Content-Type']; 
        } else if (!options.headers['Content-Type']) { 
            options.headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: options.headers // Use the prepared headers
            });

            if (!response.ok) {
                // Se a resposta for 204 No Content, não tente parsear JSON
                if (response.status === 204) {
                    return {}; // Retorna um objeto vazio para 204
                }
                const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido na resposta da API.' }));
                throw new Error(errorData.detail || `Erro na API: ${response.status} ${response.statusText}`);
            }

            // Se a resposta for 204 No Content, não tente parsear JSON
            if (response.status === 204) {
                return {};
            }

            return response.json();

        } catch (error) {
            console.error(`Falha na requisição para ${url}:`, error);
            throw error;
        }
    }

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

    // Métodos específicos

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

    async fetchAllRetiradas(page, pageSize, filters = {}) {
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

    async fetchRetiradasPendentes(page, pageSize) {
        const responseData = await this.get('/retiradas/pendentes/paginated', { page, page_size: pageSize });
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

    async solicitarRetirada(data) {
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

    async uploadBulkItems(file) {
        const formData = new FormData();
        formData.append('file', file);
        return this._fetch('/itens/upload-bulk/', {
            method: 'POST',
            body: formData,
        });
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

    //  Retorna o ID do setor do usuário também
    async getCurrentUserDetails(userId) {
        try {
            const user = await this.get(`/usuarios/${userId}`);
            const sectorName = await this.getSetorById(user.setor_id);
            return {
                name: user.nome_usuario,
                siape: user.siape_usuario,
                sectorName: sectorName,
                sectorId: user.setor_id // ADICIONADO: ID do setor do usuário
            };
        } catch (error) {
            console.error("Erro ao carregar detalhes do usuário ou setor:", error);
            return { name: 'Usuário', siape: 'N/A', sectorName: 'N/A', sectorId: null }; // Adicionado sectorId: null
        }
    }

    // MÉTODO: Soft delete de retiradas por período 
    async deleteRetiradasByPeriod(startDate, endDate) {
        // Envia as datas como query parameters para o endpoint DELETE 
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate }); 
        return this._fetch(`/retiradas/soft-delete-by-period?${params.toString()}`, {
            method: 'DELETE', 
        });
    }

    // MÉTODO PARA REDEFINIR SENHA SIMPLES
    async resetPasswordSimple(usernameOrEmail, newPassword) {
        return this.post('/usuarios/reset-password-simple', {
            username_or_email: usernameOrEmail,
            new_password: newPassword
        });
    }
}

export const apiService = new ApiService();
