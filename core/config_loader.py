import os

class ConfigLoader:
    _config = {}

    @classmethod
    def load_config(cls, file_path=".env"):
        """Carrega variáveis de um arquivo `.env` para a memória."""
        if not os.path.exists(file_path):
            print(f"[WARNING] Arquivo {file_path} não encontrado. Variáveis de ambiente devem ser configuradas manualmente.")
            return
        
        with open(file_path, "r") as file:
            for line in file:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue  
                key, value = line.split("=", 1)
                cls._config[key.strip()] = value.strip()
    
    @classmethod
    def get(cls, key, default=None, required=False):
        """Obtém um valor do arquivo de configuração, com opção de valor padrão e obrigatoriedade."""
        value = cls._config.get(key, os.getenv(key, default))
        if required and value is None:
            raise ValueError(f"Variável de ambiente obrigatória {key} não foi encontrada!")
        return value

# Carregar configurações na inicialização
ConfigLoader.load_config()
