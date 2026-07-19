import { body, param } from 'express-validator';
import { ValidatorMiddleware } from '../middlewares/global/validator.middleware';

export class UserValidator {
    static create() {
        return [
            // TODO: Adicione as validações de criação para User aqui
            // body('campo', 'Mensagem de erro').notEmpty(),
            ValidatorMiddleware.checkError
        ];
    }

    static update() {
        return [
            param('id', 'O ID parâmetro enviado é inválido.').isMongoId(),
            // TODO: Adicione as validações de atualização para User aqui
            ValidatorMiddleware.checkError
        ];
    }
}
