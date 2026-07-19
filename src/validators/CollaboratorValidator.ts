import { body, param } from 'express-validator';
import { ValidatorMiddleware } from '../middlewares/global/validator.middleware';

export class CollaboratorValidator {
    static create() {
        return [
            // TODO: Adicione as validações de criação para Collaborator aqui
            // body('campo', 'Mensagem de erro').notEmpty(),
            ValidatorMiddleware.checkError
        ];
    }

    static update() {
        return [
            param('id', 'O ID parâmetro enviado é inválido.').isMongoId(),
            // TODO: Adicione as validações de atualização para Collaborator aqui
            ValidatorMiddleware.checkError
        ];
    }
}
