import { Utils } from './utils/Utils';
import express from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import { getEnvironmentVariables } from './environments/enviroment';
import UserRouter from './routers/UserRouter';
import { CronService } from './services/CronService';
import { Redis } from './utils/Redis';
import fileUpload from 'express-fileupload';
import * as path from 'path';

import AuditRouter from './routers/AuditRouter';
import HelpRouter from './routers/HelpRouter';
import CompanyRouter from './routers/CompanyRouter';
import ServiceRouter from './routers/ServiceRouter';
import CollaboratorRouter from './routers/CollaboratorRouter';
import UnitRouter from './routers/UnitRouter';
import ServiceOrderRouter from './routers/ServiceOrderRouter';
import DashboardRouter from './routers/DashboardRouter';
import AppConfigRouter from './routers/AppConfigRouter';
import AppearanceRouter from './routers/AppearanceRouter';

export class Server {
    public app: express.Application = express();

    constructor() {
        this.setConfigs();
        this.setRoutes();
        this.error404Handler();
        this.handleErrors();
    }

    setConfigs() {
        this.app.set('trust proxy', true);
        this.dotenvConfigs();
        this.connectMongoDB();
        this.initializeFirebase();
        this.connectRedis();
        this.initializeCronJobs();
        this.allowCors();
        this.configureBodyParser();
    }

    dotenvConfigs() {
        Utils.dotenvConfigs();
    }

    connectMongoDB() {
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

            if (typeof config === 'string' && !config.startsWith('.') && !config.startsWith('/')) {
                let decodedString = '';

                if (config.trim().startsWith('{')) {
                    decodedString = config;
                } else {
                    decodedString = Buffer.from(config, 'base64').toString('utf8');
                }

                serviceAccount = JSON.parse(decodedString);

                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
                console.log('☁️ Firebase: Inicializado via Base64/String (Heroku)');
            } else {
                const absolutePath = path.resolve(process.cwd(), config);
                serviceAccount = require(absolutePath);
                console.log('💻 Firebase: Inicializado via Arquivo Local');
            }

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
    }

    configureBodyParser() {
        this.app.use(
            bodyParser.urlencoded({
                limit: '50mb',
                extended: true
            })
        );
        this.app.use(bodyParser.json({ limit: '50mb' }));
    }

    configureFileUpload() {
        this.app.use(
            fileUpload({
                useTempFiles: true
            })
        );
    }

    allowCors() {
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
            'https://test-72d86d13.web.app',
            'https://web.app',
            /\.web\.app$/,
            /\.firebaseapp\.com$/,
            /\.herokuapp\.com$/
        ];

        this.app.use(
            cors({
                origin: (origin, callback) => {
                    if (
                        !origin ||
                        allowedOrigins.some((o) => (typeof o === 'string' ? o === origin : o.test(origin)))
                    ) {
                        callback(null, true);
                    } else {
                        console.warn(`🚫 [CORS REJECTED]: Origem não permitida: ${origin}`);
                        callback(new Error('Not allowed by CORS'));
                    }
                },
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id'],
                credentials: true
            })
        );

        this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.removeHeader('X-Frame-Options');

            res.setHeader(
                'Content-Security-Policy',
                "frame-src 'self' https://*.mercadopago.com https://*.mercadolibre.com; " +
                    "script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com; " +
                    "child-src 'self' https://*.mercadopago.com; " +
                    "connect-src 'self' https://*.mercadopago.com https://*.mercadolibre.com"
            );
            next();
        });
    }

    setRoutes() {
        this.app.use('/src/uploads', express.static('src/uploads'));
        this.app.use('/api/users', UserRouter);
        this.app.use('/api/audits', AuditRouter);
        this.app.use('/api/help', HelpRouter);
        this.app.use('/api/companies', CompanyRouter);
        this.app.use('/api/services', ServiceRouter);
        this.app.use('/api/collaborators', CollaboratorRouter);
        this.app.use('/api/units', UnitRouter);
        this.app.use('/api/service-orders', ServiceOrderRouter);
        this.app.use('/api/dashboard', DashboardRouter);
        this.app.use('/api/configs', AppConfigRouter);
        this.app.use('/api/appearance', AppearanceRouter);
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
            console.error('🔥 [SERVER ERROR]:', error.stack || error);

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
