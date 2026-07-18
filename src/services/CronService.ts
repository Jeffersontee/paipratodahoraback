import cron from 'node-cron';
import Banner from '../models/banner.model';
import Company from '../models/company.model';
import { NotificationService } from './NotificationService';
import { PaymentOnboardingController } from '../controllers/PaymentOnboardingController';
import { InvoiceController } from '../controllers/InvoiceController';

export class CronService {
    static start() {
        // Agenda para rodar todos os dias às 09:00 da manhã
        cron.schedule('0 9 * * *', async () => {
            console.log('⏰ [CRON]: Verificando expiração de banners...');

            const now = new Date();
            // Janela de 24h a 48h para dar tempo do lojista agir
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const nextDay = new Date(now.getTime() + 48 * 60 * 60 * 1000);

            const expiringSoon = await Banner.find({
                expires_at: { $gte: tomorrow, $lte: nextDay },
                status: true,
                company_id: { $ne: null }
            });

            for (const banner of expiringSoon) {
                if (banner.company_id) {
                    await NotificationService.sendBannerExpiryPush(
                        banner.company_id.toString(),
                        banner._id.toString()
                    );
                }
            }
        });

        // Faturamento Preventivo (Roda toda madrugada às 01:00)
        cron.schedule('0 1 * * *', async () => {
            console.log('⏰ [CRON]: Iniciando faturamento preventivo...');
            try {
                await InvoiceController.generatePreventiveInvoices();
            } catch (error) {
                console.error('❌ [CRON ERROR]: Falha no faturamento preventivo:', error);
            }
        });

        // Verificação de Faturas Vencidas (Roda toda madrugada às 02:00)
        cron.schedule('0 2 * * *', async () => {
            console.log('⏰ [CRON]: Iniciando rotina de faturas...');
            await InvoiceController.processOverdueInvoices();
        });

        // Renovação de Tokens Mercado Pago (Roda toda madrugada às 03:00)
        cron.schedule('0 3 * * *', async () => {
            console.log('⏰ [CRON]: Verificando renovação de tokens Mercado Pago...');
            try {
                // Define margem de segurança de 150 dias (tokens MP duram 180)
                const safetyMargin = new Date();
                safetyMargin.setDate(safetyMargin.getDate() - 150);

                // Busca estabelecimentos que usam MP e não renovam há mais de 150 dias
                const companys = await Company.find({
                    'payment_config.mercado_pago.refresh_token': { $exists: true },
                    'payment_config.mercado_pago.last_authorization': { $lt: safetyMargin }
                });

                console.log(`📡 [CRON]: Encontrados ${companys.length} tokens para renovar.`);

                for (const est of companys) {
                    await PaymentOnboardingController.refreshMPToken(est);
                    console.log(`✅ [CRON]: Token renovado com sucesso para: ${est.name}`);
                }
            } catch (error) {
                console.error('❌ [CRON ERROR]: Falha na rotina de renovação de tokens MP:', error);
            }
        });
    }
}
