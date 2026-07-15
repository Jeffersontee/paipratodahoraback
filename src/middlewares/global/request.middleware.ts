import { Request, Response, NextFunction } from 'express';

export class RequestMiddleware {
    /**
     * Middleware para corrigir o protótipo do req.body (evita erro hasOwnProperty)
     */
    static handleRequestBody(req: Request, res: Response, next: NextFunction) {
        if (req.body && typeof req.body === 'object' && typeof req.body.hasOwnProperty !== 'function') {
            Object.setPrototypeOf(req.body, Object.prototype);
        }
        next();
    }
}
