import { Request, Response, NextFunction } from 'express';
import Address from '../models/address.model';
import Company from '../models/company.model';
import Unit from '../models/unit.model';
import { GeoUtils } from '../utils/GeoUtils';

export class AddressController {
    /**
     * Lista todos os endereços do usuário autenticado
     */
    static async getUserAddresses(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.aud || (req as any).user?._id || req.query.user_id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado.'
                });
            }

            const addresses = await Address.find({ user_id: userId })
                .sort({ is_default: -1, createdAt: -1 });

            return res.status(200).json({
                success: true,
                data: {
                    addresses
                }
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * Cria um novo endereço
     */
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.aud || (req as any).user?._id || req.body.user_id;
            const {
                title,
                zipcode,
                street,
                number,
                complement,
                neighborhood,
                city,
                state,
                address,
                house,
                landmark,
                lat,
                lng,
                is_default,
                company_id,
                unit_id
            } = req.body;

            const parsedLat = (lat !== undefined && lat !== null && !isNaN(Number(lat)) && Number(lat) !== 0) ? Number(lat) : -23.55052;
            const parsedLng = (lng !== undefined && lng !== null && !isNaN(Number(lng)) && Number(lng) !== 0) ? Number(lng) : -46.633308;

            const formattedAddress = address || [street, number, neighborhood, city, state].filter(Boolean).join(', ');

            // Se for marcado como padrão ou for o primeiro endereço do usuário
            let shouldBeDefault = Boolean(is_default);
            if (userId) {
                const existingCount = await Address.countDocuments({ user_id: userId });
                if (existingCount === 0) {
                    shouldBeDefault = true;
                } else if (shouldBeDefault) {
                    await Address.updateMany({ user_id: userId }, { is_default: false });
                }
            }

            const newAddress = new Address({
                user_id: userId || null,
                company_id: company_id || null,
                unit_id: unit_id || null,
                title: title || 'Endereço Principal',
                zipcode: zipcode || '',
                street: street || '',
                number: number || house || '',
                complement: complement || '',
                neighborhood: neighborhood || '',
                city: city || '',
                state: state || '',
                address: formattedAddress,
                house: house || number || '',
                landmark: landmark || '',
                lat: parsedLat,
                lng: parsedLng,
                is_default: shouldBeDefault
            });

            await newAddress.save();

            return res.status(201).json({
                success: true,
                data: newAddress
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * Retorna endereço por ID
     */
    static async get(req: Request, res: Response, next: NextFunction) {
        try {
            const address = await Address.findById(req.params.id);
            if (!address) {
                return res.status(404).json({
                    success: false,
                    message: 'Endereço não encontrado.'
                });
            }
            return res.status(200).json({
                success: true,
                data: address
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * Atualiza um endereço existente
     */
    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.aud || (req as any).user?._id;
            const updateData = { ...req.body };

            if (updateData.is_default && userId) {
                await Address.updateMany({ user_id: userId, _id: { $ne: id } }, { is_default: false });
            }

            if (!updateData.address && (updateData.street || updateData.number)) {
                updateData.address = [
                    updateData.street,
                    updateData.number || updateData.house,
                    updateData.neighborhood,
                    updateData.city,
                    updateData.state
                ].filter(Boolean).join(', ');
            }

            const updated = await Address.findByIdAndUpdate(id, updateData, { new: true });
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message: 'Endereço não encontrado.'
                });
            }

            return res.status(200).json({
                success: true,
                data: updated
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * Exclui um endereço
     */
    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const deleted = await Address.findByIdAndDelete(id);
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Endereço não encontrado.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Endereço excluído com sucesso.'
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * Define um endereço como padrão
     */
    static async setDefault(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.aud || (req as any).user?._id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado.'
                });
            }

            await Address.updateMany({ user_id: userId }, { is_default: false });
            const updated = await Address.findByIdAndUpdate(id, { is_default: true }, { new: true });

            return res.status(200).json({
                success: true,
                data: updated
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * Checa se já existe endereço cadastrado próximo ou com as coordenadas fornecidas
     */
    static async checkAddress(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.aud || (req as any).user?._id;
            const { lat, lng } = req.query;

            if (!lat || !lng) {
                return res.status(400).json({
                    success: false,
                    message: 'Latitude e longitude são obrigatórias.'
                });
            }

            const parsedLat = Number(lat);
            const parsedLng = Number(lng);

            // Busca exata ou por proximidade de 50 metros
            const existing = await Address.findOne({
                user_id: userId,
                lat: { $gte: parsedLat - 0.0005, $lte: parsedLat + 0.0005 },
                lng: { $gte: parsedLng - 0.0005, $lte: parsedLng + 0.0005 }
            });

            return res.status(200).json({
                success: true,
                data: existing || null
            });
        } catch (e: any) {
            next(e);
        }
    }

    /**
     * Validação de Raio de Cobertura (Geofencing)
     * Compara coordenadas do cliente com a base operacional da empresa ou unidade
     */
    static async checkCoverage(req: Request, res: Response, next: NextFunction) {
        try {
            const { lat, lng, company_id } = req.query;
            if (!lat || !lng) {
                return res.status(400).json({
                    success: false,
                    message: 'Latitude e longitude são necessárias.'
                });
            }

            const targetLat = Number(lat);
            const targetLng = Number(lng);

            // Pega empresa matriz ou empresa especificada
            let targetCompany = null;
            if (company_id) {
                targetCompany = await Company.findById(company_id).populate('address_id');
            } else {
                targetCompany = await Company.findOne({ is_headquarters: true }).populate('address_id') ||
                                await Company.findOne({ active: true }).populate('address_id');
            }

            // Coordenadas base padrão (São Paulo - Av. Paulista / Centro como fallback de referência operacional)
            let baseLat = -23.55052;
            let baseLng = -46.633308;
            let maxRadiusKm = 50;

            if (targetCompany) {
                maxRadiusKm = targetCompany.service_radius_km || 50;
                if (targetCompany.address_id && (targetCompany.address_id as any).lat) {
                    baseLat = (targetCompany.address_id as any).lat;
                    baseLng = (targetCompany.address_id as any).lng;
                }
            }

            // Calcula distância
            const distanceKm = GeoUtils.calculateDistanceKm(baseLat, baseLng, targetLat, targetLng);
            const isWithinCoverage = distanceKm <= maxRadiusKm;
            const estimatedDurationMin = GeoUtils.estimateDurationMinutes(distanceKm);

            return res.status(200).json({
                success: true,
                data: {
                    is_covered: isWithinCoverage,
                    distance_km: distanceKm,
                    max_radius_km: maxRadiusKm,
                    estimated_duration_min: estimatedDurationMin,
                    base_location: {
                        lat: baseLat,
                        lng: baseLng
                    }
                }
            });
        } catch (e: any) {
            next(e);
        }
    }
}
