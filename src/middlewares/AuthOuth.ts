import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import OAuthToken from '../models/OAuthToken.model';
import User from '../models/user.model';

/**
 * Interface estendida para incluir os dados de autenticação na requisição
 */
export interface AuthenticatedRequest extends Request {
    user?: any;
    oauth_token?: any;
}

/**
 * Middleware de autenticação que suporta JWT e tokens OAuth diretos
 */
export const authenticateOAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);

    try {
        // 1. Tentar verificar como JWT tradicional
        const decoded = jwt.verify(token, process.env['JWT_SECRET'] as string);
        req.user = decoded;
        return next();
    } catch (jwtError) {
        // 2. Se falhar, buscar na coleção de tokens OAuth (token de acesso externo)
        const oauthToken = await OAuthToken.findOne({
            access_token: token,
            is_active: true,
            expires_at: { $gt: new Date() }
        });

        if (!oauthToken) {
            return res.status(401).json({ error: 'Token inválido ou expirado' });
        }

        const user = await User.findById(oauthToken.user_id);
        if (!user) return res.status(404).json({ error: 'Usuário associado não encontrado' });

        req.user = user;
        req.oauth_token = oauthToken;

        oauthToken.last_used_at = new Date();
        await oauthToken.save();
        next();
    }
};
