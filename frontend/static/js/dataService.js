// frontend/static/js/dataService.js
import { apiService } from './apiService.js';
import estadoGlobal from './estadoGlobal.js';

class DataService {
    async buildLookupMaps(retiradas) {
        const userIds = [...new Set(retiradas.map(r => r.usuario_id).filter(id => id != null))];
        const setorIds = [...new Set(retiradas.map(r => r.setor_id).filter(id => id != null))];

        const [usuariosArr, setoresArr] = await Promise.all([
            Promise.all(userIds.map(id => apiService.getUsuarioById(id).then(name => [id, name]))),
            Promise.all(setorIds.map(id => apiService.getSetorById(id).then(name => [id, name])))
        ]);

        return {
            usuarioMap: Object.fromEntries(usuariosArr),
            setorMap: Object.fromEntries(setoresArr)
        };
    }

    async getProcessedRetiradas(fetchFunction, page, pageSize, filters = {}) {
        const data = await fetchFunction(page, pageSize, filters);
        const { usuarioMap, setorMap } = await this.buildLookupMaps(data.items);

        const processedItems = data.items.map(r => ({
            ...r,
            usuario_nome: r.solicitado_localmente_por || usuarioMap[r.usuario_id] || 'N/A',
            setor_nome: setorMap[r.setor_id] || 'N/A'
        }));

        return {
            ...data,
            items: processedItems
        };
    }
}

export const dataService = new DataService();