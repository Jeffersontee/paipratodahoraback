import { Request, Response, NextFunction } from 'express';
import Unit from '../models/Unit.model';

export class UnitController {
    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const filter: any = {};
            if (req.query.company_id) {
                filter.company_id = req.query.company_id;
            }
            const units = await Unit.find(filter)
                .populate('manager_id', 'name phone email')
                .populate('follower_ids', 'name phone email')
                .sort({ createdAt: -1 });
            return res.status(200).json({
                success: true,
                data: units
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, company_id, address, manager_id, follower_ids, status, cnpj, phone, email, short_name } = req.body;
            
            const unit = new Unit({
                name,
                company_id,
                address,
                manager_id,
                follower_ids,
                status,
                cnpj,
                phone,
                email,
                short_name
            });

            await unit.save();
            return res.status(201).json({
                success: true,
                data: unit
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async get(req: Request, res: Response, next: NextFunction) {
        try {
            const unit = await Unit.findById(req.params.id)
                .populate('manager_id', 'name phone email')
                .populate('follower_ids', 'name phone email');
            if (!unit) {
                return res.status(404).json({ success: false, message: 'Unit not found' });
            }
            return res.status(200).json({
                success: true,
                data: unit
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, company_id, address, manager_id, follower_ids, status, cnpj, phone, email, short_name } = req.body;
            const unit = await Unit.findByIdAndUpdate(
                req.params.id,
                { name, company_id, address, manager_id, follower_ids, status, cnpj, phone, email, short_name },
                { new: true, runValidators: true }
            );

            if (!unit) {
                return res.status(404).json({ success: false, message: 'Unit not found' });
            }

            return res.status(200).json({
                success: true,
                data: unit
            });
        } catch (e: any) {
            next(e);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const unit = await Unit.findByIdAndDelete(req.params.id);
            if (!unit) {
                return res.status(404).json({ success: false, message: 'Unit not found' });
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
