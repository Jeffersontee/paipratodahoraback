import { Utils } from './utils/Utils';
import express from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app'; // 1. Importe o SDK
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import { getEnvironmentVariables } from './environments/enviroment';
import UserRouter from './routers/UserRouter';
// import StaffRouter from './routers/StaffRouter';
// import BannerRouter from './routers/BannerRouter';
import { CronService } from './services/CronService';
// import CityRouter from './routers/CityRouter';
// import CompanyRouter from './routers/CompanyRouter';
// import CategoryRouter from './routers/CategoryRouter';
// import ItemRouter from './routers/ItemRouter';
// import TypeSizeRouter from './routers/TypeSizeRouter';
// import AddressRouter from './routers/AddressRouter';
// import OrderRouter from './routers/OrderRouter';
// import ProductRouter from './routers/ProductRouter';

import { Redis } from './utils/Redis';
import fileUpload from 'express-fileupload';
import * as path from 'path'; // Adicione este import no topo
// import ReportRouter from './routers/ReportRouter';

// import PlanRouter from './routers/PlanRouter';
// import SubscriptionRouter from './routers/SubscriptionRouter';
// import InvoiceRouter from './routers/InvoiceRouter';
// import AnalyticRouter from './routers/AnalyticRouter';
// import PaymentRouter from './routers/PaymentRouter';
// import AuditRouter from './routers/AuditRouter';
// import RatingRouter from './routers/RatingRouter';
// import { PaymentOnboardingController } from './controllers/PaymentOnboardingController';
// import PromotionRouter from './routers/PromotionRouter';
// import LoyaltyRouter from './routers/LoyaltyRouter';
// import ObservationRouter from './routers/ObservationRouter';
import CompanyRouter from './routers/CompanyRouter';
import ServiceRouter from './routers/ServiceRouter';
import CollaboratorRouter from './routers/CollaboratorRouter';
import UnitRouter from './routers/UnitRouter';
import ServiceOrderRouter from './routers/ServiceOrderRouter';
import DashboardRouter from './routers/DashboardRouter';

export class Server {
    public app: express.Application = express();

    constructor() {
        this.setConfigs();
        this.setRoutes();
        this.error404Handler();
        this.handleErrors();
    }

    setConfigs() {
        // Necessário para capturar o IP real do cliente quando atrás do proxy do Heroku
        this.app.set('trust proxy', true);
        this.dotenvConfigs();
        this.connectMongoDB();
        this.initializeFirebase(); // 2. Adicione a inicialização aqui
        this.connectRedis();
        this.initializeCronJobs();
        this.allowCors();
        this.configureBodyParser();
        // this.configureFileUpload();
    }

    dotenvConfigs() {
        Utils.dotenvConfigs();
    }

    connectMongoDB() {
        // Explicitly set strictQuery to avoid the Mongoose deprecation warning
        // and keep behavior consistent across Mongoose 6 -> 7.
        mongoose.set('strictQuery', false);

        const dbUri = getEnvironmentVariables().db_uri;
        const envName = process.env.NODE_ENV || 'development';

        if (!dbUri) {
            console.error(`❌ Erro: A variável db_uri não foi encontrada no ambiente: ${envName}`);
            return;
        }

        mongoose
            .connect(dbUri)
            .then(() => {
                console.log(`✅ Connected to MongoDB [${envName.toUpperCase()}]`);
            })
            .catch((err) => {
                console.error(`❌ Falha crítica na conexão com MongoDB [${envName.toUpperCase()}]:`, err);
            });
    }

    initializeFirebase() {
        try {
            const env = getEnvironmentVariables();
            let serviceAccount: any;
            const config = env.firebase.serviceAccount;

            if (!config) {
                console.warn('⚠️ Firebase: Configuração não encontrada.');
                return;
            }

            // 1. LÓGICA DE DECODIFICAÇÃO (Para Heroku / Base64)
            // Se a string não começa com "." ou "/", tratamos como Base64 ou JSON
            if (typeof config === 'string' && !config.startsWith('.') && !config.startsWith('/')) {
                let decodedString = '';

                if (config.trim().startsWith('{')) {
                    // Caso seja o JSON direto
                    decodedString = config;
                } else {
                    // Caso seja o Base64 (O seu caso atual)
                    decodedString = Buffer.from(config, 'base64').toString('utf8');
                }

                serviceAccount = JSON.parse(decodedString);

                // CORREÇÃO OBRIGATÓRIA DA CHAVE PRIVADA
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
                console.log('☁️ Firebase: Inicializado via Base64/String (Heroku)');
            } else {
                // 2. LÓGICA LOCAL (Arquivo físico)
                const absolutePath = path.resolve(process.cwd(), config);
                serviceAccount = require(absolutePath);
                console.log('💻 Firebase: Inicializado via Arquivo Local');
            }

            // 3. INICIALIZAÇÃO FINAL
            if (serviceAccount && !getApps().length) {
                initializeApp({
                    credential: cert(serviceAccount)
                });
                console.log('✅ Firebase Admin inicializado com sucesso!');
            }
        } catch (error: any) {
            console.error('❌ Falha crítica ao inicializar Firebase:', error?.message || error);
        }
    }

    initializeCronJobs() {
        console.log('📅 [CRON]: Inicializando serviços agendados...');
        CronService.start();
    }

    connectRedis() {
        Redis.connectToRedis();
        //await Redis.setValue("Live", 'code')
        //const value = await Redis.getValue("Live");
        //console.log(value);
        // await Redis.deleteKey("Live")
    }

    configureBodyParser() {
        this.app.use(
            bodyParser.urlencoded({
                extended: true
            })
        );
        this.app.use(bodyParser.json());
    }

    configureFileUpload() {
        this.app.use(
            fileUpload({
                useTempFiles: true
            })
        );
    }

    allowCors() {
        // Configuração de CORS aprimorada para suportar múltiplos ambientes (Staging/Prod)
        const allowedOrigins = [
            'http://localhost:8100',
            'http://127.0.0.1:8100',
            'http://localhost:4200',
            'http://127.0.0.1:4200',
            'http://localhost',
            'http://127.0.0.1',
            'https://localhost',
            'capacitor://localhost',
            'ionic://localhost',
            'https://adegapinguinsfront.web.app', // Exemplo de Prod
            /\.herokuapp\.com$/ // Permite qualquer subdomínio do Heroku (Staging)
        ];

        this.app.use(
            cors({
                origin: (origin, callback) => {
                    // Permite se não houver origin (ex: mobile apps) ou se estiver na lista
                    if (
                        !origin ||
                        allowedOrigins.some((o) => (typeof o === 'string' ? o === origin : o.test(origin)))
                    ) {
                        callback(null, true);
                    } else {
                        // Log para ajudar a identificar qual domínio está tentando acessar e sendo bloqueado
                        console.warn(`🚫 [CORS REJECTED]: Origem não permitida: ${origin}`);
                        callback(new Error('Not allowed by CORS'));
                    }
                },
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id'],
                credentials: true
            })
        );

        // 2. MIDDLEWARE DE SEGURANÇA PARA O MERCADO PAGO (O SEGREDO DO CARTÃO)
        this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            // Libera a exibição de Iframes do Mercado Pago (essencial para Número e CVV)
            // Remove restrições de Frame que travam a digitação
            res.removeHeader('X-Frame-Options');

            res.setHeader(
                'Content-Security-Policy',
                "frame-src 'self' https://*.mercadopago.com https://*.mercadolibre.com; " +
                    "script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com; " +
                    "child-src 'self' https://*.mercadopago.com; " +
                    "connect-src 'self' https://*.mercadopago.com https://*.mercadolibre.com"
            );
            // Remove a restrição que impede o navegador de interagir com frames externos
            // Sem isso, os campos de cartão ficam "mortos" (clica e não acontece nada)
            next();
        });
    }

    setRoutes() {
        this.app.use('/src/uploads', express.static('src/uploads'));
        this.app.use('/api/users', UserRouter);
        // this.app.use('/api/staff', StaffRouter);
        // this.app.use('/api/banners', BannerRouter);
        // this.app.use('/api/cities', CityRouter);
        // this.app.use('/api/companys', CompanyRouter);
        // this.app.use('/api/categories', CategoryRouter);
        // this.app.use('/api/items', ItemRouter);
        // this.app.use('/api/type-sizes', TypeSizeRouter);
        // this.app.use('/api/addresses', AddressRouter);
        // this.app.use('/api/orders', OrderRouter);
        // this.app.use('/api/products', ProductRouter);
        // this.app.use('/api/reports', ReportRouter);

        // Rotas SaaS unificadas para o plural
        // this.app.use('/api/payments', PaymentRouter);
        // this.app.use('/api/plans', PlanRouter);
        // this.app.use('/api/subscriptions', SubscriptionRouter);
        // this.app.use('/api/invoices', InvoiceRouter);
        // this.app.use('/api/analytics', AnalyticRouter);
        // this.app.use('/api/audits', AuditRouter);
        // this.app.use('/api/ratings', RatingRouter);
        // this.app.use('/api/promotions', PromotionRouter);
        // this.app.use('/api/loyalty', LoyaltyRouter);
        // this.app.use('/api/observations', ObservationRouter);

        this.app.use('/api/companies', CompanyRouter);
        this.app.use('/api/services', ServiceRouter);
        this.app.use('/api/collaborators', CollaboratorRouter);
        this.app.use('/api/units', UnitRouter);
        this.app.use('/api/service-orders', ServiceOrderRouter);
        this.app.use('/api/dashboard', DashboardRouter);

        // Alias para capturar callbacks de OAuth que não possuem o prefixo /api/payments
        // Isso resolve o erro 404 quando o Redirect URI é configurado na raiz no painel do MP
        // this.app.get('/mercadopago/callback', PaymentOnboardingController.mpCallback);
        // this.app.get('/callback/mp', PaymentOnboardingController.mpCallback);
    }

    error404Handler() {
        this.app.use((req: express.Request, res: express.Response) => {
            console.warn(`⚠️  [404 NOT FOUND]: ${req.method} ${req.originalUrl}`);
            res.status(404).json({
                message: `A rota ${req.method} ${req.originalUrl} não foi encontrada neste servidor.`,
                error: 'Not found Url',
                status_code: 404
            });
        });
    }

    handleErrors() {
        this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            // Adicione este log para ver o erro real nos logs do Heroku
            console.error('🔥 [SERVER ERROR]:', error.stack || error); // Imprime o stack trace para melhor diagnóstico

            if (res.headersSent) {
                return next(error);
            }

            const errorStatus =
                (req as any).errorStatus || error.status_code || (error && error.status) || error.statusCode || 500;
            res.status(errorStatus).json({
                message: error.message || 'Something went wrong. Please try again!',
                status_code: errorStatus
            });
        });
    }
}
