import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import { Utils } from '../utils/Utils';

export class CollaboratorController {
    static async createCollaborator(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, email, phone, password, role, status, technician_profile } = req.body;
            
            // Validate required fields
            if (!name || !email || !password || !role) {
                return res.status(422).json({
                    success: false,
                    message: 'Nome, E-mail, Senha e Nível de Acesso (role) são obrigatórios.',
                    status_code: 422
                });
            }

            // Check if email already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Um usuário com este e-mail já existe.',
                    status_code: 409
                });
            }

            const hash = await Utils.encryptPassword(password);
            
            // Get the company_id from the admin creating the collaborator
            const adminUser = await User.findById(req.user?.aud || req.user?.user_id || req.user?._id);
            const company_id = adminUser?.company_id || null;

            const collaboratorData: any = {
                name,
                email,
                phone: phone || null,
                password: hash,
                type: 'collaborator',
                role,
                status: status || 'active',
                email_verified: true, // Supondo verificado por admin
                company_id: company_id
            };

            if (role === 'technician' && technician_profile) {
                collaboratorData.technician_profile = technician_profile;
            }

            const collaborator = await new User(collaboratorData).save();

            res.status(201).json({
                success: true,
                message: 'Colaborador criado com sucesso!',
                data: collaborator
            });
        } catch (error) {
            next(error);
        }
    }

    static async getCollaborators(req: Request, res: Response, next: NextFunction) {
        try {
            const adminUser = await User.findById(req.user?.aud || req.user?.user_id || req.user?._id);
            const company_id = adminUser?.company_id || null;

            const collaborators = await User.find({ type: 'collaborator', company_id }).select('-password -__v');
            
            res.status(200).json({
                success: true,
                data: collaborators
            });
        } catch (error) {
            next(error);
        }
    }

    static async getCollaboratorById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const collaborator = await User.findOne({ _id: id, type: 'collaborator' }).select('-password -__v');

            if (!collaborator) {
                return res.status(404).json({
                    success: false,
                    message: 'Colaborador não encontrado.',
                    status_code: 404
                });
            }

            res.status(200).json({
                success: true,
                data: collaborator
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateCollaborator(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { name, email, phone, role, status, password } = req.body;

            const collaborator = await User.findOne({ _id: id, type: 'collaborator' });

            if (!collaborator) {
                return res.status(404).json({
                    success: false,
                    message: 'Colaborador não encontrado.',
                    status_code: 404
                });
            }

            collaborator.name = name || collaborator.name;
            collaborator.email = email || collaborator.email;
            collaborator.phone = phone || collaborator.phone;
            collaborator.role = role || collaborator.role;
            collaborator.status = status || collaborator.status;

            if (password) {
                collaborator.password = await Utils.encryptPassword(password);
            }

            const updatedCollaborator = await collaborator.save();
            const { password: _, ...responseData } = updatedCollaborator.toObject();

            res.status(200).json({
                success: true,
                message: 'Colaborador atualizado com sucesso!',
                data: responseData
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteCollaborator(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const deleted = await User.findOneAndDelete({ _id: id, type: 'collaborator' });

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Colaborador não encontrado.',
                    status_code: 404
                });
            }

            res.status(200).json({
                success: true,
                message: 'Colaborador removido com sucesso!'
            });
        } catch (error) {
            next(error);
        }
    }
}
