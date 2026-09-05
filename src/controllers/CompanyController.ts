import { Request, Response, NextFunction } from 'express';
import Company from '../models/company.model';
import Subscription from '../models/subscription.model';
import User from '../models/user.model';
import { Utils } from '../utils/Utils';
import { NodeMailer } from '../services/integrations/NodeMailer';
import { ICompanyCreateInput } from '../interfaces/company.interface';

export class CompanyController {
    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const companies = await Company.find()
                .populate({ path: 'subscription_id', populate: { path: 'plan_id' } })
                .sort({ createdAt: -1 });

            // Enriquecer cada empresa com os dados do responsável/dono caso estejam em branco
            const enrichedCompanies = await Promise.all(
                companies.map(async (company) => {
                    const compObj: any = company.toObject();
                    if (!compObj.owner_name || !compObj.email || !compObj.phone) {
                        const owner = await User.findOne({ company_id: company._id, type: 'company_owner' });
                        if (owner) {
                            if (!compObj.owner_name) compObj.owner_name = owner.name;
                            if (!compObj.email) compObj.email = owner.email;
                            if (!compObj.phone) compObj.phone = owner.phone;
                        }
                    }
                    return compObj;
                })
            );

            return res.status(200).json({
                success: true,
                data: enrichedCompanies
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const body: ICompanyCreateInput & { password?: string; phone?: string; plan_id?: string } = req.body;
            const existingCompany = await Company.findOne({ cnpj: body.cnpj });
            if (existingCompany) {
                return res.status(422).json({ success: false, message: 'Já existe uma empresa cadastrada com este CNPJ.' });
            }

            const company = new Company(body);
            await company.save();

            // Cria automaticamente a conta do responsável (company_owner) se o e-mail e a senha forem fornecidos
            if (body.email && body.password) {
                const userEmail = body.email.toLowerCase().trim();
                let existingUser = await User.findOne({ email: userEmail });
                if (existingUser) {
                    existingUser.company_id = company._id as any;
                    existingUser.type = 'company_owner';
                    if (body.phone) existingUser.phone = body.phone;
                    await existingUser.save();
                } else {
                    const hash = await Utils.encryptPassword(body.password);
                    const verification_token = Utils.generateVerificationToken();
                    const newUser = new User({
                        name: body.owner_name || body.name,
                        email: userEmail,
                        phone: body.phone || '',
                        type: 'company_owner',
                        password: hash,
                        company_id: company._id,
                        status: 'active',
                        verification_token,
                        verification_token_time: Date.now() + new Utils().MAX_TOKEN_TIME
                    });
                    await newUser.save();
                }
            }

            // Cria a assinatura vinculada ao plano
            const trialDays = 14;
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + trialDays);

            const subscription = new Subscription({
                company_id: company._id,
                plan_id: body.plan_id || undefined,
                status: 'trialing',
                current_period_end: endDate,
                price_at_subscription: 0
            });
            await subscription.save();

            // Atualiza o status e vinculo na empresa
            company.next_payment_date = endDate;
            company.subscription_status = 'trial';
            company.subscription_id = subscription._id;
            if (body.catalog_module_enabled !== undefined) company.catalog_module_enabled = body.catalog_module_enabled;
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
            const company = await Company.findById(req.params.id)
                .populate({ path: 'subscription_id', populate: { path: 'plan_id' } });
            if (!company) {
                return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
            }

            const companyObj: any = company.toObject();
            if (!companyObj.owner_name || !companyObj.email || !companyObj.phone) {
                const owner = await User.findOne({ company_id: company._id, type: 'company_owner' });
                if (owner) {
                    if (!companyObj.owner_name) companyObj.owner_name = owner.name;
                    if (!companyObj.email) companyObj.email = owner.email;
                    if (!companyObj.phone) companyObj.phone = owner.phone;
                }
            }

            return res.status(200).json({
                success: true,
                data: companyObj
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, owner_name, short_name, description, cnpj, email, phone, active, services, plan_id, catalog_module_enabled } = req.body;
            const company = await Company.findByIdAndUpdate(
                req.params.id,
                { name, owner_name, short_name, description, cnpj, email, phone, active, services, catalog_module_enabled },
                { new: true, runValidators: true }
            );

            if (!company) {
                return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
            }

            // Sincroniza o plano na assinatura correspondente caso tenha sido fornecido
            if (plan_id && company.subscription_id) {
                await Subscription.findByIdAndUpdate(company.subscription_id, { plan_id });
            }

            // Sincroniza os dados do responsável na conta do usuário Dono da Empresa caso exista
            if (owner_name || email || phone) {
                const owner = await User.findOne({ company_id: company._id, type: 'company_owner' });
                if (owner) {
                    if (owner_name) owner.name = owner_name;
                    if (email) owner.email = email.toLowerCase().trim();
                    if (phone) owner.phone = phone;
                    await owner.save();
                }
            }

            return res.status(200).json({
                success: true,
                data: company
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async updateServices(req: Request, res: Response, next: NextFunction) {
        try {
            const { services } = req.body;
            const company = await Company.findByIdAndUpdate(
                req.params.id,
                { services },
                { new: true, runValidators: true }
            );

            if (!company) {
                return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
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
                return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
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

            let user = await User.findOne({ email: email.toLowerCase().trim() });

            if (user) {
                user.company_id = companyId as any;
                user.type = type || user.type;
                await user.save();
            } else {
                if (!password) {
                    return res
                        .status(422)
                        .json({ success: false, message: 'A senha é obrigatória para criar um novo usuário.' });
                }
                const hash = await Utils.encryptPassword(password);
                const verification_token = Utils.generateVerificationToken();

                user = new User({
                    name,
                    email: email.toLowerCase().trim(),
                    phone,
                    type: type || 'admin',
                    password: hash,
                    company_id: companyId,
                    status: 'active',
                    verification_token,
                    verification_token_time: Date.now() + new Utils().MAX_TOKEN_TIME
                });
                await user.save();

                try {
                    await NodeMailer.sendMail({
                        to: [user.email],
                        subject: 'Bem-vindo ao sistema!',
                        html: `<h1>Sua conta foi criada. Use este e-mail para logar.</h1>`
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
