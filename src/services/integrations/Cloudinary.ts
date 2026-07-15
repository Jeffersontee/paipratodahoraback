import { v2 as cloudinary } from 'cloudinary';
import { getEnvironmentVariables } from '../../environments/enviroment';

export class Cloudinary {
    private static configure() {
        const env = getEnvironmentVariables().cloudinary;

        if (!env || !env.cloud_name || !env.api_key || !env.api_secret || env.cloud_name === 'Untitled') {
            throw new Error(
                'Configuração do Cloudinary inválida ou ausente no arquivo de ambiente (cloud_name, api_key, api_secret são obrigatórios).'
            );
        }

        cloudinary.config({
            cloud_name: env.cloud_name!, // Non-null assertion após a verificação
            api_key: env.api_key!, // Non-null assertion após a verificação
            api_secret: env.api_secret!, // Non-null assertion após a verificação
            secure: true
        });
    }

    static async uploadMedia(file: any, dest_path: string, filename?: string) {
        try {
            this.configure();

            let uploadPath = file;
            // Se for um arquivo vindo do Multer (MemoryStorage), converte o buffer para Data URI
            if (file && file.buffer) {
                uploadPath = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            }

            let result = await cloudinary.uploader.upload(uploadPath, {
                public_id: filename || Date.now() + '-' + Math.round(Math.random() * 1e9),
                resource_type: 'auto',
                folder: dest_path
            });

            return result.secure_url;
        } catch (e) {
            throw e;
        }
    }

    static async deleteMedia(public_id: string) {
        try {
            this.configure();
            const result = await cloudinary.uploader.destroy(public_id);
            return result;
        } catch (e) {
            throw e;
        }
    }
}
