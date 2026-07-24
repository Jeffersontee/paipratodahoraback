import { body, param } from 'express-validator';
import { ValidatorMiddleware } from '../middlewares/global/validator.middleware';

export class ServiceOrderValidator {
    static create() {
        return [
            body('company_id', 'O ID da empresa é obrigatório e deve ser um ID válido.').isMongoId(),
            body('unit_id', 'O ID da unidade é obrigatório e deve ser um ID válido.').isMongoId(),
            body('service_id', 'O ID do serviço é obrigatório e deve ser um ID válido.').isMongoId(),
            
            // Sanitizer personalizado para converter strings vazias ou strings "null" de colaborador em null do MongoDB
            body('collaborator_id')
                .optional({ nullable: true })
                .customSanitizer(value => {
                    if (value === '' || value === 'null' || value === null || value === undefined) {
                        return null;
                    }
                    return value;
                }),

            body('scheduled_date', 'A data de agendamento é obrigatória.').notEmpty(),
            ValidatorMiddleware.checkError
        ];
    }

    static update() {
        return [
            param('id', 'O ID da ordem de serviço enviado é inválido.').isMongoId(),
            body('company_id', 'O ID da empresa é obrigatório e deve ser um ID válido.').optional().isMongoId(),
            body('unit_id', 'O ID da unidade é obrigatório e deve ser um ID válido.').optional().isMongoId(),
            body('service_id', 'O ID do serviço é obrigatório e deve ser um ID válido.').optional().isMongoId(),
            
            // Sanitizer para o update
            body('collaborator_id')
                .optional({ nullable: true })
                .customSanitizer(value => {
                    if (value === undefined) {
                        return undefined;
                    }
                    if (value === '' || value === 'null' || value === null) {
                        return null;
                    }
                    return value;
                }),

            ValidatorMiddleware.checkError
        ];
    }
}
