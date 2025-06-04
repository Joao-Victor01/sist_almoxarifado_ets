# utils/websocket_endpoints.py
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from typing import Dict, List, Optional # Importar Optional

websocket_router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Dicionário para mapear usuario_id para uma lista de WebSockets ativos
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Lista para conexões gerais (para alertas que não são específicos de usuário)
        self.general_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, user_id: int = None):
        await websocket.accept()
        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
            print(f"WebSocket conectado para o usuário {user_id}. Total de conexões para este usuário: {len(self.active_connections[user_id])}")
        else:
            self.general_connections.append(websocket)
            print(f"WebSocket conectado como conexão geral. Total: {len(self.general_connections)}")


    def disconnect(self, websocket: WebSocket, user_id: int = None):
        if user_id and user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id] # Remove a entrada se não houver mais conexões
                print(f"WebSocket desconectado para o usuário {user_id}.")
            except ValueError:
                pass # Conexão já removida ou não encontrada
        else:
            try:
                self.general_connections.remove(websocket)
                print("Conexão WebSocket geral desconectada.")
            except ValueError:
                pass # Conexão já removida ou não encontrada


    async def broadcast(self, message: dict):
        # Envia para conexões gerais (para alertas de estoque/validade)
        for connection in list(self.general_connections):
            try:
                await connection.send_json(message)
            except RuntimeError as e:
                print(f"Erro ao enviar mensagem para WebSocket geral: {e}. Desconectando...")
                self.general_connections.remove(connection)
            except WebSocketDisconnect:
                print("Conexão WebSocket geral já desconectada durante o broadcast.")
                self.general_connections.remove(connection)
            except Exception as e:
                print(f"Erro inesperado no broadcast para WebSocket geral: {e}")
                self.general_connections.remove(connection)

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except RuntimeError as e:
                    print(f"Erro ao enviar mensagem para WebSocket do usuário {user_id}: {e}. Desconectando...")
                    self.active_connections[user_id].remove(connection)
                except WebSocketDisconnect:
                    print(f"Conexão WebSocket do usuário {user_id} já desconectada.")
                    self.active_connections[user_id].remove(connection)
                except Exception as e:
                    print(f"Erro inesperado ao enviar para WebSocket do usuário {user_id}: {e}")
                    self.active_connections[user_id].remove(connection)
        else:
            print(f"Nenhuma conexão WebSocket ativa para o usuário {user_id}.")


manager = ConnectionManager() # Instancia o ConnectionManager globalmente

@websocket_router.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket): # Remover user_id da assinatura direta
    # O user_id será passado como um query parameter do frontend
    # Ex: ws://localhost:8082/api/almoxarifado/ws/alerts?user_id=123
    
    # NOVO: Obter user_id explicitamente dos query parameters
    user_id_str: Optional[str] = websocket.query_params.get("user_id")
    user_id: Optional[int] = None
    if user_id_str:
        try:
            user_id = int(user_id_str)
        except ValueError:
            print(f"Erro: user_id '{user_id_str}' não é um inteiro válido.")
            # Opcional: fechar a conexão ou lidar com o erro de outra forma
            await websocket.close(code=1003, reason="Invalid user_id format")
            return

    await manager.connect(websocket, user_id)
    try:
        while True:
            # Mantém a conexão viva. Se não esperamos mensagens do cliente, ele simplesmente aguarda.
            await websocket.receive_text() # Ou websocket.receive_bytes()
    except WebSocketDisconnect:
        print(f"Cliente WebSocket desconectado (user_id: {user_id}).")
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"Erro inesperado no WebSocket (user_id: {user_id}): {e}")
        manager.disconnect(websocket, user_id)
