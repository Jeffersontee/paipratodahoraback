import nodeMailer from 'nodemailer';
import sendgridTransport from 'nodemailer-sendgrid-transport';
import { getEnvironmentVariables } from '../../environments/enviroment';

export class NodeMailer {
    private static transporter: nodeMailer.Transporter;

    private static initiateTransport() {
        try {
            const config = getEnvironmentVariables().sendgrid;
            if (!config) {
                throw new Error('Configuração do SendGrid não encontrada nas variáveis de ambiente.');
            }

            if (!NodeMailer.transporter) {
                NodeMailer.transporter = nodeMailer.createTransport(
                    sendgridTransport({
                        auth: {
                            api_key: config.api_key! // Non-null assertion, pois é uma variável de ambiente obrigatória
                        }
                    })
                );
            }
            return NodeMailer.transporter;
        } catch (e) {
            console.error('❌ [NODEMAILER ERROR]: Falha ao iniciar transporte:', e);
            throw e;
        }
    }

    static sendMail(data: { to: string[]; subject: string; html: string }): Promise<any> {
        const config = getEnvironmentVariables().sendgrid;
        if (!config) {
            throw new Error('Configuração do SendGrid não encontrada nas variáveis de ambiente.');
        }

        return NodeMailer.initiateTransport().sendMail({
            from: config.email_from!, // Non-null assertion, pois é uma variável de ambiente obrigatória
            to: data.to,
            subject: data.subject,
            html: data.html
        });
    }
}
