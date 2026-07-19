import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Redis } from './../utils/Redis';
import { Jwt } from './../utils/Jwt';
import { NodeMailer } from '../services/integrations/NodeMailer';
import { Utils } from './../utils/Utils';
import User from '../models/user.model';
import { Cloudinary } from '../services/integrations/Cloudinary';
import Company from '../models/company.model';
import Subscription from '../models/subscription.model';
import { IUser } from '../interfaces/user.interface';
import { AuditService } from '../services/AuditService';

export class UserController {
    static async signup(req: Request, res: Response, next: NextFunction) {
        //console.log('req: ', req);
        const name = req.body.name;
        const phone = req.body.phone;
        const email = req.body.email;
        const password = req.body.password;
        const type = req.body.type;
        const status = req.body.status;
        const fcm_token = req.body.fcm_token;
        const verification_token = Utils.generateVerificationToken();

        try {
            const hash = await Utils.encryptPassword(password);
            console.log(hash);
            const data = {
                email,
                verification_token,
                verification_token_time: Date.now() + new Utils().MAX_TOKEN_TIME,
                cpf: req.body.cpf || null,
                phone,
                password: hash,
                name,
                type,
                status,
                fcm_token: fcm_token || null
            };

            let user;
            if ((req as any).shadowAccount) {
                // Reivindica a conta sombra
                const shadowAccount = (req as any).shadowAccount;
                user = await User.findByIdAndUpdate(
                    shadowAccount._id,
                    {
                        name,
                        email,
                        password: hash,
                        cpf: req.body.cpf || shadowAccount.cpf || null,
                        verification_token,
                        verification_token_time: Date.now() + new Utils().MAX_TOKEN_TIME,
                        email_verified: false,
                        fcm_token: fcm_token || null,
                        updated_at: new Date()
                    },
                    { new: true }
                );

                if (!user) {
                    throw new Error('Falha ao reivindicar a conta existente.');
                }
            } else {
                user = await new User(data).save();
            }
            const user_data = {
                _id: user._id,
                email: user.email,
                email_verified: user.email_verified,
                phone: user.phone,
                cpf: user.cpf || null,
                name: user.name,
                photo: user.photo || null,
                type: user.type,
                status: user.status,
                created_at: user.created_at,
                updated_at: user.updated_at
            };
            const payload = {
                // user_id: user._id,
                // aud: user._id, Validar se precisa ou não comentar
                email: user.email,
                type: user.type
            };
            // filter user data to pass in frontend
            const access_token = Jwt.jwtSign(payload, user._id);
            console.log('TOKEN ACCESS', access_token);
            const refresh_token = await Jwt.jwtSignRefreshToken(payload, user._id);
            console.log('refresh_token', refresh_token);

            // Tenta enviar o e-mail, mas não interrompe o cadastro em caso de falha
            try {
                await NodeMailer.sendMail({
                    to: [user.email],
                    subject: 'Verificação de e-mail',
                    html: `<h1>Seu OTP é ${verification_token}</h1>`
                });
            } catch (mailError) {
                console.error('⚠️ [MAIL ERROR]: Falha ao enviar e-mail de verificação:', mailError);
            }

            return res.status(201).json({
                success: true,
                data: {
                    token: access_token,
                    refreshToken: refresh_token,
                    user: user_data
                }
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async signupCompany(req: Request, res: Response, next: NextFunction) {
        const { company_name, cnpj, owner_name, email, password, phone } = req.body;
        const verification_token = Utils.generateVerificationToken();

        try {
            // Check existing company
            const existingCompany = await mongoose.model('Company').findOne({ cnpj });
            if (existingCompany) {
                return res.status(409).json({ success: false, message: 'CNPJ já cadastrado.', status_code: 409 });
            }

            const hash = await Utils.encryptPassword(password);

            // Create Company
            const company = await new (mongoose.model('Company'))({
                name: company_name,
                owner_name,
                cnpj,
                email,
                active: true
            }).save();

            // Create User (Owner)
            const userData = {
                email,
                verification_token,
                verification_token_time: Date.now() + new Utils().MAX_TOKEN_TIME,
                phone,
                password: hash,
                name: owner_name,
                type: 'company_owner',
                status: 'active',
                company_id: company._id
            };

            const user = await new User(userData).save();

            const user_data = {
                _id: user._id,
                email: user.email,
                email_verified: user.email_verified,
                phone: user.phone,
                name: user.name,
                type: user.type,
                status: user.status,
                company_id: user.company_id,
                created_at: user.created_at,
                updated_at: user.updated_at
            };

            const payload = {
                email: user.email,
                type: user.type
            };

            const access_token = Jwt.jwtSign(payload, user._id);
            const refresh_token = await Jwt.jwtSignRefreshToken(payload, user._id);

            // Send Verification Email
            try {
                await NodeMailer.sendMail({
                    to: [user.email],
                    subject: 'Verificação de e-mail (Empresa)',
                    html: `<h1>Seu OTP é ${verification_token}</h1>`
                });
            } catch (mailError) {
                console.error('⚠️ [MAIL ERROR]: Falha ao enviar e-mail de verificação:', mailError);
            }

            return res.status(201).json({
                success: true,
                data: {
                    token: access_token,
                    refreshToken: refresh_token,
                    user: user_data,
                    company: company
                }
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async verifyUserEmailToken(req: Request, res: Response, next: NextFunction) {
        const verification_token = req.body.verification_token;
        console.log('Verification Token', verification_token);
        const email = req.user?.email;
        try {
            const user = await User.findOneAndUpdate(
                {
                    email: email,
                    verification_token: verification_token,
                    verification_token_time: { $gt: Date.now() }
                },
                {
                    email_verified: true,
                    updated_at: new Date()
                },
                {
                    new: true,
                    projection: {
                        verification_token: 0,
                        verification_token_time: 0,
                        password: 0,
                        reset_password_token: 0,
                        reset_password_token_time: 0,
                        __v: 0,
                        _id: 0
                    }
                }
            );
            if (user) {
                return res.status(200).json({
                    success: true,
                    data: user
                });
            } else {
                throw new Error('Wrong Otp or Email Verification Token Is Expired. Please try again...');
            }
        } catch (e: any) {
            next(e);
        }
    }

    static async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
        const email = req.user?.email;
        const verification_token = Utils.generateVerificationToken();
        try {
            const user = await User.findOneAndUpdate(
                { email: email },
                {
                    updated_at: new Date(),
                    verification_token: verification_token,
                    verification_token_time: Date.now() + new Utils().MAX_TOKEN_TIME
                }
            );
            if (user) {
                try {
                    await NodeMailer.sendMail({
                        to: [user.email],
                        subject: 'Reenviar e-mail de verificação',
                        html: `<h1>Seu OTP é ${verification_token}</h1>`
                    });
                } catch (mailError) {
                    console.error('⚠️ [MAIL ERROR]: Falha ao reenviar e-mail:', mailError);
                }
                return res.status(200).json({
                    success: true,
                    data: { message: 'E-mail de verificação enviado com sucesso.' }
                });
            } else {
                throw new Error('O usuário não existe.');
            }
        } catch (e: any) {
            next(e);
        }
    }

    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            let user = req.user as IUser & { password: string };

            // Se o usuário não foi populado por um middleware (ex: validador), busca pelo email
            if (!user) {
                const email = req.body.email;
                user = (await User.findOne({ email }).select('+password')) as IUser & { password: string };

                if (!user) {
                    throw new Error('E-mail ou senha incorretos.');
                }
                req.user = user;
            }

            const password = req.body.password;
            const data = {
                password,
                encrypt_password: user.password // Agora o TypeScript reconhece 'password'
            };

            // check password
            await Utils.comparePassword(data);

            // 1. Obtém o ID do estabelecimento diretamente do usuário (agora persistido no banco)
            let companyId: string | null = user.company_id ? String(user.company_id) : null;

            // FALLBACK: Se o admin não tem o ID no perfil, busca pelo vínculo de dono no HubDB
            if (!companyId && user.type === 'company_owner') {
                const comp = await Company.findOne({ email: user.email }).select('_id');
                if (comp) {
                    companyId = String(comp._id);
                    // Sincronização proativa no HubDB para as próximas sessões
                    await User.findByIdAndUpdate(user._id, { company_id: comp._id });
                }
            }

            // Busca dados da assinatura para o payload
            let subscriptionStatus = 'active';
            let nextPayment = null;
            if (companyId) {
                const comp = await Company.findById(companyId).select('subscription_status next_payment_date');
                subscriptionStatus = comp?.subscription_status || 'inactive';
                nextPayment = comp?.next_payment_date;
            }

            // 2. INCLUI DADOS DE SAAS NO PAYLOAD DO JWT
            const payload: any = {
                email: user.email,
                type: user.type,
                subscription_status: subscriptionStatus
            };
            if (companyId) {
                payload.company_id = companyId;
            }

            console.log('User ID:', user._id);
            const access_token = Jwt.jwtSign(payload, user._id);
            const refresh_token = await Jwt.jwtSignRefreshToken(payload, user._id);

            const user_data = {
                _id: user._id,
                email: user.email,
                email_verified: user.email_verified,
                phone: user.phone,
                cpf: user.cpf || null,
                photo: user.photo || null,
                name: user.name,
                type: user.type,
                role: user.role || null,
                permissions: user.permissions || [],
                status: user.status,
                created_at: user.created_at,
                updated_at: user.updated_at,
                company_id: companyId,
                subscription_status: subscriptionStatus,
                next_payment_date: nextPayment
            };

            return res.status(200).json({
                success: true,
                data: {
                    token: access_token,
                    refreshToken: refresh_token,
                    user: user_data
                }
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async sendResetPasswordOtp(req: Request, res: Response, next: NextFunction) {
        const email = req.query.email as string;
        const reset_password_token = Utils.generateVerificationToken();
        try {
            const user = await User.findOneAndUpdate(
                { email: email },
                {
                    updated_at: new Date(),
                    reset_password_token: reset_password_token,
                    reset_password_token_time: Date.now() + new Utils().MAX_TOKEN_TIME
                }
            );
            if (user) {
                await NodeMailer.sendMail({
                    to: [user.email],
                    subject: 'Redefinição de senha por e-mail, verificação por OTP.',
                    html: `<h1>Seu OTP é ${reset_password_token}</h1>`
                });
                return res.status(200).json({
                    success: true,
                    data: { message: 'Código de redefinição enviado.' }
                });
            } else {
                throw new Error('O usuário não existe');
            }
        } catch (e: any) {
            next(e);
        }
    }

    static verifyResetPasswordToken(req: Request, res: Response, next: NextFunction) {
        return res.status(200).json({
            success: true,
            data: { message: 'Token válido.' }
        });
    }

    static async resetPassword(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        if (!user) {
            return next(new Error('Contexto de usuário não encontrado para redefinição.'));
        }
        const new_password = req.body.new_password;
        try {
            const encryptedPassword = await Utils.encryptPassword(new_password);
            const updatedUser = await User.findByIdAndUpdate(
                user._id,
                {
                    updated_at: new Date(),
                    password: encryptedPassword
                },
                {
                    new: true,
                    projection: {
                        verification_token: 0,
                        verification_token_time: 0,
                        password: 0,
                        reset_password_token: 0,
                        reset_password_token_time: 0,
                        __v: 0,
                        _id: 0
                    }
                }
            );
            if (updatedUser) {
                return res.status(200).json({
                    success: true,
                    data: updatedUser
                });
            } else {
                throw new Error('O usuário não existe');
            }
        } catch (e: any) {
            next(e);
        }
    }

    static async profile(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        if (!user) {
            return next(new Error('Usuário não autenticado'));
        }
        try {
            const profile = await User.findById(user.aud);
            if (profile) {
                let companyId: string | null = profile.company_id ? String(profile.company_id) : null;
                let subscriptionStatus = 'inactive';
                let nextPayment = null;
                let planName = 'Trial';

                // FALLBACK: Garante que o ID chegue ao frontend se houver vínculo de dono
                if (!companyId && profile.type === 'company_owner') {
                    const comp = await Company.findOne({ email: profile.email }).select('_id');
                    if (comp) {
                        companyId = String(comp._id);
                        await User.findByIdAndUpdate(profile._id, { company_id: comp._id });
                    }
                }

                if (companyId) {
                    const comp: any = await Company.findById(companyId).select('subscription_status next_payment_date');

                    const subscription: any = await Subscription.findOne({ company_id: companyId })
                        .sort({ created_at: -1 })
                        .populate({ path: 'plan_id', strictPopulate: false });

                    subscriptionStatus = comp?.subscription_status || 'inactive';
                    nextPayment = comp?.next_payment_date;
                    if (subscription?.plan_id) {
                        planName = subscription.plan_id.name;
                    }
                }

                const user_data = {
                    _id: profile._id,
                    email: profile.email,
                    email_verified: profile.email_verified,
                    phone: profile.phone,
                    cpf: profile.cpf || null,
                    photo: profile.photo || null,
                    name: profile.name,
                    type: profile.type,
                    role: profile.role || null,
                    permissions: profile.permissions || [],
                    status: profile.status,
                    created_at: profile.created_at,
                    updated_at: profile.updated_at,
                    company_id: companyId,
                    subscription_status: subscriptionStatus,
                    next_payment_date: nextPayment,
                    plan: planName
                };
                // res.send(profile);
                return res.status(200).json({
                    success: true,
                    data: user_data
                });
            } else {
                throw new Error('O usuário não existe');
            }
        } catch (e: any) {
            next(e);
        }
    }

    static async updatePhoneNumber(req: Request, res: Response, next: NextFunction) {
        if (!req.user) {
            return next(new Error('Usuário não autenticado'));
        }
        const user = req.user;
        const phone = req.body.phone;
        try {
            const userData = await User.findByIdAndUpdate(
                user.aud,
                { phone: phone, updated_at: new Date() },
                {
                    new: true,
                    projection: {
                        verification_token: 0,
                        verification_token_time: 0,
                        password: 0,
                        reset_password_token: 0,
                        reset_password_token_time: 0,
                        __v: 0,
                        _id: 0
                    }
                }
            );

            if (!userData) {
                throw new Error('O usuário não existe ou não pôde ser atualizado');
            }

            return res.status(200).json({
                success: true,
                data: userData
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async updateUserProfile(req: Request, res: Response, next: NextFunction) {
        if (!req.user) {
            return next(new Error('Usuário não autenticado'));
        }
        const user = req.user;
        const phone = req.body.phone;
        const cpf = req.body.cpf; // Adicionado processamento de CPF
        const new_email = req.body.email;
        const plain_password = req.body.password;
        const verification_token = Utils.generateVerificationToken();
        try {
            const userData = await User.findById(user.aud);
            if (!userData) throw new Error('O usuário não existe');

            // Comparação robusta: ignora espaços e diferença de maiúsculas
            const emailChanged = new_email && userData.email.toLowerCase().trim() !== new_email.toLowerCase().trim();

            // REGRA: Só exige senha se estiver tentando mudar o e-mail
            if (emailChanged) {
                if (!plain_password) throw new Error('A senha atual é obrigatória para alterar o e-mail.');
                await Utils.comparePassword({
                    password: plain_password,
                    encrypt_password: userData.password!
                });
            }

            let updatePayload: any = {
                phone: phone,
                cpf: cpf ? cpf.replace(/\D/g, '') : userData.cpf, // Salva apenas números
                updated_at: new Date()
            };

            // Só altera e-mail e reseta verificação se o e-mail realmente mudou
            if (emailChanged) {
                updatePayload.email = new_email;
                updatePayload.email_verified = false;
                updatePayload.verification_token = verification_token;
                updatePayload.verification_token_time = Date.now() + new Utils().MAX_TOKEN_TIME;
            }

            const updatedUser = await User.findByIdAndUpdate(user.aud, updatePayload, {
                new: true,
                projection: {
                    verification_token: 0,
                    verification_token_time: 0,
                    password: 0,
                    reset_password_token: 0,
                    reset_password_token_time: 0,
                    __v: 0,
                    _id: 0
                }
            });

            if (!updatedUser) {
                throw new Error('Erro ao atualizar perfil: Usuário não encontrado');
            }

            // Obtém o ID diretamente do usuário atualizado
            let companyId: string | null = updatedUser.company_id ? String(updatedUser.company_id) : null;
            if (!companyId && updatedUser.type === 'company_owner') {
                const comp = await Company.findOne({ email: updatedUser.email }).select('_id');
                if (comp) {
                    companyId = String(comp._id);
                    await User.findByIdAndUpdate(updatedUser._id, { company_id: comp._id });
                }
            }

            const payload = {
                // aud: user.aud,
                email: updatedUser.email,
                type: updatedUser.type,
                ...(companyId && { company_id: companyId })
            };
            const access_token = Jwt.jwtSign(payload, user.aud);
            const refresh_token = await Jwt.jwtSignRefreshToken(payload, user.aud);
            // send email to user for updated email verification
            if (emailChanged) {
                await NodeMailer.sendMail({
                    to: [updatedUser.email],
                    subject: 'Verificação de e-mail',
                    html: `<h1>Seu OTP é ${verification_token}</h1>`
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    token: access_token,
                    refreshToken: refresh_token,
                    user: updatedUser,
                    email_changed: emailChanged // Informa ao front se deve exibir o modal de OTP
                }
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async getNewTokens(req: Request, res: Response, next: NextFunction) {
        if (!req.user) {
            return next(new Error('Usuário não autenticado'));
        }
        // const refreshToken = req.body.refreshToken;
        const decoded_data = req.user;
        try {
            if (decoded_data) {
                // O middleware auth já injetou os dados do banco em req.user (decoded_data)

                // 1. Detecção de Bot/Abuso: Verifica refreshes na última hora
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                if (!mongoose.connection.db) {
                    throw new Error('Database connection not established');
                }
                const refreshCount = await mongoose.connection.db.collection('audits').countDocuments({
                    user_id: decoded_data.aud,
                    action: 'TOKEN_REFRESHED',
                    created_at: { $gte: oneHourAgo }
                });

                // Se houver mais de 30 refreshes em 1 hora, é um comportamento suspeito
                if (refreshCount >= 30) {
                    const ip = req.ip || 'UNKNOWN_IP'; // Garante que o IP seja sempre uma string
                    // Bloqueia o IP no Redis por 24 horas (86400 segundos)
                    await Redis.setValue(`BLOCK_IP:${ip}`, 'true', 86400);

                    await AuditService.log(req, {
                        action: 'SECURITY_BOT_DETECTED',
                        module: 'AUTH',
                        severity: 'critical',
                        details: {
                            email: decoded_data.email,
                            attempts_hour: refreshCount,
                            reason: 'Refresh limit exceeded',
                            blocked_ip: ip
                        }
                    });
                    req.errorStatus = 429; // Too Many Requests
                    throw new Error('Limite de segurança atingido. Muitas solicitações de login em curto período.');
                }

                const companyId = decoded_data.company_id || null;

                // Garante que decoded_data.aud seja uma string válida
                if (!decoded_data.aud) {
                    req.errorStatus = 403;
                    throw new Error('ID do usuário ausente no token.');
                }
                const userId = String(decoded_data.aud);
                const payload = {
                    // user_id: decoded_data.aud,
                    email: decoded_data.email,
                    type: decoded_data.type,
                    ...(companyId && { company_id: companyId })
                };
                const access_token = Jwt.jwtSign(payload, userId);
                const refresh_token = await Jwt.jwtSignRefreshToken(payload, userId);

                // Registro de auditoria para renovação de sessão via Refresh Token
                await AuditService.log(req, {
                    action: 'TOKEN_REFRESHED',
                    module: 'AUTH',
                    severity: 'info',
                    details: { email: decoded_data.email, type: decoded_data.type }
                });

                return res.status(200).json({
                    success: true,
                    data: {
                        token: access_token,
                        refreshToken: refresh_token
                    }
                });
            } else {
                req.errorStatus = 403;
                throw new Error('O acesso é proibido');
            }
        } catch (e: any) {
            req.errorStatus = 403;
            next(e);
        }
    }

    static async logout(req: Request, res: Response, next: NextFunction) {
        if (!req.user) {
            return next(new Error('Usuário não autenticado'));
        }
        const decoded_data = req.user;
        try {
            if (decoded_data && decoded_data.aud) {
                // Garante que aud está presente
                // delete refresh token from redis database
                // Garante que decoded_data.aud seja uma string
                const userId = String(decoded_data.aud);
                await Redis.deleteKey(userId);

                return res.status(200).json({
                    success: true,
                    data: { message: 'Sessão encerrada com sucesso.' }
                });
            } else {
                req.errorStatus = 403;
                throw new Error('O acesso é proibido');
            }
        } catch (e: any) {
            req.errorStatus = 403;
            next(e);
        }
    }

    static async updateUserProfilePic(req: Request, res: Response, next: NextFunction) {
        if (!req.user) {
            return next(new Error('Usuário não autenticado'));
        }
        try {
            if (!req.file) {
                throw new Error('Arquivo não carregado');
            }
            const user = req.user;
            const filename = req.file.originalname.split('.').slice(0, -1).join('.');
            const resulted_path = await Cloudinary.uploadMedia(req.file, 'profileImages', filename);
            const updatedUser = await User.findByIdAndUpdate(
                user.aud,
                {
                    photo: resulted_path,
                    updated_at: new Date()
                },
                {
                    new: true,
                    projection: {
                        verification_token: 0,
                        verification_token_time: 0,
                        password: 0,
                        reset_password_token: 0,
                        reset_password_token_time: 0,
                        __v: 0,
                        _id: 0
                    }
                }
            );

            if (!updatedUser) {
                throw new Error('Erro ao atualizar imagem: Usuário não encontrado');
            }

            return res.status(200).json({
                success: true,
                data: updatedUser
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async updateFcmToken(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new Error('Usuário não autenticado');
            }
            const userId = req.user.aud; // Pego do token JWT decodificado
            const { fcm_token } = req.body;

            console.log(`📲 [FCM UPDATE]: Recebendo token para usuário ${userId}: ${fcm_token?.substring(0, 15)}...`);

            // GARANTIA: Busca o modelo na conexão principal (HubDB) para evitar erros de tenant
            const UserModel = mongoose.connection.model('users', User.schema);
            await UserModel.findByIdAndUpdate(userId, {
                fcm_token: fcm_token,
                updated_at: new Date()
            });

            return res.status(200).json({
                success: true,
                data: { message: 'Token de notificação atualizado.' }
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * PATCH /api/users/update-settings
     * Permite que o Super Admin configure o gateway global de assinaturas.
     */
    static async updateSettings(req: Request, res: Response, next: NextFunction) {
        if (!req.user) {
            return next(new Error('Usuário não autenticado'));
        }
        try {
            const userId = req.user.aud;
            const { global_payment_config } = req.body;

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { global_payment_config, updated_at: new Date() },
                { new: true }
            ).select('global_payment_config');

            return res.status(200).json({ success: true, data: updatedUser });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * GET /api/users/pos-search-customers
     * Permite que o operador do PDV pesquise por clientes cadastrados (type: 'user')
     */
    static async searchCustomersForPos(req: Request, res: Response, next: NextFunction) {
        const query = (req.query.query as string) || '';
        try {
            // Apenas contas reais do App (null) ou contas Shadow deste estabelecimento
            const filter: any = {
                type: 'user',
                $or: [{ company_id: null }, { company_id: req.company?._id }]
            };
            if (query) {
                filter.$and = [
                    {
                        $or: [
                            { name: { $regex: query, $options: 'i' } },
                            { phone: { $regex: query, $options: 'i' } },
                            { email: { $regex: query, $options: 'i' } },
                            { cpf: { $regex: query, $options: 'i' } }
                        ]
                    }
                ];
            }
            const customers = await User.find(filter).select('_id name email phone cpf photo').limit(20).lean();

            const maskedCustomers = customers.map((c: any) => {
                const isShadow = c.email && c.email.startsWith('pos_') && c.email.includes('@adegapinguins.com.br');
                if (isShadow) {
                    return {
                        ...c,
                        requires_lgpd_consent: false
                    };
                }

                // Mascarar dados para contas reais do App (LGPD)
                const maskName = (name: string) => {
                    if (!name) return '';
                    return name
                        .split(' ')
                        .map((part: string) => {
                            if (part.length <= 3) return part;
                            return part.substring(0, 3) + '*'.repeat(part.length - 3);
                        })
                        .join(' ');
                };

                const maskPhone = (phone: string) => {
                    if (!phone || phone.length < 10) return phone;
                    return phone.substring(0, 3) + '*'.repeat(phone.length - 7) + phone.substring(phone.length - 4);
                };

                return {
                    _id: c._id,
                    name: maskName(c.name),
                    phone: maskPhone(c.phone),
                    cpf: '***.***.***-**',
                    photo: c.photo,
                    requires_lgpd_consent: true
                };
            });

            return res.status(200).json({
                success: true,
                data: maskedCustomers
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * POST /api/users/pos-create-customer
     * Permite que o operador do PDV cadastre um novo cliente rapidamente (type: 'user')
     */
    static async createCustomerForPos(req: Request, res: Response, next: NextFunction) {
        const { name, phone, cpf } = req.body;
        if (!name || !phone) {
            return res.status(422).json({
                message: 'Nome e Telefone são obrigatórios para cadastro.',
                status_code: 422
            });
        }

        try {
            // Verifica se já existe um cliente com o mesmo telefone
            const existingUser = await User.findOne({ phone, type: 'user' });
            if (existingUser) {
                return res.status(200).json({
                    success: true,
                    data: {
                        _id: existingUser._id,
                        name: existingUser.name,
                        email: existingUser.email,
                        phone: existingUser.phone,
                        cpf: existingUser.cpf || null,
                        photo: existingUser.photo || null
                    }
                });
            }

            // Gera e-mail temporário e dados obrigatórios do Schema
            const tempEmail = `pos_${phone}_${Date.now()}@adegapinguins.com.br`;
            const verification_token = Utils.generateVerificationToken();
            const verification_token_time = Date.now() + new Utils().MAX_TOKEN_TIME;
            const hash = await Utils.encryptPassword('123456');

            const newUser = new User({
                company_id: req.company?._id || null,
                name,
                phone,
                email: tempEmail,
                cpf: cpf || null,
                password: hash,
                verification_token,
                verification_token_time,
                type: 'user',
                status: 'active',
                email_verified: true // Já inicia marcado como verificado para uso imediato no POS
            });

            const savedUser = await newUser.save();

            return res.status(201).json({
                success: true,
                data: {
                    _id: savedUser._id,
                    name: savedUser.name,
                    email: savedUser.email,
                    phone: savedUser.phone,
                    cpf: savedUser.cpf || null,
                    photo: savedUser.photo || null
                }
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * POST /api/users/pos-request-lgpd-otp
     * Dispara um OTP para o usuário global (App) consentir vínculo no PDV.
     */
    static async posRequestLgpdOtp(req: Request, res: Response, next: NextFunction) {
        const { customer_id } = req.body;
        try {
            const user = await User.findById(customer_id);
            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado', status_code: 404 });
            }

            // Gera um OTP de 6 dígitos numéricos
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            user.verification_token = otp;
            user.verification_token_time = new Date(Date.now() + 10 * 60 * 1000); // 10 min
            await user.save();

            try {
                await NodeMailer.sendMail({
                    to: [user.email],
                    subject: 'Código de Confirmação - Adega',
                    html: `<h1>Seu código de confirmação presencial é: <b>${otp}</b></h1><p>Informe este código ao operador do caixa.</p>`
                });
            } catch (mailError) {
                console.error('⚠️ [MAIL ERROR] LGPD OTP:', mailError);
            }

            // Simularia push notification aqui via FCM

            return res.status(200).json({
                success: true,
                data: { message: 'Código enviado com sucesso.' }
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * POST /api/users/pos-verify-lgpd-otp
     * Valida o OTP digitado pelo operador no PDV e retorna o usuário desmascarado.
     */
    static async posVerifyLgpdOtp(req: Request, res: Response, next: NextFunction) {
        const { customer_id, otp } = req.body;
        try {
            const user = await User.findOne({
                _id: customer_id,
                verification_token: otp,
                verification_token_time: { $gt: Date.now() }
            }).select('_id name email phone cpf photo');

            if (!user) {
                return res.status(422).json({ message: 'Código inválido ou expirado.', status_code: 422 });
            }

            // Opcional: A partir daqui podemos injetar uma flag no user que ele já consentiu no TenantDB.

            return res.status(200).json({
                success: true,
                data: user
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * POST /api/users/pos-verify-lgpd-cpf
     * Valida o consentimento via apresentação física de documento (CPF) no balcão.
     */
    static async posVerifyLgpdCpf(req: Request, res: Response, next: NextFunction) {
        const { customer_id, cpf } = req.body;
        try {
            const user = await User.findById(customer_id).select('_id name email phone cpf photo');

            if (!user) {
                return res.status(404).json({ message: 'Usuário não encontrado.', status_code: 404 });
            }

            if (!user.cpf || user.cpf.trim() === '') {
                return res.status(422).json({
                    message: 'Este cliente não possui CPF cadastrado no App. Utilize a validação por código OTP.',
                    status_code: 422
                });
            }

            // Normaliza os CPFs removendo pontuações
            const cleanUserCpf = user.cpf.replace(/\D/g, '');
            const cleanProvidedCpf = cpf.replace(/\D/g, '');

            if (cleanUserCpf !== cleanProvidedCpf) {
                return res.status(422).json({ message: 'O CPF informado não confere.', status_code: 422 });
            }

            return res.status(200).json({
                success: true,
                data: user
            });
        } catch (e: any) {
            next(e);
        }
    }

    // --- Super Admin Staff (Usuários Globais) ---

    static async listStaff(req: Request, res: Response, next: NextFunction) {
        try {
            const staffList = await User.find({
                type: { $in: ['super_admin', 'admin', 'company_owner', 'collaborator'] }
            })
                .populate('company_id', 'name')
                .select('-password -verification_token')
                .sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                data: staffList
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async createStaff(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, email, phone, password, type, company_id, status } = req.body;

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res
                    .status(422)
                    .json({ success: false, message: 'Já existe um usuário cadastrado com este e-mail.' });
            }

            const hash = await Utils.encryptPassword(password || '123456'); // senha padrão simples caso vazia
            const verification_token = Utils.generateVerificationToken();

            const newUser = new User({
                name,
                email,
                phone,
                type: type || 'admin',
                password: hash,
                company_id: company_id || null,
                status: status || 'active',
                email_verified: true,
                verification_token,
                verification_token_time: Date.now() + new Utils().MAX_TOKEN_TIME
            });

            await newUser.save();

            return res.status(201).json({
                success: true,
                data: newUser
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async updateStaff(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, email, phone, type, company_id, status, password } = req.body;

            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            }

            user.name = name || user.name;
            user.email = email || user.email;
            user.phone = phone || user.phone;
            user.type = type || user.type;
            user.company_id = company_id || null;
            user.status = status || user.status;

            if (password) {
                user.password = await Utils.encryptPassword(password);
            }

            await user.save();

            return res.status(200).json({
                success: true,
                data: user
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async deleteStaff(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await User.findByIdAndDelete(req.params.id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            }
            return res.status(200).json({
                success: true,
                data: null
            });
        } catch (e: any) {
            next(e);
        }
    }
}
