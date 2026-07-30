import { Request, Response, NextFunction } from 'express';

export class AppConfigController {
    /**
     * Verifica se a versão do app instalado no celular do usuário é compatível
     * com a versão mínima exigida ou se existe uma atualização recomendada.
     */
    static async checkVersion(req: Request, res: Response, next: NextFunction) {
        try {
            const appVersion = req.query.version as string;
            const platform = (req.query.platform as string)?.toLowerCase();

            if (!appVersion || !platform) {
                req.errorStatus = 400;
                throw new Error('Parâmetros "version" e "platform" (android/ios) são obrigatórios.');
            }

            // Validação de formato: aceita X.Y ou X.Y.Z (ex: 7.0.0)
            const versionRegex = /^\d+\.\d+(\.\d+)?$/;
            if (!versionRegex.test(appVersion)) {
                req.errorStatus = 400;
                throw new Error('Formato de versão inválido. Use o padrão X.Y ou X.Y.Z');
            }

            // Configurações de versão
            // force_update: Versão mínima para o app continuar funcionando.
            // latest_version: Versão mais recente na loja (dispara aviso opcional).
            const CONFIG = {
                android: {
                    min: process.env.ANDROID_MIN_VERSION || '7.0.0',
                    latest: process.env.ANDROID_LATEST_VERSION || '7.0.0',
                    url: 'https://play.google.com/store/apps/details?id=br.com.livecodesystem.bravoinstalacoes'
                },
                ios: {
                    min: process.env.IOS_MIN_VERSION || '7.0.0',
                    latest: process.env.IOS_LATEST_VERSION || '7.0.0',
                    url: 'https://apps.apple.com/app/id644381234'
                }
            };

            const platformConfig = CONFIG[platform as keyof typeof CONFIG];
            if (!platformConfig) {
                req.errorStatus = 400;
                throw new Error('Plataforma inválida.');
            }

            // Helper para comparação de strings de versão (ex: '7.0.0' < '7.0.1')
            const isLower = (v1: string, v2: string) =>
                v1.localeCompare(v2, undefined, { numeric: true, sensitivity: 'base' }) < 0;

            const forceUpdate = isLower(appVersion, platformConfig.min);
            const canUpdate = isLower(appVersion, platformConfig.latest);
            const recommendUpdate = !forceUpdate && canUpdate;

            console.log(
                `[VersionCheck] Platform: ${platform} | App: ${appVersion} | Force: ${forceUpdate} | Recommend: ${recommendUpdate}`
            );

            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                Pragma: 'no-cache',
                Expires: '0'
            });

            return res.status(200).json({
                success: true,
                data: {
                    force_update: forceUpdate,
                    recommend_update: recommendUpdate,
                    latest_version: platformConfig.latest,
                    store_url: platformConfig.url,
                    url_android: CONFIG.android.url,
                    url_ios: CONFIG.ios.url,
                    message: forceUpdate
                        ? 'Esta versão não é mais suportada. Por favor, atualize para continuar.'
                        : 'Existe uma nova versão disponível com melhorias!'
                }
            });
        } catch (e: any) {
            next(e);
        }
    }
}
