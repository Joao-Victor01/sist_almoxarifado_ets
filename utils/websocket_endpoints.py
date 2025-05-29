# utils\websocket_endpoints.py
from fastapi import WebSocket, WebSocketDisconnect, APIRouter

# O router será incluído na instância principal do FastAPI em main.py.
websocket_router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        # Remover a conexão de forma segura, mesmo que ela não esteja mais na lista
        try:
            self.active_connections.remove(websocket)
        except ValueError:
            pass # Conexão já removida ou não encontrada

    async def broadcast(self, message: dict):
        # Criar uma cópia da lista para evitar problemas se a lista for modificada durante o loop
        # (ex: uma conexão se desconecta enquanto estamos iterando)
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except RuntimeError as e:
                # Tratar erro se a conexão já estiver fechada ou inválida
                print(f"Erro ao enviar mensagem para WebSocket: {e}. Desconectando...")
                self.disconnect(connection)
            except WebSocketDisconnect:
                print("Conexão WebSocket já desconectada durante o broadcast.")
                self.disconnect(connection)
            except Exception as e:
                print(f"Erro inesperado no broadcast para WebSocket: {e}")
                self.disconnect(connection)


manager = ConnectionManager()

@websocket_router.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # O loop para manter a conexão WebSocket aberta.
        # pode ser um loop passivo ou pode ser usado para heartbeat/mensagens de controle.
        while True:
            # Manter a conexão viva.
            # Se não esperamos mensagens do cliente, ele simplesmente aguarda.
            await websocket.receive_text() # Ou websocket.receive_bytes()
    except WebSocketDisconnect:
        print("Cliente WebSocket desconectado.")
        manager.disconnect(websocket)
    except Exception as e:
        print(f"Erro inesperado no WebSocket: {e}")
        manager.disconnect(websocket)