import { Environment } from './enviroment';

export const ProdEnvironment: Environment = {
    get db_uri() { return process.env.PROD_DB_URI || process.env.PROD_BD_URI || process.env.MONGO_URI || ''; },
    get heroku_uri() { return process.env.PROD_HEROKU_URI; },
    get notification_url() { return process.env.PROD_NOTIFICATION_URI; },
    get jwt_secret_key() { return process.env.PROD_JWT_SECRET_KEY || ''; },
    get jwt_refresh_secret_key() { return process.env.PROD_REFRESH_TOKEN_SECRET || ''; },
    get sendgrid() {
        return {
            api_key: process.env.PROD_SENDGRID_API_KEY || '',
            email_from: process.env.PROD_SENDGRID_SENDER_EMAIL || ''
        };
    },
    get gmail_auth() {
        return {
            user: process.env.PROD_GMAIL_USER || '',
            pass: process.env.PROD_GMAIL_PASS || ''
        };
    },
    get redis() {
        return {
            username: process.env.PROD_SERVER_REDIS_USERNAME || process.env.SERVER_REDIS_USERNAME,
            password: process.env.PROD_SERVER_REDIS_PASSWORD || process.env.SERVER_REDIS_PASSWORD,
            host: process.env.PROD_SERVER_REDIS_HOST || process.env.SERVER_REDIS_HOST || '',
            port: parseInt(process.env.PROD_SERVER_REDIS_PORT || process.env.SERVER_REDIS_PORT || '6379'),
            url: process.env.PROD_REDIS_URL || process.env.REDIS_URL
        };
    },
    get razorpay() {
        return {
            key_id: process.env.PROD_RAZORPAY_KEY_ID || '',
            key_secret: process.env.PROD_RAZORPAY_KEY_SECRET || ''
        };
    },
    get cloudinary() {
        return {
            cloud_name: process.env.PROD_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.PROD_CLOUDINARY_API_KEY || '',
            api_secret: process.env.PROD_CLOUDINARY_API_SECRET || ''
        };
    },
    get stripe() {
        return {
            publishable_key: process.env.PROD_STRIPE_PUBLISHABLE_KEY,
            secret_key: process.env.PROD_STRIPE_SECRET_KEY || ''
        };
    },
    get mercado_pago() {
        return {
            public_key: process.env.PROD_MERCADOPAGO_PUBLIC_KEY, 
            accessToken: process.env.PROD_MERCADOPAGO_ACCESS_TOKEN,
            mp_app_id: process.env.PROD_MERCADOPAGO_APP_ID,
            mp_app_secret: process.env.PROD_MERCADOPAGO_APP_SECRET,
            mp_redirect_uri: process.env.PROD_MERCADOPAGO_REDIRECT_URI
        };
    },
    get firebase() {
        return {
            serviceAccount: process.env.PROD_FIREBASE_CONFIG
        };
    }
};