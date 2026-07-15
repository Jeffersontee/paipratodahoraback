import { Request, Response, NextFunction } from 'express';
import Company from '../models/company.model';

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
}
