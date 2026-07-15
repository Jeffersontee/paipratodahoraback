import { ProdEnvironment } from './enviroment.prod';
import { StagingEnvironment } from './enviroment.staging';
import { DevEnvironment } from './enviroment.dev';

export interface Environment {
    db_uri: string,
    heroku_uri?: string,
    notification_url?: string,
    jwt_secret_key: string,
    jwt_refresh_secret_key: string,
    sendgrid?: {
        api_key: string,
        email_from: string,
    },
    gmail_auth?: {
        user: string,
        pass: string,
    },
    redis?: {
        username?: string,
        password?: string,
        host: string,
        port: number,
        url?: string
    },
    razorpay?: {
        key_id: string,
        key_secret: string
    },
    cloudinary?: {
        cloud_name?: string,
        api_key: string,
        api_secret: string
    },
    stripe?: {
        publishable_key?: string,
        secret_key: string
    },
    mercado_pago?: {
        public_key?: string,
        accessToken?: string,
        mp_app_id?: string,
        mp_app_secret?: string
        mp_redirect_uri?: string
    },
    firebase: {
        serviceAccount: any;
    }
};

export function getEnvironmentVariables() {
    if(process.env.NODE_ENV === 'production') {
        return ProdEnvironment;
    }
    if(process.env.NODE_ENV === 'staging') {
        return StagingEnvironment;
    }
    return DevEnvironment;
}