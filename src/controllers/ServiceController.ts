import { Request, Response, NextFunction } from 'express';
import Service from '../models/Service.model';

export class ServiceController {
    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const filter: any = {};
            if (req.query.company_id) {
                filter.company_id = req.query.company_id;
            }
            const services = await Service.find(filter).sort({ createdAt: -1 });
            return res.status(200).json({
                success: true,
                data: services
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, icon, category, price, status, company_id } = req.body;
            
            const service = new Service({
                name,
                description,
                icon,
                category,
                price,
                status,
                company_id
            });

            await service.save();
            return res.status(201).json({
                success: true,
                data: service
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async get(req: Request, res: Response, next: NextFunction) {
        try {
            const service = await Service.findById(req.params.id);
            if (!service) {
                req.errorStatus = 404;
                throw new Error('Service not found');
            }
            return res.status(200).json({
                success: true,
                data: service
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, icon, category, price, status, company_id } = req.body;
            const service = await Service.findByIdAndUpdate(
                req.params.id,
                { name, description, icon, category, price, status, company_id },
                { new: true, runValidators: true }
            );

            if (!service) {
                req.errorStatus = 404;
                throw new Error('Service not found');
            }

            return res.status(200).json({
                success: true,
                data: service
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const service = await Service.findByIdAndDelete(req.params.id);
            if (!service) {
                req.errorStatus = 404;
                throw new Error('Service not found');
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
