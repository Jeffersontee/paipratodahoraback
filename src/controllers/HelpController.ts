import { Request, Response } from 'express';
import HelpCategory from '../models/HelpCategory';
import { Utils } from '../utils/Utils';

class HelpController {
    /**
     * @route GET /help
     * @description Lista todas as categorias e tópicos de ajuda (público para usuários logados/lojistas)
     */
    async getHelpCategories(req: Request, res: Response): Promise<void> {
        try {
            const categories = await HelpCategory.find().sort({ order: 1 });
            res.status(200).json({ success: true, data: categories });
        } catch (error) {
            console.error( 'HelpController.getHelpCategories', String(error));
            res.status(500).json({ success: false, message: 'Erro ao buscar categorias de ajuda' });
        }
    }

    /**
     * @route POST /super-admin/help
     * @description Cria uma nova categoria de ajuda
     */
    async createCategory(req: Request, res: Response): Promise<void> {
        try {
            const { id, title, icon, order } = req.body;
            
            const existing = await HelpCategory.findOne({ id });
            if (existing) {
                res.status(422).json({ success: false, message: 'Já existe uma categoria com este ID' });
                return;
            }

            const category = new HelpCategory({ id, title, icon, order });
            await category.save();

            res.status(201).json({ success: true, data: category });
        } catch (error) {
            console.error( 'HelpController.createCategory', String(error));
            res.status(500).json({ success: false, message: 'Erro ao criar categoria de ajuda' });
        }
    }

    /**
     * @route PUT /super-admin/help/:id
     * @description Atualiza uma categoria de ajuda
     */
    async updateCategory(req: Request, res: Response): Promise<void> {
        try {
            const { title, icon, order } = req.body;
            const category = await HelpCategory.findOneAndUpdate(
                { _id: req.params.id },
                { title, icon, order },
                { new: true }
            );

            if (!category) {
                res.status(404).json({ success: false, message: 'Categoria não encontrada' });
                return;
            }

            res.status(200).json({ success: true, data: category });
        } catch (error) {
            console.error( 'HelpController.updateCategory', String(error));
            res.status(500).json({ success: false, message: 'Erro ao atualizar categoria de ajuda' });
        }
    }

    /**
     * @route DELETE /super-admin/help/:id
     * @description Deleta uma categoria de ajuda
     */
    async deleteCategory(req: Request, res: Response): Promise<void> {
        try {
            const category = await HelpCategory.findByIdAndDelete(req.params.id);
            if (!category) {
                res.status(404).json({ success: false, message: 'Categoria não encontrada' });
                return;
            }
            res.status(200).json({ success: true, data: category });
        } catch (error) {
            console.error( 'HelpController.deleteCategory', String(error));
            res.status(500).json({ success: false, message: 'Erro ao deletar categoria de ajuda' });
        }
    }

    /**
     * @route POST /super-admin/help/:id/topics
     * @description Adiciona um tópico a uma categoria
     */
    async addTopic(req: Request, res: Response): Promise<void> {
        try {
            const { id, title, content } = req.body; // topic id
            const category = await HelpCategory.findById(req.params.id);

            if (!category) {
                res.status(404).json({ success: false, message: 'Categoria não encontrada' });
                return;
            }

            // Verifica se o ID do tópico já existe na categoria
            if (category.topics.some((t: any) => t.id === id)) {
                res.status(422).json({ success: false, message: 'Já existe um tópico com este ID nesta categoria' });
                return;
            }

            category.topics.push({ id, title, content });
            await category.save();

            res.status(201).json({ success: true, data: category });
        } catch (error) {
            console.error( 'HelpController.addTopic', String(error));
            res.status(500).json({ success: false, message: 'Erro ao adicionar tópico' });
        }
    }

    /**
     * @route PUT /super-admin/help/:categoryId/topics/:topicId
     * @description Atualiza um tópico
     */
    async updateTopic(req: Request, res: Response): Promise<void> {
        try {
            const { id, title, content } = req.body;
            const category = await HelpCategory.findOneAndUpdate(
                { _id: req.params.categoryId, 'topics._id': req.params.topicId },
                {
                    $set: {
                        'topics.$.id': id,
                        'topics.$.title': title,
                        'topics.$.content': content
                    }
                },
                { new: true }
            );

            if (!category) {
                res.status(404).json({ success: false, message: 'Categoria ou tópico não encontrado' });
                return;
            }

            res.status(200).json({ success: true, data: category });
        } catch (error) {
            console.error( 'HelpController.updateTopic', String(error));
            res.status(500).json({ success: false, message: 'Erro ao atualizar tópico' });
        }
    }

    /**
     * @route DELETE /super-admin/help/:categoryId/topics/:topicId
     * @description Remove um tópico
     */
    async deleteTopic(req: Request, res: Response): Promise<void> {
        try {
            const category = await HelpCategory.findByIdAndUpdate(
                req.params.categoryId,
                { $pull: { topics: { _id: req.params.topicId } } },
                { new: true }
            );

            if (!category) {
                res.status(404).json({ success: false, message: 'Categoria não encontrada' });
                return;
            }

            res.status(200).json({ success: true, data: category });
        } catch (error) {
            console.error( 'HelpController.deleteTopic', String(error));
            res.status(500).json({ success: false, message: 'Erro ao deletar tópico' });
        }
    }
}

export default new HelpController();
