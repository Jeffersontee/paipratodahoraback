import { Request, Response, NextFunction } from 'express';
import ServiceOrder from '../models/serviceorder.model';
import { AuditService } from '../services/AuditService';

export class ServiceOrderController {
    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const filter: any = {};
            if (req.query.company_id) {
                filter.company_id = req.query.company_id;
            }
            if (req.query.unit_id) {
                filter.unit_id = req.query.unit_id;
            }
            if (req.query.collaborator_id) {
                filter.collaborator_id = req.query.collaborator_id;
            }

            const orders = await ServiceOrder.find(filter)
                .populate('company_id', 'name short_name')
                .populate('unit_id', 'name address')
                .populate('service_id', 'name category icon')
                .populate('collaborator_id', 'name phone')
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
            const { company_id, unit_id, service_id, collaborator_id, scheduled_date, notes } = req.body;
            const cleanCollaboratorId =
                collaborator_id === '' || collaborator_id === 'null' || collaborator_id === null
                    ? null
                    : collaborator_id;

            const initialStatus = req.body.current_status || (cleanCollaboratorId ? 'AGENDADO' : 'SOLICITADO');

            const order = new ServiceOrder({
                company_id,
                unit_id,
                service_id,
                collaborator_id: cleanCollaboratorId,
                scheduled_date,
                current_status: initialStatus,
                timeline: [
                    {
                        status: initialStatus,
                        timestamp: new Date(),
                        notes: initialStatus === 'AGENDADO' ? 'Ordem de serviço criada e agendada.' : 'Ordem de serviço solicitada.'
                    }
                ],
                notes
            });

            await order.save();
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

            if (
                updateData.collaborator_id === '' ||
                updateData.collaborator_id === 'null' ||
                !updateData.collaborator_id
            ) {
                updateData.collaborator_id = null;
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

    private static sanitizeServiceOrdersForUser(orders: any | any[], userType: string): any {
        const hideClientPrice = userType === 'collaborator';

        const sanitizeOrder = (order: any) => {
            const doc = typeof order.toObject === 'function' ? order.toObject() : order;
            if (hideClientPrice) {
                delete doc.client_price;
                delete doc.client_price_addition;
            }
            return doc;
        };

        if (Array.isArray(orders)) {
            return orders.map(sanitizeOrder);
        }
        return sanitizeOrder(orders);
    }
}
