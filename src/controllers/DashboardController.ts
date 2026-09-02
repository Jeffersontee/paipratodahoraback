import { Request, Response, NextFunction } from 'express';
import Company from '../models/company.model';
import User from '../models/user.model';
import ServiceOrder from '../models/serviceorder.model';
import Subscription from '../models/subscription.model';

export class DashboardController {
    static async getStats(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.query.company_id ? String(req.query.company_id) : undefined;
            const companyFilter = companyId ? { _id: companyId } : {};
            const orderFilter = companyId ? { company_id: companyId } : {};
            const userFilter = companyId ? { company_id: companyId } : {};

            // --- KPIs ---
            const [
                totalCompanies,
                activeCompanies,
                totalUsers,
                totalOrders,
                completedOrders,
                pendingOrders,
                canceledOrders
            ] = await Promise.all([
                Company.countDocuments(companyFilter),
                Company.countDocuments({ ...companyFilter, active: true }),
                User.countDocuments(userFilter),
                ServiceOrder.countDocuments(orderFilter),
                ServiceOrder.countDocuments({ ...orderFilter, current_status: 'CONCLUIDO' }),
                ServiceOrder.countDocuments({
                    ...orderFilter,
                    current_status: { $in: ['AGENDADO', 'EM_DESLOCAMENTO', 'CHECK_IN', 'EM_EXECUCAO'] }
                }),
                ServiceOrder.countDocuments({ ...orderFilter, current_status: 'CANCELADO' })
            ]);

            // --- Chart: Ordens por mês (últimos 6 meses) ---
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            sixMonthsAgo.setDate(1);
            sixMonthsAgo.setHours(0, 0, 0, 0);

            const matchMonth: any = { createdAt: { $gte: sixMonthsAgo } };
            if (companyId) matchMonth.company_id = companyId;

            const ordersByMonth = await ServiceOrder.aggregate([
                { $match: matchMonth },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        total: { $sum: 1 },
                        completed: {
                            $sum: { $cond: [{ $eq: ['$current_status', 'CONCLUIDO'] }, 1, 0] }
                        }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);

            // --- Chart: Empresas por status de assinatura ---
            const matchSub: any = {};
            if (companyId) matchSub.company_id = companyId;

            const companiesBySubscription = await Subscription.aggregate([
                ...(companyId ? [{ $match: matchSub }] : []),
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // --- Chart: Ordens por status ---
            const matchStatus: any = {};
            if (companyId) matchStatus.company_id = companyId;

            const ordersByStatus = await ServiceOrder.aggregate([
                ...(companyId ? [{ $match: matchStatus }] : []),
                {
                    $group: {
                        _id: '$current_status',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            return res.status(200).json({
                success: true,
                data: {
                    kpis: {
                        totalCompanies,
                        activeCompanies,
                        totalUsers,
                        totalOrders,
                        completedOrders,
                        pendingOrders,
                        canceledOrders
                    },
                    charts: {
                        ordersByMonth,
                        companiesBySubscription,
                        ordersByStatus
                    }
                }
            });
        } catch (e: any) {
            next(e);
        }
    }
}
