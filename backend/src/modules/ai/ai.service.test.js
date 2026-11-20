const mockCreate = jest.fn();

jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
    })),
}));
jest.mock('../menu/menu.service', () => ({
    getAllItems: () => [
        { name: 'Trà Sữa', category: 'Trà', price_m: 30000, price_l: 40000, description: 'ngon' },
    ],
}));
jest.mock('../../shared/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));

const AiService = require('./ai.service');

const llmReturns = (content) =>
    mockCreate.mockResolvedValue({ choices: [{ message: { content } }] });

describe('AiService.processMessage', () => {
    afterEach(() => jest.clearAllMocks());

    test('trả về intent, message, entities hợp lệ', async () => {
        llmReturns(JSON.stringify({
            intent: 'order',
            message: 'Dạ em thêm rồi ạ',
            order_entities: [{ action: 'add', item_name: 'Trà Sữa', quantity: 1, size: 'M', note: '' }],
        }));

        const r = await AiService.processMessage('cho mình 1 trà sữa M');

        expect(r.intent).toBe('order');
        expect(r.order_entities).toHaveLength(1);
        expect(mockCreate).toHaveBeenCalledTimes(1);
        const args = mockCreate.mock.calls[0][0];
        expect(args.response_format).toEqual({ type: 'json_object' });
        expect(args.messages[0].role).toBe('system');
        expect(args.messages[args.messages.length - 1]).toEqual({ role: 'user', content: 'cho mình 1 trà sữa M' });
    });

    test('chuẩn hoá output sai schema của LLM', async () => {
        llmReturns(JSON.stringify({
            intent: 'hack',
            order_entities: [{ item_name: 'Trà Sữa', quantity: 'abc', size: 'XL' }],
        }));

        const r = await AiService.processMessage('hi');

        expect(r.intent).toBe('chat');
        expect(r.order_entities[0]).toMatchObject({ action: 'add', quantity: 1, size: 'M' });
    });

    test('JSON hỏng → ném AI_PROCESSING_FAILED', async () => {
        llmReturns('không phải json');
        await expect(AiService.processMessage('hi')).rejects.toThrow('AI_PROCESSING_FAILED');
    });

    test('API lỗi → ném AI_PROCESSING_FAILED', async () => {
        mockCreate.mockRejectedValue(new Error('timeout'));
        await expect(AiService.processMessage('hi')).rejects.toThrow('AI_PROCESSING_FAILED');
    });

    test('response không có choices → ném AI_PROCESSING_FAILED', async () => {
        mockCreate.mockResolvedValue({});
        await expect(AiService.processMessage('hi')).rejects.toThrow('AI_PROCESSING_FAILED');
    });
});
