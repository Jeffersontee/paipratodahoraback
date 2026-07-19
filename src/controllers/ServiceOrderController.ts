import { Request, Response, NextFunction } from 'express';
import ServiceOrder from '../models/ServiceOrder.model';

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
                .populate('unit_id', 'name address')
                .populate('service_id', 'name category icon')
                .populate('collaborator_id', 'name phone')
                .sort({ createdAt: -1 });
                
            return res.status(200).json({
                success: true,
                data: orders
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { company_id, unit_id, service_id, collaborator_id, scheduled_date, notes } = req.body;
            const cleanCollaboratorId = (collaborator_id === "" || collaborator_id === "null" || collaborator_id === null) ? null : collaborator_id;
            
            const order = new ServiceOrder({
                company_id,
                unit_id,
                service_id,
                collaborator_id: cleanCollaboratorId,
                scheduled_date,
                current_status: 'AGENDADO',
                timeline: [{
                    status: 'AGENDADO',
                    timestamp: new Date(),
                    notes: 'Ordem de serviço criada e agendada.'
                }],
                notes
            });

            await order.save();
            return res.status(201).json({
                success: true,
                data: order
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async get(req: Request, res: Response, next: NextFunction) {
        try {
            const order = await ServiceOrder.findById(req.params.id)
                .populate('unit_id')
                .populate('service_id')
                .populate('collaborator_id');
                
            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }
            return res.status(200).json({
                success: true,
                data: order
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

            return res.status(200).json({
                success: true,
                data: order
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

            if (updateData.collaborator_id === '' || updateData.collaborator_id === 'null' || !updateData.collaborator_id) {
                updateData.collaborator_id = null;
            }
            
            const order = await ServiceOrder.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true, runValidators: true }
            );

            if (!order) {
                req.errorStatus = 404;
                throw new Error('ServiceOrder not found');
            }

            return res.status(200).json({
                success: true,
                data: order
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
}
