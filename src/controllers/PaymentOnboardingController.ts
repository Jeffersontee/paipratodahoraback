import { Request, Response, NextFunction } from 'express';
//import { MercadoPagoConfig, OAuth } from 'mercadopago'; // Keep MercadoPagoConfig for type, but use MercadoPago.getPlatformClient()
//import { MercadoPago } from '../services/integrations/MercadoPago'; // Import MercadoPago class
import Company from '../models/company.model';
import { Utils } from '../utils/Utils';
import { NotificationService } from '../services/NotificationService';
import User from '../models/user.model';
//import PaymentHistory from '../models/PaymentHistory';
import mongoose from 'mongoose';

export class PaymentOnboardingController {
    /**
     * Gera a URL de autorização do Mercado Pago para o lojista iniciar o fluxo OAuth.
     * Esta URL redireciona o lojista para o ambiente do Mercado Pago para autorizar a aplicação.
     */
    static async getMPAuthorizationUrl(req: Request, res: Response, next: NextFunction) {
        try {
            // ANTI-CACHE: Garante que o navegador não use uma URL antiga/quebrada (Status 304 nos logs)
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                Pragma: 'no-cache',
                Expires: '0'
            });

            const user = req.user;
            let state = '';

            if (user.type === 'super_admin') {
                state = 'PLATFORM'; // Identificador único para a conta da plataforma
            } else if (user.company_id) {
                state = String(user.company_id);
            } else {
                req.errorStatus = 400;
                throw new Error('Usuário não possui um estabelecimento vinculado para iniciar o onboarding.');
            }

            // Sanitização robusta: remove espaços e aspas das variáveis do Heroku
            const appId = Utils.getEnvVar('MERCADOPAGO_APP_ID')?.toString().trim().replace(/["']/g, '');
            const redirectUri = Utils.getEnvVar('MERCADOPAGO_REDIRECT_URI')
                ?.toString()
                .trim()
                .replace(/["']/g, '')
                .replace(/\/$/, '');

            console.log(`🔍 [OAuth Debug] Contexto: ${state} | ID: ${appId} | URI: ${redirectUri}`);

            if (appId && isNaN(Number(appId))) {
                console.warn(
                    `⚠️ [OAuth Warning]: O App ID do Mercado Pago [${appId}] não parece numérico. Verifique se não colou o Access Token em seu lugar.`
                );
            }

            // Validação de segurança: Mercado Pago exige HTTPS para Redirect URIs externas
            if (redirectUri && redirectUri.startsWith('http://') && !redirectUri.includes('localhost')) {
                console.error(`❌ [OAuth Error]: A Redirect URI para Staging/Prod DEVE usar HTTPS: ${redirectUri}`);
            }

            if (!appId || !redirectUri) {
                req.errorStatus = 500;
                throw new Error(
                    'Configuração de OAuth do Mercado Pago incompleta no servidor (App ID ou Redirect URI ausentes).'
                );
            }

            // Alerta preventivo: Se o Marketplace usar token APP_USR em Staging, o lojista receberá token de produção
            const platformToken = Utils.getEnvVar('MERCADOPAGO_ACCESS_TOKEN');
            if (platformToken && !platformToken.startsWith('TEST-') && process.env.NODE_ENV !== 'production') {
                console.warn(
                    '⚠️ [OAuth Staging Alert]: O Marketplace está configurado com credenciais de PRODUÇÃO no Heroku. Estabelecimentos conectados aqui receberão tokens APP_USR- e o erro 403 persistirá nos testes.'
                );
            }

            // Montagem da URL conforme especificação do Mercado Pago:
            // - client_id: Seu APP_ID configurado no painel de desenvolvedor
            // - response_type=code: Solicita o código de autorização que trocaremos pelo Access Token
            // - platform_id=MP: Identificador obrigatório para integrações Mercado Pago
            // - state: Enviamos o ID da adega para recuperar o contexto no endpoint de callback
            // - redirect_uri: A URL da sua aplicação (back-end) que processará o retorno do código
            const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${appId}&response_type=code&platform_id=MP&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

            console.log('🔗 [OAuth] URL de Autorização Gerada com sucesso.');

            return res.status(200).json({ url: authUrl });
        } catch (e) {
            next(e);
        }
    }

    /**
     * Endpoint de Callback (Redirect URI).
     * Recebe o 'code' do Mercado Pago e o troca por um Access Token permanente.
     */
    static async mpCallback(req: Request, res: Response, next: NextFunction) {
        try {
            const { code, state, error, error_description } = req.query;

            console.log('📥 [MP OAUTH CALLBACK QUERY]:', req.query);

            if (error) {
                console.error(`❌ [MP OAUTH ERROR]: ${error} - ${error_description}`);
                req.errorStatus = 400;
                throw new Error(`Erro na autorização do Mercado Pago: ${error_description || error}`);
            }

            if (!code || !state) {
                req.errorStatus = 400;
                throw new Error('Parâmetros de callback inválidos (code ou state ausentes).');
            }

            // Sanitização obrigatória para evitar 'invalid_client' por caracteres ocultos
            const appId = Utils.getEnvVar('MERCADOPAGO_APP_ID')?.toString().trim().replace(/["']/g, '');
            const appSecret = Utils.getEnvVar('MERCADOPAGO_APP_SECRET')?.toString().trim().replace(/["']/g, '');
            const redirectUri = Utils.getEnvVar('MERCADOPAGO_REDIRECT_URI')
                ?.toString()
                .trim()
                .replace(/["']/g, '')
                .replace(/\/$/, '');

            // Validação de segurança: Impede a chamada se as credenciais estiverem ausentes
            if (!appId || !appSecret) {
                console.error(
                    `❌ [OAuth Config Error]: O Client Secret é OBRIGATÓRIO pelo protocolo OAuth do Mercado Pago. ID: ${appId ? 'OK' : 'MISSING'} | Secret: ${appSecret ? 'OK' : 'MISSING'}`
                );
                req.errorStatus = 500;
                throw new Error(
                    'Configuração de credenciais (App ID ou Client Secret) ausente no servidor. O OAuth não funciona sem o Secret.'
                );
            }

            // Alerta: O Secret do Mercado Pago nunca é puramente numérico (isso seria o User ID)
            if (!appSecret || /^\d+$/.test(appSecret)) {
                // Verifica se é vazio ou contém apenas dígitos
                console.error(
                    `❌ [OAuth Error]: O APP_SECRET [${appSecret}] parece ser o App ID (numérico) ou está vazio, e não o Client Secret (alfanumérico).`
                );
                req.errorStatus = 400;
                throw new Error(
                    'O segredo da aplicação (Client Secret) está incorreto ou ausente. Verifique se você colou o valor alfanumérico correto do painel do Mercado Pago.'
                );
            }

            // DEBUG DE ENGENHARIA: Verifica qual chave o Heroku está resolvendo
            const envMode = process.env.NODE_ENV || 'development';
            const prefix = envMode === 'production' ? 'PROD_' : envMode === 'staging' ? 'STAGING_' : 'DEV_';
            const expectedKey = `${prefix}MERCADOPAGO_ACCESS_TOKEN`;

            // Verifica se está pegando a variável com prefixo ou a global
            const platformToken = process.env[expectedKey] || process.env['MERCADOPAGO_ACCESS_TOKEN'];
            const source = process.env[expectedKey] ? expectedKey : 'GLOBAL_FALLBACK';
            const isSandbox = platformToken?.startsWith('TEST-');

            console.log(`📡 [OAuth Debug]: Modo: ${envMode} | Origem: ${source} | Chave: ${expectedKey}`);
            console.log(
                `📡 [OAuth] Marketplace identificada: ${isSandbox ? 'MODO TESTE (CORRETO PARA STAGING)' : 'MODO PRODUÇÃO (ERRO PARA STAGING)'}`
            );
            console.log(`🔑 [Platform Token]: ${platformToken?.substring(0, 8)}... (Deveria ser TEST- em Staging)`);

            if (!isSandbox && process.env.NODE_ENV !== 'production') {
                console.error(
                    '❌ [CRITICAL ENV MISMATCH]: Você está em STAGING mas o Token do Marketplace é de PRODUÇÃO (APP_USR). O Mercado Pago SEMPRE emitirá tokens de produção para os lojistas neste cenário.'
                );
                req.errorStatus = 500;
                throw new Error(
                    'Ambiente de Staging configurado incorretamente com credenciais de produção do Marketplace.'
                );
            }

            // 1. Instancia o cliente OAuth
            //const client = MercadoPago.getPlatformClient(); // Usa o cliente da plataforma (ambiente-aware)
            //const oauth = new OAuth(client);

            // 2. Troca o código pelas credenciais do lojista
            // const credentials = await oauth.create({
            //     body: {
            //         client_secret: appSecret || '',
            //         client_id: appId || '',
            //         code: String(code),
            //         redirect_uri: redirectUri || ''
            //     }
            // });

            // // Validação de segurança: Garante que os tokens existam antes de prosseguir com a criptografia
            // if (!credentials.access_token || !credentials.refresh_token) {
            //     req.errorStatus = 502;
            //     throw new Error('Falha crítica: O Mercado Pago não retornou os tokens de acesso necessários.');
            // }

            // SEGURANÇA: Impede que tokens de PRODUÇÃO sejam salvos em ambientes de STAGING/DEV
            // const tokenPrefix = credentials.access_token.substring(0, 4).toUpperCase();
            // console.log(
            //     `📦 [OAuth] Tokens recebidos para MP User ID: ${credentials.user_id} | Prefixo: ${tokenPrefix}`
            // );

            const isSystemProduction = process.env.NODE_ENV === 'production';
            const allowProdInStaging = Utils.getEnvVar('ALLOW_PROD_TOKEN_IN_STAGING') === 'true';

            // if (!isSystemProduction && tokenPrefix === 'APP_' && !allowProdInStaging) {
            //     console.error(
            //         `❌ [OAuth Error]: Mercado Pago retornou um token de PRODUÇÃO (${tokenPrefix}) em ambiente de ${envMode}.`
            //     );
            //     req.errorStatus = 400;
            //     throw new Error(
            //         'Não é permitido vincular contas de PRODUÇÃO em ambiente de STAGING. Se esta aplicação já passou pelo "Go Live", defina ALLOW_PROD_TOKEN_IN_STAGING=true no Heroku para ignorar este bloqueio.'
            //     );
            // }

            // const paymentConfig = {
            //     accessToken: Utils.encryptOAuthToken(credentials.access_token), // Agora o accessToken é criptografado
            //     public_key: credentials.public_key,
            //     refresh_token: Utils.encryptOAuthToken(credentials.refresh_token),
            //     user_id: credentials.user_id,
            //     expires_in: credentials.expires_in,
            //     last_authorization: new Date(),
            //     status: 'active'
            // };

            // 3. Persistência baseada no contexto (state)
            // if (state === 'PLATFORM') {
            //     // Se for a plataforma, salvamos no perfil do Super Admin.
            //     // O upsert garante que o documento/campos sejam criados se não existirem.
            //     await User.findOneAndUpdate(
            //         { type: 'super_admin' },
            //         {
            //             $set: { 'global_payment_config.mercado_pago': paymentConfig, gateway_provider: 'mercado_pago' },
            //             $unset: { 'global_payment_config.credentials': '' }
            //         },
            //         { upsert: true, new: true }
            //     );
            //     console.log('✅ [OAuth] Conta da PLATAFORMA conectada com sucesso.');
            // } else {
            //     // Se for um lojista, salvamos no documento da adega
            //     await Company.findByIdAndUpdate(state, {
            //         $set: {
            //             'payment_config.mercado_pago': paymentConfig,
            //             gateway_provider: 'mercado_pago'
            //         },
            //         $unset: { 'payment_config.credentials': '' }
            //     });
            //     console.log(`✅ [OAuth] Adega ${state} conectada com sucesso.`);
            // }

            // REGISTRO NO HISTÓRICO: Persiste a conexão bem-sucedida
            // await PaymentHistory.create({
            //     company_id: state !== 'PLATFORM' ? state : null,
            //     user_id: state === 'PLATFORM' ? (await User.findOne({ type: 'super_admin' }))?._id : null,
            //     gateway: 'mercado_pago',
            //     status: 'connected',
            //     message: 'Conexão via OAuth estabelecida com sucesso.'
            // });

            // 4. Redireciona para o frontend informando o sucesso
            // Utilizamos o novo helper do Utils para garantir que o redirecionamento saia do domínio da API
            let frontendBase = Utils.getEnvVar('FRONTEND_URL') || 'http://localhost:4200';

            try {
                // Garante que usamos apenas a ORIGEM (ex: http://localhost:8100) evitando duplicação de caminhos
                const url = new URL(frontendBase);
                frontendBase = url.origin;
            } catch (e) {
                frontendBase = frontendBase.replace(/\/$/, '');
            }

            const redirectPath =
                state === 'PLATFORM' ? '/super-admin/payment-gateway' : '/company-admin/payment-gateway';
            console.log(`🚀 [OAuth Success] Redirecionando para o Frontend: ${frontendBase}${redirectPath}`);

            return res.redirect(`${frontendBase}${redirectPath}?status=success&gateway=mercado_pago`);
        } catch (e) {
            // Log aprimorado para objetos de erro do SDK do Mercado Pago
            const mpErrorData = (e as any)?.response?.data || (e as any)?.api_response?.json || null;
            const errorMessage = (e as any).message || 'Erro desconhecido';
            console.error(
                '❌ [MP OAUTH CALLBACK ERROR]:',
                JSON.stringify({ message: errorMessage, data: mpErrorData }, null, 2)
            );

            // REGISTRO NO HISTÓRICO: Persiste a falha de conexão
            // await PaymentHistory.create({
            //     company_id: req.query.state !== 'PLATFORM' ? req.query.state : null,
            //     gateway: 'mercado_pago',
            //     status: 'error',
            //     message: `Falha na autorização OAuth: ${errorMessage}`
            // });

            req.errorStatus = (e as any)?.status || 400;
            next(e);
        }
    }

    /**
     * Varre todos os estabelecimentos e desativa aqueles com assinatura vencida.
     * Deve ser chamado por um Cron Job diariamente.
     */
    static async checkAllSubscriptionsExpiry() {
        try {
            const now = new Date();
            console.log('📅 [CRON]: Verificando expiração de assinaturas...');

            // Busca estabelecimentos ativos/trial que já passaram da data de pagamento
            const expired = await Company.find({
                subscription_status: { $in: ['active', 'trial'] },
                next_payment_date: { $lt: now }
            });

            for (const est of expired) {
                await Company.findByIdAndUpdate(est._id, {
                    subscription_status: 'inactive',
                    status: 'inactive', // Opcional: desativa a loja pública também
                    updated_at: now
                });

                // Notifica o lojista via Push/E-mail sobre a interrupção do serviço
                await NotificationService.sendOrderStatusPush(
                    (await mongoose.connection.model('users').findOne({company_id: est._id, type: 'company_owner'}))?._id?.toString(),
                    'Sua assinatura expirou. Regularize o pagamento para reativar seu painel.'
                );
            }

            console.log(`✅ [CRON]: Verificação concluída. ${expired.length} estabelecimentos desativados.`);
        } catch (e) {
            console.error('❌ [CRON ERROR]: Falha ao processar expiração de assinaturas:', e);
        }
    }

    /**
     * Orchestrator para renovação em lote.
     * Deve ser chamado por uma tarefa agendada (CRON) diariamente para garantir
     * que as conexões de 180 dias do Mercado Pago nunca expirem.
     */
    static async processAutomaticTokenRefresh() {
        try {
            console.log('🔄 [CRON]: Iniciando verificação de expiração de tokens Mercado Pago...');

            // 1. Busca estabelecimentos que possuem refresh_token criptografado e usam Mercado Pago
            const companys = await Company.find({
                'payment_config.mercado_pago.refresh_token.encrypted': { $exists: true },
                gateway_provider: 'mercado_pago'
            });

            const now = new Date();
            let refreshCount = 0;

            for (const est of companys) {
                const mpData = (est as any).payment_config?.mercado_pago;

                // Se não houver dados de autorização ou expiração, ignoramos
                if (!mpData?.last_authorization || !mpData?.expires_in) continue;

                // Calcula a data de expiração: data da última auth + segundos de vida do token
                const expirationDate = new Date(mpData.last_authorization);
                expirationDate.setSeconds(expirationDate.getSeconds() + mpData.expires_in);

                // Janela de segurança: Renovamos 30 dias antes de expirar
                const refreshThreshold = new Date(expirationDate);
                refreshThreshold.setDate(refreshThreshold.getDate() - 30);

                // Se o momento atual já entrou na janela de 30 dias antes da expiração
                if (now >= refreshThreshold) {
                    console.log(`📡 [OAuth Refresh]: Renovando token para adega: ${est.name}`);
                    await this.refreshMPToken(est);
                    refreshCount++;
                }
            }

            console.log(`✅ [CRON]: Verificação concluída. ${refreshCount} tokens renovados com sucesso.`);
        } catch (e) {
            console.error('❌ [CRON ERROR]: Falha na rotina de refresh de tokens:', e);
        }
    }

    /**
     * Realiza a renovação de um Access Token expirado ou próximo da expiração.
     * @param company Instância do estabelecimento vinda do banco central.
     */
    static async refreshMPToken(company: any) {
        const mpData = company.payment_config?.mercado_pago;
        if (!mpData?.refresh_token?.encrypted) return;

        try {
            const appId = Utils.getEnvVar('MERCADOPAGO_APP_ID')?.toString().trim().replace(/["']/g, '');
            const appSecret = Utils.getEnvVar('MERCADOPAGO_APP_SECRET')?.toString().trim().replace(/["']/g, '');

            // 1. Descriptografa o refresh_token atual
            const refreshToken = Utils.decryptOAuthToken(mpData.refresh_token.encrypted, mpData.refresh_token.iv);

            //const client = MercadoPago.getPlatformClient(); // Usa o cliente da plataforma (ambiente-aware)
            //const oauth = new OAuth(client);
            //const credentials = await oauth.refresh({
            // 2. Solicita novos tokens ao Mercado Pago
            //     body: {
            //         client_id: appId || '',
            //         client_secret: appSecret || '',
            //         refresh_token: refreshToken
            //     }
            // });

            // Validação de segurança para renovação
            // if (!credentials.access_token || !credentials.refresh_token) {
            //     throw new Error('O Mercado Pago não retornou os novos tokens durante a renovação.');
            // }

            // // 3. Atualiza o banco central com os novos tokens criptografados
            // await Company.findByIdAndUpdate(company._id, {
            //     $set: {
            //         'payment_config.mercado_pago.accessToken': Utils.encryptOAuthToken(credentials.access_token),
            //         'payment_config.mercado_pago.refresh_token': Utils.encryptOAuthToken(credentials.refresh_token),
            //         'payment_config.mercado_pago.last_authorization': new Date(),
            //         'payment_config.mercado_pago.expires_in': credentials.expires_in,
            //         'payment_config.mercado_pago.refresh_fail_count': 0
            //     }
            // });
        } catch (error) {
            // Incrementa o contador de falhas
            const updated: any = await Company.findByIdAndUpdate(
                company._id,
                { $inc: { 'payment_config.mercado_pago.refresh_fail_count': 1 } },
                { new: true }
            );

            const failCount = updated?.payment_config?.mercado_pago?.refresh_fail_count || 0;
            console.error(`❌ [MP TOKEN REFRESH ERROR] Adega: ${company.name} (Falha ${failCount}):`, error);

            // Se falhar 3 vezes (3 dias seguidos na cron), notifica o lojista
            if (failCount === 3) {
                await NotificationService.sendPaymentProviderErrorPush(String(company._id), 'Mercado Pago');
            }

            throw error;
        }
    }

    /**
     * Retorna o status da conexão OAuth para o dashboard do lojista.
     */
    static async getMPStatus(req: Request, res: Response, next: NextFunction) {
        try {
            // ANTI-CACHE: Força o app a verificar o status real no banco (Evita Status 304)
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                Pragma: 'no-cache',
                Expires: '0'
            });

            const user = req.user;
            let mpData: any = null;

            if (user.type === 'super_admin') {
                const superUser: any = await User.findById(user.aud).select('global_payment_config');
                mpData = superUser?.global_payment_config?.mercado_pago;
            } else {
                const company: any = await Company.findById(user.company_id).select('payment_config');
                if (!company) {
                    req.errorStatus = 404;
                    throw new Error('Estabelecimento não encontrado.');
                }
                mpData = company.payment_config?.mercado_pago;
            }

            // Lógica de determinação de status para o Front-end
            let status = 'disconnected';
            if (mpData?.accessToken?.encrypted) {
                status = 'connected';

                // Se falhou mais de 2 vezes na renovação, avisamos que há um erro
                if ((mpData?.refresh_fail_count || 0) >= 3) {
                    status = 'error';
                }
            }

            return res.status(200).json({
                gateway: 'mercado_pago',
                status: status, // 'connected' | 'disconnected' | 'error'
                public_key: mpData?.public_key || null,
                last_authorization: mpData?.last_authorization || null,
                fail_count: mpData?.refresh_fail_count || 0,
                // Informa se o lojista precisa clicar no botão de reautorizar
                requires_reauth: status === 'error' || status === 'disconnected'
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * Retorna o status de todos os gateways disponíveis para o dashboard.
     */
    static async getGatewaysStatus(req: Request, res: Response, next: NextFunction) {
        try {
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                Pragma: 'no-cache',
                Expires: '0'
            });

            const user = req.user;
            let paymentConfig: any = null;
            let activeGateway = 'mercado_pago';

            if (user.type === 'super_admin') {
                const superUser: any = await User.findById(user.aud)
                    .select('global_payment_config gateway_provider')
                    .lean();
                paymentConfig = superUser?.global_payment_config;
                if (superUser?.gateway_provider) activeGateway = superUser.gateway_provider;
            } else {
                const company: any = await Company.findById(user.company_id)
                    .select('payment_config gateway_provider')
                    .lean();
                if (!company) {
                    req.errorStatus = 404;
                    throw new Error('Estabelecimento não encontrado.');
                }
                paymentConfig = company.payment_config;
                if (company.gateway_provider) activeGateway = company.gateway_provider;
            }

            const response = {
                mercado_pago: {
                    status: 'disconnected',
                    auth_type: 'none',
                    last_authorization: null,
                    fail_count: 0
                },
                stripe: {
                    status: 'disconnected',
                    auth_type: 'none'
                },
                razorpay: {
                    status: 'disconnected',
                    auth_type: 'none'
                },
                active_gateway: activeGateway
            };

            if (paymentConfig) {
                const mpData = paymentConfig.mercado_pago;
                const legacyCreds = paymentConfig.credentials;

                // --- Mercado Pago ---
                if (mpData?.accessToken?.encrypted) {
                    response.mercado_pago.status = 'connected';
                    response.mercado_pago.auth_type = 'oauth';
                    response.mercado_pago.last_authorization = mpData.last_authorization;
                    response.mercado_pago.fail_count = mpData.refresh_fail_count || 0;
                    if ((mpData.refresh_fail_count || 0) >= 3) {
                        response.mercado_pago.status = 'error';
                    }
                } else if (
                    legacyCreds?.accessToken ||
                    (paymentConfig.gateway === 'mercado_pago' && legacyCreds?.publicKey)
                ) {
                    response.mercado_pago.status = 'connected';
                    response.mercado_pago.auth_type = 'keys';
                }

                // --- Stripe ---
                if (
                    legacyCreds?.publicKey &&
                    legacyCreds?.accessToken &&
                    (paymentConfig.gateway === 'stripe' ||
                        activeGateway === 'stripe' ||
                        legacyCreds.publicKey.includes('pk_'))
                ) {
                    response.stripe.status = 'connected';
                    response.stripe.auth_type = 'keys';
                }

                // --- Razorpay ---
                if (
                    legacyCreds?.publicKey &&
                    legacyCreds?.accessToken &&
                    (paymentConfig.gateway === 'razorpay' ||
                        activeGateway === 'razorpay' ||
                        legacyCreds.publicKey.includes('rzp_'))
                ) {
                    response.razorpay.status = 'connected';
                    response.razorpay.auth_type = 'keys';
                }
            }

            // Fallback de lógica: o gateway manual ativo assume a credencial genérica se o regex não bater
            if (
                response.stripe.status === 'disconnected' &&
                activeGateway === 'stripe' &&
                paymentConfig?.credentials?.publicKey
            ) {
                response.stripe.status = 'connected';
                response.stripe.auth_type = 'keys';
            }
            if (
                response.razorpay.status === 'disconnected' &&
                activeGateway === 'razorpay' &&
                paymentConfig?.credentials?.publicKey
            ) {
                response.razorpay.status = 'connected';
                response.razorpay.auth_type = 'keys';
            }

            return res.status(200).json({ success: true, data: response });
        } catch (e) {
            next(e);
        }
    }

    /**
     * Retorna o histórico de tentativas de conexão (OAuth e Manual)
     * Suporta filtros por status: 'all', 'connected', 'error'
     */
    static async getConnectionHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user;
            const { status, gateway } = req.query;
            let query: any = {};

            // Filtro de Contexto: Super Admin vê logs da plataforma, Lojista vê os seus
            if (user.type === 'super_admin') {
                query.user_id = user.aud;
            } else {
                query.company_id = user.company_id;
            }

            if (status && status !== 'all') query.status = status;
            if (gateway) query.gateway = gateway;

            //const history = await PaymentHistory.find(query).sort({ created_at: -1 }).limit(50); // Retorna os últimos 50 registros (dentro do TTL de 180 dias)

            //return res.status(200).json(history);
            return res.status(200).json();
        } catch (e) {
            next(e);
        }
    }
}
