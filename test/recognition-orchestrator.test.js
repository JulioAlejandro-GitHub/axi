process.env.CRYPTO_SECRET_KEY = 'a'.repeat(32);
process.env.CRYPTO_IV = 'b'.repeat(16);

// Mock dependencies at the top level
const { crossValidate } = require('../src/helpers/cross-validator');
const HumanEngine = require('../src/services/recognition/engines/human-engine');
const CompreFaceEngine = require('../src/services/recognition/engines/compreface-engine');
const RecognitionOrchestrator = require('../src/services/recognition/recognition-orchestrator');

jest.mock('../src/helpers/cross-validator');
jest.mock('../src/services/recognition/engines/human-engine');
jest.mock('../src/services/recognition/engines/compreface-engine');

describe('Recognition Orchestrator', () => {
    const mockImageBuffer = Buffer.from('mock-image-data');
    const mockContext = { camera: { camara_id: 1 }, img: { name: 'test.jpg' } };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should run both engines and cross-validate results', async () => {
        const humanResult = { engine: 'human', personasIdentificadas: [{ usuario_id: 'user1' }] };
        const comprefaceResult = { engine: 'compreface', personasIdentificadas: [{ usuario_id: 'user1' }] };
        const crossValidatedResult = { personasIdentificadas: [{ usuario_id: 'user1', confidence: 0.99 }] };

        // Provide a mock implementation for the HumanEngine class constructor
        const mockHumanRecognize = jest.fn().mockResolvedValue(humanResult);
        HumanEngine.mockImplementation(() => {
            return {
                recognize: mockHumanRecognize,
            };
        });

        // Mock the method on the CompreFaceEngine module
        CompreFaceEngine.recognize.mockResolvedValue(comprefaceResult);

        // Mock the cross-validator
        crossValidate.mockResolvedValue(crossValidatedResult);

        // Instantiate the orchestrator *after* mocks are configured
        const orchestrator = new RecognitionOrchestrator();

        const finalResult = await orchestrator.orchestrate(mockImageBuffer, mockContext);

        // Assert that the correct methods were called with the correct arguments
        expect(mockHumanRecognize).toHaveBeenCalledWith(mockImageBuffer, mockContext);
        expect(CompreFaceEngine.recognize).toHaveBeenCalledWith(mockImageBuffer, mockContext);
        expect(crossValidate).toHaveBeenCalledWith(comprefaceResult, humanResult, mockContext.img.name);
        expect(finalResult).toEqual(crossValidatedResult);
    });
});
