import { Request, Response, NextFunction } from 'express';
import Company from '../models/company.model';
import Subscription from '../models/Subscription.model';
import User from '../models/user.model';
import { Utils } from '../utils/Utils';
import { NodeMailer } from '../services/integrations/NodeMailer';

export class CompanyController {
    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const companies = await Company.find().sort({ createdAt: -1 });
            return res.status(200).json({
                success: true,
                data: companies
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, owner_name, short_name, description, cnpj, email, active } = req.body;
            const existingCompany = await Company.findOne({ cnpj });
            if (existingCompany) {
                return res.status(422).json({ success: false, message: 'A company with this CNPJ already exists' });
            }

            const company = new Company({
                name,
                owner_name,
                short_name,
                description,
                cnpj,
                email,
                active
            });

            await company.save();

            // Cria a assinatura em status trialing (trial)
            const trialDays = 14; // ou pegar das configs globais
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + trialDays);

            const subscription = new Subscription({
                company_id: company._id,
                status: 'trialing',
                current_period_end: endDate,
                price_at_subscription: 0
            });
            await subscription.save();

            // Atualiza o next_payment_date da empresa
            company.next_payment_date = endDate;
            company.subscription_status = 'trial';
            company.subscription_id = subscription._id;
            await company.save();

            return res.status(201).json({
                success: true,
                data: company
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async get(req: Request, res: Response, next: NextFunction) {
        try {
            const company = await Company.findById(req.params.id);
            if (!company) {
                return res.status(404).json({ success: false, message: 'Company not found' });
            }
            return res.status(200).json({
                success: true,
                data: company
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, owner_name, short_name, description, cnpj, email, active } = req.body;
            const company = await Company.findByIdAndUpdate(
                req.params.id,
                { name, owner_name, short_name, description, cnpj, email, active },
                { new: true, runValidators: true }
            );

            if (!company) {
                return res.status(404).json({ success: false, message: 'Company not found' });
            }

            return res.status(200).json({
                success: true,
                data: company
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const company = await Company.findByIdAndDelete(req.params.id);
            if (!company) {
                return res.status(404).json({ success: false, message: 'Company not found' });
            }
            return res.status(200).json({
                success: true,
                data: null
            });
        } catch (e: any) {
            next(e);
        }
    }

    // --- Users Association ---

    static async listUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const users = await User.find({ company_id: req.params.id })
                .select('-password -verification_token')
                .sort({ created_at: -1 });

            return res.status(200).json({
                success: true,
                data: users
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async assignUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, name, phone, type, password } = req.body;
            const companyId = req.params.id;

            let user = await User.findOne({ email });

            if (user) {
                // Se já existe, apenas vincula
                user.company_id = companyId as any;
                user.type = type || user.type; // Atualiza o tipo (ex: de user para company_owner)
                await user.save();
            } else {
                // Cria novo
                if (!password) {
                    return res.status(422).json({ success: false, message: 'A senha é obrigatória para criar um novo usuário.' });
                }
                const hash = await Utils.encryptPassword(password);
                const verification_token = Utils.generateVerificationToken();
                
                user = new User({
                    name,
                    email,
                    phone,
                    type: type || 'admin',
                    password: hash,
                    company_id: companyId,
                    status: 'active',
                    verification_token,
                    verification_token_time: Date.now() + new Utils().MAX_TOKEN_TIME,
                });
                await user.save();

                try {
                    await NodeMailer.sendMail({
                        to: [user.email],
                        subject: 'Bem-vindo ao sistema!',
                        html: \<h1>Sua conta foi criada. Use este e-mail para logar.</h1>\
                    });
                } catch (e) {
                    console.error('Falha ao enviar email', e);
                }
            }

            return res.status(200).json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    type: user.type,
                    company_id: user.company_id
                }
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async removeUser(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.id;
            const userId = req.params.userId;

            const user = await User.findOne({ _id: userId, company_id: companyId });
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado nesta empresa.' });
            }

            user.company_id = null as any;
            await user.save();

            return res.status(200).json({
                success: true,
                data: null
            });
        } catch (e: any) {
            next(e);
        }
    }
}