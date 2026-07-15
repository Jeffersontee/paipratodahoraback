import { Request, Response, NextFunction } from 'express';
import { Redis } from '../../utils/Redis';

export class SecurityMiddleware {
    /**
     * Verifica se o endereço de IP do cliente está bloqueado no Redis.
     */
    static async checkIPBlock(req: Request, res: Response, next: NextFunction) {
        try {
            const ip = req.ip || 'UNKNOWN_IP';
            const isBlocked = await Redis.getValue(`BLOCK_IP:${ip}`); 

            if (isBlocked) {
                req.errorStatus = 403;
                return next(new Error('Seu acesso foi bloqueado temporariamente por atividade suspeita.'));
            }
            next();
        } catch (e) {
            // Em caso de falha no Redis, permitimos a requisição para não travar o app
            next();
        }
    }
}
