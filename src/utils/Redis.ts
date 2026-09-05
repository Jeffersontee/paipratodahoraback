import { createClient } from 'redis';
import { getEnvironmentVariables } from '../environments/enviroment';

// Get environment variables, providing a default empty object for redis if it's undefined
const redisEnv = getEnvironmentVariables().redis;

// Prioriza a URL (padrão Heroku) se disponível, caso contrário usa campos individuais
const clientConfig: any = redisEnv?.url ? { url: redisEnv.url } : {
    username: redisEnv?.username,
    password: redisEnv?.password,
    socket: {
        host: redisEnv?.host,
        port: redisEnv?.port,
        // Redis Labs e Heroku exigem TLS. O objeto vazio {} ativa o TLS padrão.
        tls: (process.env.NODE_ENV === 'production' || redisEnv?.host?.includes('redislabs.com')) ? {
            rejectUnauthorized: false // Essencial para evitar erros de certificado em instâncias cloud
        } : undefined, // Usar undefined em vez de false resolve o conflito de tipos interno do Redis
        connectTimeout: 10000 // Falha após 10s se não conectar, evitando o H12 do Heroku (30s)
    }
};

const client = createClient(clientConfig);

// Tratador global de erro para evitar que ECONNRESET derrube o processo Node.js
client.on('error', (err) => {
    console.warn('⚠️ [REDIS CLIENT WARNING]:', err.message || err);
});

// Helper para isolamento de chaves entre múltiplos projetos e ambientes (Multi-tenant / Namespacing)
const getRedisPrefix = (): string => {
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production') return 'bravo:prod:';
    if (env === 'staging') return 'bravo:staging:';
    return 'bravo:dev:';
};

export class Redis {

    private static formatKey(key: string): string {
        const prefix = getRedisPrefix();
        return key.startsWith(prefix) ? key : `${prefix}${key}`;
    }

    static connectToRedis() {
        client.connect().then(() => {
            console.log(`✅ [REDIS]: Conectado com sucesso. Prefixo ativo: [${getRedisPrefix()}]`);
        })
        .catch(e => {
            console.error('❌ [REDIS ERROR]: Falha crítica na conexão:', e.message);
            // Não dar throw aqui para não travar o boot do servidor, mas logar o erro
        });
    }

    static async setValue(key: string, value: string, expires_at?: number) {
        try {
            const formattedKey = this.formatKey(key);
            let options: any = {};
            if(expires_at) {
                options = {
                    EX: expires_at
                };
            }
            if (!client.isOpen) {
                await client.connect();
            }
            await client.set(formattedKey, value, options);
            return;
        } catch(e) {
            console.error('❌ [REDIS SET ERROR]:', e);
            throw new Error('Falha de comunicação com o servidor de cache.');
        }
    }

    static async getValue(key: string) {
        try {
            const formattedKey = this.formatKey(key);
            if (!client.isOpen) {
                console.warn('⚠️ [REDIS]: Tentando reconectar...');
                await client.connect();
            }
            const value = await client.get(formattedKey);
            return value;
        } catch(e) {
            console.error('❌ [REDIS GET ERROR]:', e);
            // Se o Redis falhar, lançamos um erro de serviço indisponível, não de sessão expirada
            throw new Error('Serviço de autenticação temporariamente indisponível.');
        }
    }

    static async deleteKey(key: string) {
        try {
            const formattedKey = this.formatKey(key);
            if (!client.isOpen) {
                await client.connect();
            }
            await client.del(formattedKey);
        } catch(e) {
            console.error('❌ [REDIS DELETE ERROR]:', e);
            throw new Error('Erro ao encerrar sessão no servidor.');
        }
    }
}