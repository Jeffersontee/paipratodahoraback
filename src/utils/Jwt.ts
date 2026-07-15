import * as jwt from 'jsonwebtoken';
import { getEnvironmentVariables } from '../environments/enviroment';
import * as Crypto from 'crypto';
import { Redis } from './Redis';

export class Jwt {

    static jwtSign(payload: any, userId: any, expires_in: string = '8h') {
        // Jwt.gen_secret_key();
        return jwt.sign(
            payload,
            getEnvironmentVariables().jwt_secret_key || '',
            { 
                expiresIn:  expires_in,
                audience: userId.toString(), 
                issuer: 'livecodesystem.com.br' 
            } as any
        );
    }

    static jwtVerify(token: string): Promise<any> {
        return new Promise((resolve, reject) => {
            jwt.verify(token, getEnvironmentVariables().jwt_secret_key || '', (err, decoded) => {
                if(err) reject(err);
                else if(!decoded) reject(new Error('O usuário não está autorizado.'));
                else resolve(decoded);
            });
        });
    }

    static async jwtSignRefreshToken(
        payload: any, 
        userId: any, 
        expires_in: string = '1y', 
        redis_ex: number = 365 * 24 * 60 * 60 // one year
        //redis_ex: number = 20
    ) {
        try {
            const refreshToken = jwt.sign(
                payload,
                getEnvironmentVariables().jwt_refresh_secret_key || '',
                { 
                    expiresIn:  expires_in,
                    audience: userId.toString(), 
                    issuer: 'livecodesystem.com.br' 
                } as any
            );
            // set refreshToken in Redis with key userId
            await Redis.setValue(userId.toString(), refreshToken, redis_ex);
            return refreshToken;
        } catch(e) {
            throw e;
        }
    }

    static jwtVerifyRefreshToken(refeshToken: string): Promise<any> {
        return new Promise((resolve, reject) => {
            jwt.verify(refeshToken, getEnvironmentVariables().jwt_refresh_secret_key || '', (err, decoded) => {
            //jwt.verify(refeshToken, process.env.jwt_refresh_secret_key, (err, decoded) => {
                if(err) reject(err);
                else if(!decoded) reject(new Error('User is not authorised.'));
                else {    
                    const user: any = decoded;
                    // resolve(decoded);
                    // match refresh tokens from Redis database
                    Redis.getValue(user.aud).then(value => {
                        if(value === refeshToken) resolve(decoded);
                        else reject(new Error('Sua sessão expirou! Faça login novamente...'));
                    })
                    .catch(e => {
                        reject(e);
                    });
                }
            });
        });
    }

    private static gen_secret_key() {
        const DEV_access_token_secret_key = Crypto.randomBytes(32).toString('hex');
        const DEV_refresh_token_secret_key = Crypto.randomBytes(32).toString('hex');

        const PROD_access_token_secret_key = Crypto.randomBytes(32).toString('hex');
        const PROD_refresh_token_secret_key = Crypto.randomBytes(32).toString('hex');

        console.table(
            {
                DEV_access_token_secret_key,
                DEV_refresh_token_secret_key,
                PROD_access_token_secret_key,
                PROD_refresh_token_secret_key
            }
        );
    }

}