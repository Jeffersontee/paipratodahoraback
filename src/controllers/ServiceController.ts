import { Request, Response, NextFunction } from 'express';
import Service from '../models/Service.model';

export class ServiceController {
    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const services = await Service.find().sort({ createdAt: -1 });
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
            const { name, description, icon, category, price, status } = req.body;
            
            const service = new Service({
                name,
                description,
                icon,
                category,
                price,
                status
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
            const { name, description, icon, category, price, status } = req.body;
            const service = await Service.findByIdAndUpdate(
                req.params.id,
                { name, description, icon, category, price, status },
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
