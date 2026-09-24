import { Environment } from "./enviroment";

export const DevEnvironment: Environment = {
    get db_uri() { return process.env.DEV_DB_URI || ''; },
    get heroku_uri() { return process.env.DEV_HEROKU_URI; },
    get notification_url() { return process.env.DEV_NOTIFICATION_URI; },
    get jwt_secret_key() { return process.env.DEV_JWT_SECRET_KEY || ''; },
    get jwt_refresh_secret_key() { return process.env.DEV_REFRESH_TOKEN_SECRET || ''; },
    get sendgrid() {
        return {
            api_key: process.env.DEV_SENDGRID_API_KEY || '',
            email_from: process.env.DEV_SENDGRID_SENDER_EMAIL || ''
        };
    },
    get gmail_auth() {
        return {
            user: process.env.DEV_GMAIL_USER || '',
            pass: process.env.DEV_GMAIL_PASS || ''
        };
    },
    get redis() {
        return {
            username: undefined,
            password: undefined,
            host: process.env.LOCAL_REDIS_HOST || '',
            port: parseInt(process.env.LOCAL_REDIS_PORT || '6379')
        };
    },
    get razorpay() {
        return {
            key_id: process.env.DEV_RAZORPAY_KEY_ID || '',
            key_secret: process.env.DEV_RAZORPAY_KEY_SECRET || ''
        };
    },
    get cloudinary() {
        return {
            cloud_name: process.env.DEV_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.DEV_CLOUDINARY_API_KEY || '',
            api_secret: process.env.DEV_CLOUDINARY_API_SECRET || ''
        };
    },
    get stripe() {
        return {
            publishable_key: process.env.DEV_STRIPE_PUBLISHABLE_KEY,
            secret_key: process.env.DEV_STRIPE_SECRET_KEY || ''
        };
    },
    get mercado_pago() {
        return {
            public_key: process.env.DEV_MERCADOPAGO_PUBLIC_KEY, 
            accessToken: process.env.DEV_MERCADOPAGO_ACCESS_TOKEN,
            mp_app_id: process.env.DEV_MERCADOPAGO_APP_ID,
            mp_app_secret: process.env.DEV_MERCADOPAGO_APP_SECRET,
            mp_redirect_uri: process.env.DEV_MERCADOPAGO_REDIRECT_URI
        };
    },
    get firebase() {
        return {
            serviceAccount: process.env.GOOGLE_APPLICATION_CREDENTIALS 
        };
    }
};