import Bcrypt from 'bcrypt';
import Multer from 'multer';
import dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

// Configuração para manter arquivos apenas na memória (RAM)
const storageOptions = Multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

export class Utils {

    public MAX_TOKEN_TIME = (5 * 60 * 1000);
    public multer = Multer({storage: storageOptions, fileFilter: fileFilter});

    static generateVerificationToken(digit: number = 6) {
        const digits = '0123456789';
        let otp = '';
        for(let i = 0; i < digit; i++) {
            otp += Math.floor(Math.random() * 10);
        }
        // return parseInt(otp);
        return otp; 
    }

    // static encryptPassword(password) {
    //     return new Promise((resolve, reject) => {
    //         Bcrypt.hash(password, 10, (err, hash) => {
    //             if(err) {
    //                 reject(err);
    //             } else {
    //                 resolve(hash);
    //             }
    //         });
    //     });
    // }
    
    static encryptPassword(password: string): Promise<string> {
        if (!password || typeof password !== 'string') {
            return Promise.reject(new Error('A senha deve ser uma sequência de caracteres não vazia'));
        }

        return new Promise((resolve, reject) => {
            Bcrypt.hash(password, 10, (err, hash) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(hash);
                }
            });
        });
    }

    static comparePassword(data: { password: string, encrypt_password: string}): Promise<any> {
        return new Promise((resolve, reject) => {
            Bcrypt.compare(data.password, data.encrypt_password, (err, same) => {
                if(err) {
                    reject(err);
                } else if(!same) {
                    reject(new Error('Usuário e senha não coincidem'));
                } else {
                    resolve(true);
                }
            });
        });
    }

    static dotenvConfigs() {
        dotenv.config({ path: path.resolve(process.cwd(), '.env') });

        const env = process.env.NODE_ENV || 'development';
        const prefix = env === 'production' ? 'PROD_' : env === 'staging' ? 'STAGING_' : 'DEV_';

        // Lista de variáveis obrigatórias para o funcionamento mínimo do sistema
        const requiredVars = [
            `${prefix}DB_URI`,
            `${prefix}JWT_SECRET_KEY`,
            `${prefix}CLOUDINARY_CLOUD_NAME`,
            `${prefix}CLOUDINARY_API_KEY`,
            `${prefix}CLOUDINARY_API_SECRET`,
            `${prefix}MERCADOPAGO_ACCESS_TOKEN`,
            `${prefix}MERCADOPAGO_APP_ID`,
            `${prefix}MERCADOPAGO_APP_SECRET`,
            `${prefix}MERCADOPAGO_REDIRECT_URI`,
            `${prefix}MERCADOPAGO_WEBHOOK_SECRET`,
            `${prefix}NOTIFICATION_URI`,
            `${prefix}FRONTEND_URL`,
            `${prefix}OAUTH_ENCRYPTION_KEY`
        ];

        const missing = requiredVars.filter(v => !process.env[v]);

        // Se não houver a variável com prefixo, verifica se a variável base (sem prefixo) existe (padrão Heroku)
        const actuallyMissing = missing.filter(v => !process.env[v.replace(prefix, '')]);

        if (actuallyMissing.length > 0) {
            console.error('\n❌ [ERRO CRÍTICO DE AMBIENTE]:');
            console.error(`O servidor não pode iniciar no modo [${env.toUpperCase()}] pois as seguintes variáveis estão ausentes no .env:`);
            actuallyMissing.forEach(v => console.error(`   - ${v}`));
            console.error('\nVerifique seu arquivo .env ou as Config Vars do Heroku.\n');
            process.exit(1); // Encerra a aplicação imediatamente
        }



        console.log('✅ [ENV]: Variáveis de ambiente carregadas com sucesso.');
    }

    /**
     * Helper inteligente para buscar variáveis de ambiente respeitando o prefixo do modo atual.
     * Tenta buscar PROD_VAR, e se não encontrar, tenta VAR (padrão Heroku).
     */
    static getEnvVar(name: string): string | undefined {
        const env = process.env.NODE_ENV || 'development';
        const prefix = env === 'production' ? 'PROD_' : env === 'staging' ? 'STAGING_' : 'DEV_';
        const rawValue = process.env[`${prefix}${name}`] || process.env[name];

        return rawValue?.toString().trim().replace(/["']/g, '');
    }

    /**
     * Extrai o public_id de uma URL do Cloudinary para operações de deleção.
     * Ex: https://res.cloudinary.com/.../itemImages/nome-do-arquivo.jpg -> itemImages/nome-do-arquivo
     */
    static getPublicIdFromUrl(url: string): string | null {
        if (!url || !url.includes('cloudinary')) return null;
        
        try {
            const urlParts = url.split('/');
            // O Cloudinary geralmente organiza como: .../upload/v12345/pasta/arquivo.jpg
            const folder = urlParts[urlParts.length - 2];
            const fileWithExtension = urlParts[urlParts.length - 1];
            const fileName = fileWithExtension.split('.')[0];
            
            return `${folder}/${fileName}`;
        } catch (e) {
            console.error('❌ Erro ao extrair public_id da URL:', url);
            return null;
        }
    }

    /**
     * Encripta tokens sensíveis (Access/Refresh OAuth) antes de salvar no banco
     */
    static encryptOAuthToken(token: string): { encrypted: string, iv: string } {
        const algorithm = 'aes-256-cbc';

        // Usa o novo helper centralizado
        const encryptionKey = this.getEnvVar('OAUTH_ENCRYPTION_KEY')?.toString().trim().replace(/["']/g, '');
        
        if (!encryptionKey || encryptionKey.length !== 32) {
            throw new Error('OAUTH_ENCRYPTION_KEY deve ter exatamente 32 caracteres.');
        }

        const key = crypto.scryptSync(encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return { encrypted, iv: iv.toString('hex') };
    }

    /**
     * Decripta tokens OAuth para uso em chamadas de API aos provedores
     */
    static decryptOAuthToken(encryptedToken: string, ivHex: string): string {
        const algorithm = 'aes-256-cbc';

        const encryptionKey = this.getEnvVar('OAUTH_ENCRYPTION_KEY')?.toString().trim().replace(/["']/g, '');

        if (!encryptionKey || encryptionKey.length !== 32) {
            throw new Error('Erro de Configuração: A variável OAUTH_ENCRYPTION_KEY deve ter exatamente 32 caracteres para garantir a segurança dos tokens dos lojistas.');
        }

        const key = crypto.scryptSync(encryptionKey, 'salt', 32);
        const iv = Buffer.from(ivHex, 'hex');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Calcula a distância em Quilômetros entre dois pontos geográficos usando a Fórmula de Haversine.
     * Útil para validação fina de raios e entrega de banners/estabelecimentos.
    */
    static getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Raio da Terra em KM
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distância retornada em KM
    }

}