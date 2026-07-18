import { Request, Response, NextFunction } from 'express';
import User from '../../models/user.model';
import { Jwt } from '../../utils/Jwt';

export class AuthMiddleware {
    /**
     * Valida o token JWT e anexa o usuário autenticado à requisição
     */
    static async authenticate(req: Request, res: Response, next: NextFunction) {
        const header_auth = req.headers.authorization; // Bearer token
        const token = header_auth ? header_auth.slice(7, header_auth.length) : null;

        try {
            if (!token) {
                return res.status(401).json({
                    message: 'Token de autenticação não fornecido.',
                    status_code: 401
                });
            }

            const decoded = await Jwt.jwtVerify(token);

            // Busca os dados ATUALIZADOS do usuário no banco (Essencial para Multi-tenancy)
            const user = await User.findById(decoded.aud).lean();
            if (!user || user.status !== 'active') {
                return res.status(401).json({
                    message: user
                        ? 'Sua conta está desativada. Entre em contato com o suporte.'
                        : 'Usuário não encontrado ou sessão inválida.',
                    status_code: 401
                });
            }

            req.user = { ...user, aud: decoded.aud } as any;
            next();
        } catch (e: any) {
            console.error('❌ [AUTH ERROR]:', e.message || e);
            return res.status(401).json({
                message: 'Sessão inválida ou expirada',
                status_code: 401
            });
        }
    }

    /**
     * Decodifica o Refresh Token recebido no corpo da requisição
     */
    static async decodeRefreshToken(req: Request, res: Response, next: NextFunction) {
        const refreshToken = req.body?.refreshToken || req.body?.refresh_token;

        try {
            if (!refreshToken) {
                return res.status(403).json({
                    message: 'Refresh Token não fornecido no corpo da requisição.',
                    status_code: 403
                });
            }
            const decoded = await Jwt.jwtVerifyRefreshToken(refreshToken);
            req.user = decoded;
            next();
        } catch (e: any) {
            if (e instanceof Error && (e.message.includes('indisponível') || e.message.includes('comunicação'))) {
                return res.status(503).json({
                    message: 'Serviço de cache indisponível',
                    status_code: 503
                });
            }

            return res.status(403).json({
                message: 'Sua sessão expirou! Faça login novamente...',
                status_code: 403,
                error: e?.message
            });
        }
    }

    /**
     * Valida se o usuário autenticado possui cargo administrativo
     */
    static adminRole(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                message: 'Usuário não autenticado',
                status_code: 401
            });
        }

        const allowedTypes = ['admin', 'super_admin', 'company_owner', 'staff', 'super_staff'];
        if (!allowedTypes.includes(user.type)) {
            return res.status(401).json({
                message: 'Você é um usuário não autorizado',
                status_code: 401
            });
        }
        next();
    }
}
