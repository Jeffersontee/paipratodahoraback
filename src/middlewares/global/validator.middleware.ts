import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export class ValidatorMiddleware {
    /**
     * Intercepta erros lançados pelo express-validator
     */
    static checkError(req: Request, res: Response, next: NextFunction) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorArray = errors.array();

            // Log detalhado no console do servidor para Debug
            console.error(`❌ [422 ERROR] em ${req.method} ${req.originalUrl}:`);
            console.error(`   - Body recebido:`, JSON.stringify(req.body, null, 2));
            errorArray.forEach((err: any) => {
                console.error(`   - Erro: ${err.msg} (campo: ${err.path || err.param})`);
            });

            req.errorStatus = 422; // Erro de validação (Unprocessable Entity)
            next(new Error(errorArray[0].msg));
        } else {
            next();
        }
    }
}
