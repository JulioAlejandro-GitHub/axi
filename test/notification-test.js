const fs = require('fs');
const path = require('path');
const { BDgetUsuario } = require('../database/usuario');

// Mock dependencies
jest.mock('../services/recognition-service-factory', () => ({
    getRecognitionService: jest.fn().mockReturnValue({
        recognize: jest.fn(),
    }),
}));

jest.mock('../database/usuario', () => ({
    BDgetUsuario: jest.fn(),
}));

jest.mock('../services/notification-service', () => ({
    sendAlert: jest.fn(),
}));

jest.mock('../controllers/visit', () => ({
    registerAcceso: jest.fn().mockResolvedValue({}),
}));

describe('handleRecognitionResults', () => {
    let handleRecognitionResults;
    let notificationService;

    beforeAll(() => {
        // We need to require the service inside beforeAll to ensure mocks are applied
        const processingService = require('../services/recognition-processing-service');
        handleRecognitionResults = processingService.handleRecognitionResults;
        notificationService = require('../services/notification-service');
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should send an "unknown_user" alert when no match is found', async () => {
        // Arrange
        BDgetUsuario.mockResolvedValue({ rows: [] });
        const context = { camera: { camara_id: 1, nombre: 'CAM01', ubicacion: 'Entrance' }, ip: '127.0.0.1', imageName: '/path/to/image.jpg' };
        const combinedResults = {
            compreface: {
                matchFaces: [{ usuario_id: 'desconocido_0_1', similarity: 0, face_id: 'face1' }],
                imgOriginal: 'unknown.jpg',
            },
            human: {
                matchFaces: [],
            }
        };

        // Act
        await handleRecognitionResults(combinedResults, context);

        // Assert
        expect(notificationService.sendAlert).toHaveBeenCalledWith('unknown_user', {
            camera: { camara_id: 1, nombre: 'CAM01', ubicacion: 'Entrance' },
            location: 'Entrance',
            timestamp: expect.any(String),
            ip: '127.0.0.1',
            imagePath: '/path/to/image.jpg',
            face_id: 0,
            name: 'Desconocido',
            usuario_id: 0,
        });
        expect(notificationService.sendAlert).toHaveBeenCalledTimes(1);
    });

    test('should send a "thief_detected" alert when a thief is identified', async () => {
        // Arrange
        BDgetUsuario.mockResolvedValue({
            rows: [{
                usuario_id: 100,
                nombre: 'Known Thief',
                usuario_tipo: 'ladron',
            }]
        });
        const context = { camera: { camara_id: 2, nombre: 'CAM02', ubicacion: 'Lobby' }, ip: '192.168.1.1', imageName: '/path/to/thief.jpg' };
        const combinedResults = {
            compreface: {
                matchFaces: [{ usuario_id: 100, face_id: 1, similarity: 0.99 }],
                imgOriginal: 'thief.jpg'
            },
            human: {
                matchFaces: []
            }
        };

        // Act
        await handleRecognitionResults(combinedResults, context);

        // Assert
        expect(BDgetUsuario).toHaveBeenCalledWith({ ids: [100] });
        expect(notificationService.sendAlert).toHaveBeenCalledWith('thief_detected', {
            name: 'Known Thief',
            camera: { camara_id: 2, nombre: 'CAM02', ubicacion: 'Lobby' },
            location: 'Lobby',
            timestamp: expect.any(String),
            ip: '192.168.1.1',
            imagePath: '/path/to/thief.jpg',
            face_id: 1,
            usuario_id: 100,
        });
        expect(notificationService.sendAlert).toHaveBeenCalledTimes(1);
    });

    test('should not send an alert for a regular identified user', async () => {
        // Arrange
        BDgetUsuario.mockResolvedValue({
            rows: [{
                usuario_id: 101,
                nombre: 'Regular User',
                usuario_tipo: 'socio',
            }]
        });
        const context = { camera: { camara_id: 3, nombre: 'CAM03', ubicacion: 'Office' }, ip: '192.168.1.2', imageName: 'regular.jpg' };
        const combinedResults = {
            compreface: {
                matchFaces: [{ usuario_id: 101, face_id: 2, similarity: 0.98 }],
                imgOriginal: 'regular.jpg'
            },
            human: {
                matchFaces: []
            }
        };

        // Act
        await handleRecognitionResults(combinedResults, context);

        // Assert
        expect(BDgetUsuario).toHaveBeenCalledWith({ ids: [101] });
        expect(notificationService.sendAlert).not.toHaveBeenCalled();
    });
});