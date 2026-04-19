const { OpenAI } = require('openai');
const logger = require('../../shared/logger');
const MenuService = require('../menu/menu.service');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

const getSystemPrompt = () => {
    const menuItems = MenuService.getAllItems();
    const menuContext = menuItems.map(item => 
        `- ${item.name} (${item.category}): Size M ${item.price_m.toLocaleString()}đ, Size L ${item.price_l.toLocaleString()}đ. Mô tả: ${item.description}`
    ).join('\n');

    return `
Bạn là cô chủ tiệm trà sữa thân thiện, ấm áp.
Nhiệm vụ:
1. Trả lời tự nhiên bằng ngôn ngữ khách dùng (persona: Cô chủ tiệm).
2. Trích xuất entity đơn hàng chính xác, bao gồm size (M hoặc L).
3. Phân loại mục đích (intent) của khách.

YÊU CẦU: Bạn phải trả về kết quả dưới định dạng JSON.

MENU HIỆN TẠI:
${menuContext}

QUY TẮC:
- "intent" gồm: 
  + "chat": Hỏi thăm, tư vấn, hỏi giá. Bạn tự trả lời dựa vào MENU.
  + "order": Khi khách chọn món (VD: "Cho mình 1 trà sữa").
  + "confirm_order": BẮT BUỘC dùng khi khách muốn THANH TOÁN, CHỐT ĐƠN, TRẢ TIỀN (VD: "cho mình thanh toán", "tính tiền", "chốt đơn").
  + "view_menu", "view_cart", "cancel".

VÍ DỤ QUAN TRỌNG:
- Khách: "cho mình thanh toán" ➔ intent: "confirm_order"
- Khách: "tính tiền nhé" ➔ intent: "confirm_order"
- Khách: "chốt đơn này đi" ➔ intent: "confirm_order"

- Nếu khách muốn đặt món MỚI hoặc THAY ĐỔI món, trích xuất vào "order_entities" là một danh sách các object.
- QUAN TRỌNG: Nếu khách chỉ nói "Chốt đơn", "Thanh toán", "Tính tiền" cho đơn hàng đã đặt trước đó, bạn BẮT BUỘC phải để "order_entities": [] (mảng rỗng). Không được trích xuất lại các món cũ trong lịch sử.

- "message" là câu trả lời của bạn. Hãy luôn giữ phong cách "Cô chủ tiệm" ấm áp.

Ví dụ: "Chốt đơn cho mình"
Kết quả: {
  "intent": "order", 
  "message": "Dạ mình đã ghi nhận 1 trà sữa size L ít đường của bạn rồi ạ! Bạn muốn dùng thêm gì nữa không?", 
  "order_entities": [{"item_name": "Trà sữa", "quantity": 1, "size": "L", "note": "ít đường"}]
}
`;
};

const AiService = {
    /**
     * Xử lý tin nhắn người dùng và trả về intent + entities + message.
     */
    processMessage: async (userMessage, history = []) => {
        try {
            const messages = [
                { role: 'system', content: getSystemPrompt() },
                ...history.map(h => ({ role: h.role, content: h.content })),
                { role: 'user', content: userMessage }
            ];

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
                temperature: 0.7,
                response_format: { type: "json_object" } 
            });

            const rawContent = response.choices[0].message.content;
            const parsedData = JSON.parse(rawContent);
            
            return {
                intent: parsedData.intent || 'chat',
                message: parsedData.message || 'Dạ bạn đợi mình xíu nhé!',
                order_entities: parsedData.order_entities || []
            };

        } catch (error) {
            logger.error({ err: error }, 'Lỗi khi gọi OpenAI API');
            throw new Error('AI_PROCESSING_FAILED');
        }
    }
};

module.exports = AiService;
