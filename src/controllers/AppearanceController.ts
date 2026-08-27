import { Request, Response } from 'express';
import Appearance from '../models/appearance.model';

class AppearanceController {
  
  /**
   * Obtém a aparência com base no contexto (GLOBAL ou COMPANY)
   */
  public async getAppearance(req: Request, res: Response): Promise<void> {
    try {
      const { tenant_type, company_id } = req.query;

      if (!tenant_type || (tenant_type !== 'GLOBAL' && tenant_type !== 'COMPANY')) {
        res.status(400).json({ success: false, message: 'Invalid tenant_type. Must be GLOBAL or COMPANY.' });
        return;
      }

      if (tenant_type === 'COMPANY' && !company_id) {
        res.status(400).json({ success: false, message: 'company_id is required for COMPANY tenant_type.' });
        return;
      }

      let appearance = await Appearance.findOne(
        tenant_type === 'GLOBAL' ? { tenant_type: 'GLOBAL' } : { tenant_type: 'COMPANY', company_id }
      );

      // Se não existir, retorna um objeto padrão
      if (!appearance) {
        appearance = new Appearance({
          tenant_type,
          company_id: tenant_type === 'COMPANY' ? company_id : undefined,
          theme: 'light',
          primary_color: '#1d4ed8',
          logo_url: '',
          background_url: ''
        });
      }

      res.status(200).json({ success: true, data: appearance });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Atualiza ou cria a aparência
   */
  public async updateAppearance(req: Request, res: Response): Promise<void> {
    try {
      const { tenant_type, company_id, theme, primary_color, logo_url, background_url } = req.body;

      if (!tenant_type || (tenant_type !== 'GLOBAL' && tenant_type !== 'COMPANY')) {
        res.status(400).json({ success: false, message: 'Invalid tenant_type. Must be GLOBAL or COMPANY.' });
        return;
      }

      if (tenant_type === 'COMPANY' && !company_id) {
        res.status(400).json({ success: false, message: 'company_id is required for COMPANY tenant_type.' });
        return;
      }

      const query = tenant_type === 'GLOBAL' ? { tenant_type: 'GLOBAL' } : { tenant_type: 'COMPANY', company_id };

      const appearance = await Appearance.findOneAndUpdate(
        query,
        {
          tenant_type,
          company_id: tenant_type === 'COMPANY' ? company_id : undefined,
          theme,
          primary_color,
          logo_url,
          background_url
        },
        { new: true, upsert: true }
      );

      res.status(200).json({ success: true, data: appearance });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new AppearanceController();
