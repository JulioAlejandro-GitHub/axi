const axios = require('axios');
// Importar la instancia singleton directamente
const engine = require('../src/services/recognition/engines/insightface-engine');
const { createImageFromBuffer } = require('../src/helpers/image-handler');

// Mockear dependencias
jest.mock('axios');
jest.mock('../src/helpers/image-handler', () => ({
    createImageFromBuffer: jest.fn().mockResolvedValue({ name: 'test-image.jpg' }),
}));
// Mockear el logger para suprimir la salida durante las pruebas
jest.mock('../src/helpers/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
}));

describe('InsightFaceEngine', () => {
    beforeEach(() => {
        // Resetear mocks antes de cada prueba
        axios.post.mockClear();
        createImageFromBuffer.mockClear();
    });

    it('should correctly call the python service and transform the response', async () => {
        const mockBuffer = Buffer.from('fake-image-data');
        const mockApiResponse = {
            result: [
                {
                    box: [10, 20, 110, 120],
                    confidence: 0.99,
                    embedding: [0.1, 0.2, 0.3],
                    landmarks: [[30, 40], [80, 40]],
                },
            ],
        };

        axios.post.mockResolvedValue({ data: mockApiResponse });

        const result = await engine.recognize({ buffer: mockBuffer });

        // Verificar que axios.post fue llamado correctamente
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:5001/recognize',
            expect.any(Object), // FormData
            expect.objectContaining({
                headers: expect.any(Object),
            })
        );

        // Verificar que la respuesta se transforma a la nueva estructura correcta
        const expectedPerson = {
            box: {
                x_min: 10,
                y_min: 20,
                x_max: 110,
                y_max: 120,
            },
            confidence: 0.99,
            embedding: [0.1, 0.2, 0.3],
            nombre: 'desconocido',
        };

        expect(result).toEqual({
            personasIdentificadas: [],
            personasDesconocidas: [expectedPerson],
        });
    });

    it('should handle empty results from the python service', async () => {
        const mockBuffer = Buffer.from('fake-image-data');
        const mockApiResponse = { result: [] };

        axios.post.mockResolvedValue({ data: mockApiResponse });

        const result = await engine.recognize({ buffer: mockBuffer });

        // Verificar la nueva estructura vacía
        expect(result).toEqual({
            personasIdentificadas: [],
            personasDesconocidas: [],
        });
    });

    it('should handle errors from the python service', async () => {
        const mockBuffer = Buffer.from('fake-image-data');

        axios.post.mockRejectedValue(new Error('Service unavailable'));

        const result = await engine.recognize({ buffer: mockBuffer });

        expect(result).toEqual({
            error: 'Fallo la comunicación con el servicio de InsightFace.',
        });
    });
});
