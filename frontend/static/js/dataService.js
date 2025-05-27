// frontend/static/js/dataService.js
import { apiService } from './apiService.js';
import estadoGlobal from './estadoGlobal.js';

class DataService {
    async buildLookupMaps(retiradas) {
        const userIds = [...new Set(retiradas.map(r => r.usuario_id).filter(id => id != null))];
        // Coleta IDs de usuários que autorizaram também
        const adminIds = [...new Set(retiradas.map(r => r.autorizado_por).filter(id => id != null))];
        const allUserIds = [...new Set([...userIds, ...adminIds])]; // Combina e remove duplicatas

        const setorIds = [...new Set(retiradas.map(r => r.setor_id).filter(id => id != null))];

        const [usuariosArr, setoresArr] = await Promise.all([
            Promise.all(allUserIds.map(id => apiService.getUsuarioById(id).then(name => [id, name]))), // Busca por todos os IDs de usuários
            Promise.all(setorIds.map(id => apiService.getSetorById(id).then(name => [id, name])))
        ]);

        return {
            usuarioMap: Object.fromEntries(usuariosArr), // Este mapa agora contém todos os nomes de usuários (solicitantes e autorizadores)
            setorMap: Object.fromEntries(setoresArr)
        };
    }

    async getProcessedRetiradas(fetchFunction, page, pageSize, filters = {}) {
        const data = await fetchFunction(page, pageSize, filters);
        const { usuarioMap, setorMap } = await this.buildLookupMaps(data.items);

        const processedItems = data.items.map(r => ({
            ...r,
            usuario_nome: r.solicitado_localmente_por || usuarioMap[r.usuario_id] || 'N/A',
            setor_nome: setorMap[r.setor_id] || 'N/A',
            autorizado_por_nome: r.autorizado_por ? usuarioMap[r.autorizado_por] : 'N/A' // Adiciona o nome do autorizador
        }));

        return {
            ...data,
            items: processedItems
        };
    }
}

export const dataService = new DataService();