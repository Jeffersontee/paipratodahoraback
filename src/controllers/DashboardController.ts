import { Request, Response, NextFunction } from 'express';
import Company from '../models/company.model';
import User from '../models/user.model';
import ServiceOrder from '../models/serviceorder.model';
import Subscription from '../models/subscription.model';

export class DashboardController {
    static async getStats(req: Request, res: Response, next: NextFunction) {
        try {
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
                Company.countDocuments(),
                Company.countDocuments({ active: true }),
                User.countDocuments(),
                ServiceOrder.countDocuments(),
                ServiceOrder.countDocuments({ current_status: 'CONCLUIDO' }),
                ServiceOrder.countDocuments({
                    current_status: { $in: ['AGENDADO', 'EM_DESLOCAMENTO', 'CHECK_IN', 'EM_EXECUCAO'] }
                }),
                ServiceOrder.countDocuments({ current_status: 'CANCELADO' })
            ]);

            // --- Chart: Ordens por mês (últimos 6 meses) ---
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            sixMonthsAgo.setDate(1);
            sixMonthsAgo.setHours(0, 0, 0, 0);

            const ordersByMonth = await ServiceOrder.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo } } },
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
            const companiesBySubscription = await Subscription.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // --- Chart: Ordens por status ---
            const ordersByStatus = await ServiceOrder.aggregate([
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
