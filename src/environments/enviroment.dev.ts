import { Environment } from "./enviroment";

export const DevEnvironment: Environment = {
    db_uri: process.env.DEV_DB_URI || '',
    heroku_uri: process.env.DEV_HEROKU_URI,
    notification_url: process.env.DEV_NOTIFICATION_URI,
    jwt_secret_key: process.env.DEV_JWT_SECRET_KEY || '',
    jwt_refresh_secret_key: process.env.DEV_REFRESH_TOKEN_SECRET || '',
    sendgrid: {
        api_key: process.env.DEV_SENDGRID_API_KEY || '',
        email_from: process.env.DEV_SENDGRID_SENDER_EMAIL || ''
    },
    gmail_auth: {
        user: process.env.DEV_GMAIL_USER || '',
        pass: process.env.DEV_GMAIL_PASS || ''
    },
    redis: {
        username: undefined, // Alterado de null para undefined
        password: undefined, // Alterado de null para undefined
        host: process.env.LOCAL_REDIS_HOST || '',
        port: parseInt(process.env.LOCAL_REDIS_PORT || '6379') // Adicionado fallback
    },
    razorpay: {
        key_id: process.env.DEV_RAZORPAY_KEY_ID || '',
        key_secret: process.env.DEV_RAZORPAY_KEY_SECRET || ''
    },
    cloudinary: {
        cloud_name: process.env.DEV_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.DEV_CLOUDINARY_API_KEY || '',
        api_secret: process.env.DEV_CLOUDINARY_API_SECRET || ''
    },
    stripe: {
        publishable_key: process.env.DEV_STRIPE_PUBLISHABLE_KEY,
        secret_key: process.env.DEV_STRIPE_SECRET_KEY || ''
    },
    mercado_pago: {
        public_key: process.env.DEV_MERCADOPAGO_PUBLIC_KEY, 
        accessToken: process.env.DEV_MERCADOPAGO_ACCESS_TOKEN,
        mp_app_id: process.env.DEV_MERCADOPAGO_APP_ID,
        mp_app_secret: process.env.DEV_MERCADOPAGO_APP_SECRET,
        mp_redirect_uri: process.env.DEV_MERCADOPAGO_REDIRECT_URI
    },
    firebase: {
        // No .env: GOOGLE_APPLICATION_CREDENTIALS="./src/config/serviceAccountKey.json"
        serviceAccount: process.env.GOOGLE_APPLICATION_CREDENTIALS 
    }
};