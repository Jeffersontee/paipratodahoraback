export class GeoUtils {
    /**
     * Calcula a distância entre duas coordenadas GPS em Quilômetros usando a Fórmula de Haversine
     */
    public static calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
        if (lat1 === lat2 && lon1 === lon2) return 0;

        const R = 6371; // Raio da Terra em km
        const dLat = GeoUtils.toRadians(lat2 - lat1);
        const dLon = GeoUtils.toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(GeoUtils.toRadians(lat1)) * Math.cos(GeoUtils.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return Math.round(distance * 100) / 100; // Retorna com 2 casas decimais
    }

    /**
     * Estima o tempo de deslocamento em minutos considerando velocidade média urbana (ex: 30 km/h)
     */
    public static estimateDurationMinutes(distanceKm: number, averageSpeedKmh: number = 30): number {
        if (distanceKm <= 0) return 0;
        const timeHours = distanceKm / averageSpeedKmh;
        return Math.ceil(timeHours * 60);
    }

    private static toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }
}
