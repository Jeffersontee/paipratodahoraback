import { Environment } from './enviroment';

export const StagingEnvironment: Environment = {
    db_uri: process.env.STAGING_DB_URI || '',
    heroku_uri: process.env.STAGING_HEROKU_URI,
    notification_url: process.env.STAGING_NOTIFICATION_URI,
    jwt_secret_key: process.env.STAGING_JWT_SECRET_KEY || '',
    jwt_refresh_secret_key: process.env.STAGING_REFRESH_TOKEN_SECRET || '',
    sendgrid: {
        api_key: process.env.STAGING_SENDGRID_API_KEY || '',
        email_from: process.env.STAGING_SENDGRID_SENDER_EMAIL || ''
    },
    gmail_auth: {
        user: process.env.STAGING_GMAIL_USER || '',
        pass: process.env.STAGING_GMAIL_PASS || ''
    },
    redis: {
        username: process.env.STAGING_SERVER_REDIS_USERNAME || process.env.SERVER_REDIS_USERNAME,
        password: process.env.STAGING_SERVER_REDIS_PASSWORD || process.env.SERVER_REDIS_PASSWORD,
        host: process.env.STAGING_SERVER_REDIS_HOST || process.env.SERVER_REDIS_HOST || '',
        port: parseInt(process.env.STAGING_SERVER_REDIS_PORT || process.env.SERVER_REDIS_PORT || '6379'),
        url: process.env.STAGING_REDIS_URL || process.env.REDIS_URL
    },
    razorpay: {
        key_id: process.env.STAGING_RAZORPAY_KEY_ID || '',
        key_secret: process.env.STAGING_RAZORPAY_KEY_SECRET || ''
    },
    cloudinary: {
        cloud_name: process.env.STAGING_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.STAGING_CLOUDINARY_API_KEY || '',
        api_secret: process.env.STAGING_CLOUDINARY_API_SECRET || ''
    },
    stripe: {
        publishable_key: process.env.STAGING_STRIPE_PUBLISHABLE_KEY,
        secret_key: process.env.STAGING_STRIPE_SECRET_KEY || ''
    },
    mercado_pago: {
        public_key: process.env.STAGING_MERCADOPAGO_PUBLIC_KEY, 
        accessToken: process.env.STAGING_MERCADOPAGO_ACCESS_TOKEN,
        mp_app_id: process.env.STAGING_MERCADOPAGO_APP_ID,
        mp_app_secret: process.env.STAGING_MERCADOPAGO_APP_SECRET,
        mp_redirect_uri: process.env.STAGING_MERCADOPAGO_REDIRECT_URI
    },
    firebase: {
        // No Heroku: STAGING_FIREBASE_CONFIG='{"type": "service_account", ...}'
        serviceAccount: process.env.STAGING_FIREBASE_CONFIG
    }
};