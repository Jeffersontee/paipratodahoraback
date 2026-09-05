import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import ServiceOrder from '../models/serviceorder.model';
import Company from '../models/company.model';
import Unit from '../models/unit.model';
import Rating from '../models/rating.model';
import { AuditService } from '../services/AuditService';
import { NotificationService } from '../services/NotificationService';

export class ServiceOrderController {
    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const filter: any = {};
            const authUser = (req as any).user;

            // Multi-tenant & Role-based automatic filtering
            if (authUser) {
                if (authUser.type === 'super_admin' || authUser.type === 'super_staff') {
                    // Super admin: Visão global irrestrita (aceita filtros opcionais via query)
                    if (req.query.company_id) {
                        filter.company_id = req.query.company_id;
                    }
                    if (req.query.collaborator_id) {
                        filter.collaborator_id = req.query.collaborator_id;
                    }
                    if (req.query.user_id) {
                        filter.user_id = req.query.user_id;
                    }
                } else if (authUser.type === 'company_owner' || (authUser.company_id && authUser.type !== 'collaborator')) {
                    // Dono ou Staff de Empresa: Estritamente restrito à sua própria empresa
                    filter.company_id = authUser.company_id;
                    if (req.query.collaborator_id) {
                        filter.collaborator_id = req.query.collaborator_id;
                    }
                    if (req.query.user_id) {
                        filter.user_id = req.query.user_id;
                    }
                } else if (authUser.type === 'collaborator') {
                    // Colaborador / Técnico:
                    if (authUser.role === 'operator' && authUser.company_id) {
                        filter.company_id = authUser.company_id;
                    } else {
                        // Técnico de campo: estritamente suas próprias ordens de serviço
                        filter.collaborator_id = authUser._id;
                    }
                } else if (authUser.type === 'user') {
                    // Cliente final: somente suas próprias ordens
                    filter.user_id = authUser._id;
                }
            } else {
                // Fallback para requisições sem contexto de usuário (se houver query explícita)
                if (req.query.company_id) filter.company_id = req.query.company_id;
                if (req.query.collaborator_id) filter.collaborator_id = req.query.collaborator_id;
                if (req.query.user_id) filter.user_id = req.query.user_id;
            }

            // Filtro opcional por Unidade/Filial
            if (req.query.unit_id) {
                filter.unit_id = req.query.unit_id;
            }

            if (req.query.start_date || req.query.end_date) {
                filter.scheduled_date = {};
                if (req.query.start_date) {
                    filter.scheduled_date.$gte = new Date(req.query.start_date as string);
                }
                if (req.query.end_date) {
                    filter.scheduled_date.$lte = new Date(req.query.end_date as string);
                }
            }

            const orders = await ServiceOrder.find(filter)
                .populate('company_id', 'name short_name')
                .populate('unit_id', 'name address')
                .populate('service_id', 'name category icon price description')
                .populate('collaborator_id', 'name phone')
                .populate('user_id', 'name email phone')
                .sort({ createdAt: -1 });

            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(orders, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { 
                company_id, unit_id, service_id, collaborator_id, scheduled_date, notes,
                gut_gravity, gut_urgency, gut_trend 
            } = req.body;
            
            const authUser = (req as any).user;
            
            let finalCompanyId = company_id || authUser?.company_id;
            let finalUnitId = unit_id || authUser?.unit_id;

            if (!finalCompanyId) {
                const firstCompany = await Company.findOne({ active: true });
                if (firstCompany) finalCompanyId = firstCompany._id;
            }

            if (!finalUnitId && finalCompanyId) {
                const firstUnit = await Unit.findOne({ company_id: finalCompanyId });
                if (firstUnit) finalUnitId = firstUnit._id;
            }

            const userId = req.body.user_id || authUser?._id;

            const cleanCollaboratorId =
                collaborator_id === '' || collaborator_id === 'null' || collaborator_id === null
                    ? null
                    : collaborator_id;

            const initialStatus = req.body.current_status || (cleanCollaboratorId ? 'AGENDADO' : 'SOLICITADO');

            // Regra de Negócio: Não permite criar OS em deslocamento ou execução sem técnico atribuído
            const executionStatuses = ['EM_DESLOCAMENTO', 'CHECK_IN', 'EM_EXECUCAO', 'CONCLUIDO'];
            if (executionStatuses.includes(initialStatus) && !cleanCollaboratorId) {
                req.errorStatus = 422;
                throw new Error(`Não é possível definir o status '${initialStatus}' sem um técnico atribuído à Ordem de Serviço.`);
            }

            // Cálculo do score da matriz GUT (Padrão 1 se não fornecido)
            const gravity = Number(gut_gravity) || 1;
            const urgency = Number(gut_urgency) || 1;
            const trend = Number(gut_trend) || 1;
            const score = gravity * urgency * trend;

            const order = new ServiceOrder({
                company_id: finalCompanyId,
                unit_id: finalUnitId,
                service_id,
                collaborator_id: cleanCollaboratorId,
                user_id: userId,
                scheduled_date,
                current_status: initialStatus,
                timeline: [
                    {
                        status: initialStatus,
                        timestamp: new Date(),
                        notes: initialStatus === 'AGENDADO' ? 'Ordem de serviço criada e agendada.' : 'Ordem de serviço solicitada.'
                    }
                ],
                notes,
                gut_gravity: gravity,
                gut_urgency: urgency,
                gut_trend: trend,
                gut_score: score
            });

            await order.save();
            NotificationService.sendServiceOrderPush(order._id.toString(), order.current_status);
            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);
            return res.status(201).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async get(req: Request, res: Response, next: NextFunction) {
        try {
            const order = await ServiceOrder.findById(req.params.id)
                .populate('company_id')
                .populate('unit_id')
                .populate('service_id')
                .populate('collaborator_id');

            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(order, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async updateStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { status, location, notes } = req.body;

            const order = await ServiceOrder.findById(req.params.id);
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            // Regra de Negócio: Não permite avançar para deslocamento ou execução sem técnico atribuído
            const executionStatuses = ['EM_DESLOCAMENTO', 'CHECK_IN', 'EM_EXECUCAO', 'CONCLUIDO'];
            if (executionStatuses.includes(status) && !order.collaborator_id) {
                req.errorStatus = 422;
                throw new Error(`Não é possível alterar o status para '${status}' sem um técnico atribuído à Ordem de Serviço.`);
            }

            order.current_status = status;
            order.timeline.push({
                status,
                timestamp: new Date(),
                location,
                notes
            });

            if (status === 'CHECK_IN') {
                order.checkin_time = new Date();
                order.checkin_location = location;
            }

            await order.save();
            NotificationService.sendServiceOrderPush(order._id.toString(), status);

            // Grava Log de Auditoria para transição de status
            await AuditService.log(req, {
                action: `SERVICE_ORDER_STATUS_${status}`,
                module: 'service-orders',
                severity: 'info',
                details: {
                    order_id: order._id,
                    company_id: order.company_id,
                    new_status: status,
                    scheduled_date: order.scheduled_date
                }
            });

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const updateData = req.body;
            // Prevent overriding critical fields directly via generic update
            delete updateData.timeline;

            if (updateData.collaborator_id !== undefined) {
                if (
                    updateData.collaborator_id === '' ||
                    updateData.collaborator_id === 'null' ||
                    updateData.collaborator_id === null
                ) {
                    updateData.collaborator_id = null;
                }
            } else {
                delete updateData.collaborator_id;
            }

            const order = await ServiceOrder.findByIdAndUpdate(req.params.id, updateData, {
                new: true,
                runValidators: true
            });

            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            // Grava Log de Auditoria para Atualização de Propriedades
            await AuditService.log(req, {
                action: 'SERVICE_ORDER_UPDATE',
                module: 'service-orders',
                severity: 'info',
                details: {
                    order_id: order._id,
                    company_id: order.company_id,
                    update_keys: Object.keys(updateData),
                    current_status: order.current_status
                }
            });

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const order = await ServiceOrder.findByIdAndDelete(req.params.id);
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }
            return res.status(200).json({
                success: true,
                data: null
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async assignTechnician(req: Request, res: Response, next: NextFunction) {
        try {
            const { collaborator_id, scheduled_date } = req.body;
            const order = await ServiceOrder.findById(req.params.id);

            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            // Se já existia um técnico designado, validar a regra de 8 horas para a troca
            if (order.collaborator_id && String(order.collaborator_id) !== String(collaborator_id)) {
                if (order.scheduled_date) {
                    const now = new Date();
                    const scheduledTime = new Date(order.scheduled_date);
                    const hoursDifference = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                    if (hoursDifference < 8) {
                        req.errorStatus = 422;
                        throw new Error('A troca de técnico só é permitida se faltar mais de 8 horas para o início do atendimento.');
                    }
                }
            }

            if (scheduled_date) {
                order.scheduled_date = new Date(scheduled_date);
            }

            const isNewAssignment = !order.collaborator_id;
            order.collaborator_id = collaborator_id || null;
            order.current_status = 'AGENDADO';
            
            order.timeline.push({
                status: 'AGENDADO',
                timestamp: new Date(),
                notes: isNewAssignment ? 'Técnico designado para a ordem de serviço.' : 'Técnico alterado pelo Super Admin.'
            });

            await order.save();
            NotificationService.sendServiceOrderPush(order._id.toString(), 'AGENDADO');

            // Grava Log de Auditoria
            await AuditService.log(req, {
                action: 'SERVICE_ORDER_ASSIGN_TECHNICIAN',
                module: 'service-orders',
                severity: 'info',
                details: {
                    order_id: order._id,
                    company_id: order.company_id,
                    collaborator_id: collaborator_id
                }
            });

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async acceptSchedule(req: Request, res: Response, next: NextFunction) {
        try {
            const order = await ServiceOrder.findById(req.params.id);
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            if (order.proposed_date) {
                order.scheduled_date = order.proposed_date;
                order.proposed_date = undefined;
            }
            order.schedule_pending_client_approval = false;
            order.current_status = 'APROVADO';
            
            order.timeline.push({
                status: 'APROVADO',
                timestamp: new Date(),
                notes: 'Lojista/User confirmou e aprovou o agendamento.'
            });

            await order.save();
            NotificationService.sendServiceOrderPush(order._id.toString(), 'AGENDADO');

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async proposeNewSchedule(req: Request, res: Response, next: NextFunction) {
        try {
            const { new_date } = req.body;
            const order = await ServiceOrder.findById(req.params.id);
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            order.proposed_date = new Date(new_date);
            order.schedule_pending_client_approval = true;
            order.current_status = 'SOLICITADO';
            
            order.timeline.push({
                status: 'SOLICITADO',
                timestamp: new Date(),
                notes: `Lojista/User recusou agendamento e propôs nova data: ${new Date(new_date).toLocaleString('pt-BR')}`
            });

            await order.save();
            NotificationService.sendServiceOrderPush(order._id.toString(), 'SOLICITADO');

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async cancelOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { reason } = req.body;
            const order = await ServiceOrder.findById(req.params.id);
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            order.current_status = 'CANCELADO';
            order.timeline.push({
                status: 'CANCELADO',
                timestamp: new Date(),
                notes: reason ? `Ordem de serviço cancelada pelo solicitante. Motivo: ${reason}` : 'Ordem de serviço cancelada pelo solicitante.'
            });

            await order.save();
            NotificationService.sendServiceOrderPush(order._id.toString(), 'CANCELADO');

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async reportTransitIssue(req: Request, res: Response, next: NextFunction) {
        try {
            const { reason } = req.body;
            const order = await ServiceOrder.findById(req.params.id);
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            order.is_transit_impeded = true;
            order.transit_issue_reason = reason;
            
            order.timeline.push({
                status: 'EM_DESLOCAMENTO',
                timestamp: new Date(),
                notes: `Técnico relatou problema no trajeto: ${reason}`
            });

            await order.save();
            NotificationService.sendServiceOrderPush(order._id.toString(), 'TRANSIT_ISSUE', reason);

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async resolveTransitIssue(req: Request, res: Response, next: NextFunction) {
        try {
            const order = await ServiceOrder.findById(req.params.id);
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            order.is_transit_impeded = false;
            order.transit_issue_reason = undefined;

            order.timeline.push({
                status: 'EM_DESLOCAMENTO',
                timestamp: new Date(),
                notes: 'Problema no trajeto resolvido. Técnico continuou deslocamento.'
            });

            await order.save();
            NotificationService.sendServiceOrderPush(order._id.toString(), 'EM_DESLOCAMENTO');

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async reportExecutionImpediment(req: Request, res: Response, next: NextFunction) {
        try {
            const { reason } = req.body;
            const order = await ServiceOrder.findById(req.params.id);
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            order.is_execution_impeded = true;
            order.impediment_reason = reason;

            order.timeline.push({
                status: 'EM_EXECUCAO',
                timestamp: new Date(),
                notes: `Execução impedida pelo técnico. Motivo: ${reason}`
            });

            await order.save();
            NotificationService.sendServiceOrderPush(order._id.toString(), 'EXECUTION_IMPEDIMENT', reason);

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async addAditive(req: Request, res: Response, next: NextFunction) {
        try {
            const { description, service_id } = req.body;
            const order = await ServiceOrder.findById(req.params.id);
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            if (!order.aditives) {
                order.aditives = [];
            }
            order.aditives.push({
                description,
                service_id: service_id ? new Types.ObjectId(service_id) : undefined
            });

            await order.save();

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async checkoutOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { notes, observations, images_url } = req.body;
            const order = await ServiceOrder.findById(req.params.id);
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            order.current_status = 'RELATORIO_CHECKOUT';
            order.notes = notes;
            order.observations = observations;
            if (images_url) {
                order.images_url = images_url;
            }
            order.checkout_time = new Date();

            order.timeline.push({
                status: 'RELATORIO_CHECKOUT',
                timestamp: new Date(),
                notes: 'Técnico preencheu o relatório e efetuou checkout. Aguardando assinatura presencial por até 10 minutos.'
            });

            await order.save();
            NotificationService.sendServiceOrderPush(order._id.toString(), 'RELATORIO_CHECKOUT');

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async evaluateOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { follower_signature, stars, comment } = req.body;
            const order = await ServiceOrder.findById(req.params.id);
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            order.current_status = 'CONCLUIDO';
            order.follower_signature = follower_signature;
            order.client_comment = comment;
            order.client_stars = stars ? Number(stars) : undefined;
            
            order.timeline.push({
                status: 'CONCLUIDO',
                timestamp: new Date(),
                notes: 'Ordem de serviço finalizada e assinada pelo cliente.'
            });

            await order.save();
            NotificationService.sendServiceOrderPush(order._id.toString(), 'CONCLUIDO');

            // Salva a avaliação anônima para o técnico se fornecida
            if (stars) {
                const rating = new Rating({
                    service_order_id: order._id,
                    company_id: order.company_id,
                    stars: Number(stars),
                    comment: comment
                });
                await rating.save();
            }

            const populated = await order.populate([
                { path: 'company_id' },
                { path: 'unit_id' },
                { path: 'service_id' },
                { path: 'collaborator_id' }
            ]);
            const sanitized = ServiceOrderController.sanitizeServiceOrdersForUser(populated, (req as any).user?.type);

            return res.status(200).json({
                success: true,
                data: sanitized
            });
        } catch (e: any) {
            next(e);
        }
    }

    private static sanitizeServiceOrdersForUser(orders: any | any[], userType: string): any {
        const hideClientPrice = userType === 'collaborator';

        const sanitizeOrder = (order: any) => {
            const doc = typeof order.toObject === 'function' ? order.toObject() : order;
            if (hideClientPrice) {
                delete doc.client_price;
                delete doc.client_price_addition;
                if (!doc.show_to_technician) {
                    delete doc.client_comment;
                    delete doc.client_stars;
                }
            }
            return doc;
        };

        if (Array.isArray(orders)) {
            return orders.map(sanitizeOrder);
        }
        return sanitizeOrder(orders);
    }
}
