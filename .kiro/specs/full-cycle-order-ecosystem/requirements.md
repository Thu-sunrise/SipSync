# Tài liệu Yêu cầu

## Giới thiệu

Hệ sinh thái Đặt hàng Toàn diện (Full-cycle Order Ecosystem) là một giải pháp end-to-end cho phép khách hàng đặt đồ uống qua Telegram Bot, xử lý thanh toán tự động qua VietQR/payOS, và hiển thị đơn hàng theo thời gian thực trên Dashboard Kanban dành cho cô chủ tiệm trà sữa.

Hệ thống giải quyết bài toán cốt lõi: **thông tin đơn hàng dễ bị thiếu hoặc nhầm** khi nhận đơn thủ công qua tin nhắn. AI đóng vai "Cô chủ tiệm trà sữa thân thiện, ấm áp" để tư vấn tự nhiên, đồng thời tự động trích xuất entity đơn hàng chính xác từ hội thoại. Cô chủ tiệm chỉ cần nhìn vào một Dashboard duy nhất để biết cần làm gì.

---

## Bảng thuật ngữ

- **Telegram_Bot**: Điểm tiếp xúc khách hàng qua nền tảng Telegram.
- **AI_Engine**: Thành phần tích hợp OpenAI API (gpt-4o-mini) với Structured Outputs, đóng vai "Cô chủ tiệm trà sữa thân thiện, ấm áp" để tư vấn và trích xuất entity đơn hàng.
- **Cart_Manager**: Thành phần backend quản lý trạng thái giỏ hàng trong Redis.
- **Order_Processor**: Thành phần backend tạo đơn hàng, tính tổng tiền và lưu vào cơ sở dữ liệu.
- **Payment_Gateway**: Tích hợp payOS để tạo và xác thực thanh toán VietQR.
- **Realtime_Broadcaster**: Thành phần phát sự kiện WebSockets đến Dashboard khi trạng thái đơn hàng thay đổi.
- **Admin_Dashboard**: Ứng dụng React hiển thị bảng Kanban đơn hàng theo thời gian thực cho cô chủ tiệm.
- **Menu_Catalog**: Danh mục món ăn được tải từ file CSV, là nguồn duy nhất về tên món và giá tiền.
- **Khách hàng**: Người đặt món qua Telegram.
- **Cô chủ tiệm**: Người xem và xử lý đơn hàng qua Admin_Dashboard.
- **Giỏ hàng**: Tập hợp các món ăn đang được chọn bởi một Khách hàng trong một phiên hội thoại.
- **Đơn hàng**: Giỏ hàng đã được xác nhận, kèm tổng tiền và mã thanh toán.
- **Entity đơn hàng**: Thông tin được trích xuất từ tin nhắn: tên món, số lượng, ghi chú đặc biệt.
- **VietQR**: Mã QR thanh toán được tạo bởi payOS theo chuẩn ngân hàng Việt Nam.
- **Kanban_Board**: Giao diện bảng với các cột trạng thái: Chờ làm → Đang làm → Xong.
- **Session**: Phiên hội thoại của một Khách hàng, được lưu trong Redis với TTL xác định.
- **Webhook**: Yêu cầu HTTP do payOS gửi đến hệ thống khi có sự kiện thanh toán.

---

## Yêu cầu

### Yêu cầu 1: Tải và Quản lý Menu

**User Story:** Là cô chủ tiệm, tôi muốn hệ thống tải danh mục món ăn từ file CSV, để giá tiền và tên món luôn chính xác và nhất quán.

#### Tiêu chí chấp nhận

1. WHEN hệ thống khởi động, THE Menu_Catalog SHALL tải toàn bộ dữ liệu từ file CSV được cấu hình, bao gồm tên món, giá tiền và mô tả.
2. IF file CSV không tồn tại hoặc có lỗi định dạng, THEN THE Menu_Catalog SHALL ghi log lỗi chi tiết và dừng khởi động hệ thống.
3. THE Menu_Catalog SHALL cung cấp API tra cứu nội bộ để các thành phần khác truy vấn thông tin món ăn theo tên.
4. WHEN file CSV được cập nhật, THE Menu_Catalog SHALL hỗ trợ reload dữ liệu mà không cần khởi động lại toàn bộ hệ thống.
5. THE Menu_Catalog SHALL là nguồn duy nhất về giá tiền — không thành phần nào được dùng giá từ nguồn khác.

---

### Yêu cầu 2: Tiếp nhận và Xử lý Tin nhắn Telegram

**User Story:** Là khách hàng, tôi muốn nhắn tin tự nhiên qua Telegram để đặt món, để tôi không cần học cú pháp hay điền form.

#### Tiêu chí chấp nhận

1. WHEN Khách hàng gửi tin nhắn qua Telegram, THE Telegram_Bot SHALL chuyển tiếp tin nhắn đến backend trong vòng 2 giây.
2. THE Telegram_Bot SHALL hỗ trợ tin nhắn dạng văn bản thuần túy từ Khách hàng.
3. WHEN Khách hàng gửi tin nhắn lần đầu trong một ngày, THE Telegram_Bot SHALL gửi lời chào kèm hướng dẫn ngắn gọn về cách đặt món.
4. IF kết nối đến backend bị lỗi, THEN THE Telegram_Bot SHALL trả lời Khách hàng thông báo lỗi thân thiện và thử lại tối đa 3 lần.
5. THE Telegram_Bot SHALL xử lý tối đa 50 tin nhắn đồng thời mà không bị mất tin.

---

### Yêu cầu 3: Quản lý Ngữ cảnh Hội thoại

**User Story:** Là khách hàng, tôi muốn AI nhớ những gì tôi đã nói trong cuộc trò chuyện, để tôi không cần nhắc lại thông tin mỗi lần.

#### Tiêu chí chấp nhận

1. THE Cart_Manager SHALL lưu lịch sử hội thoại của mỗi Khách hàng trong Redis với TTL là 24 giờ.
2. WHEN AI_Engine nhận tin nhắn mới, THE AI_Engine SHALL đính kèm tối đa 20 tin nhắn gần nhất từ lịch sử hội thoại vào ngữ cảnh.
3. WHILE một Session đang hoạt động, THE Cart_Manager SHALL duy trì trạng thái Giỏ hàng độc lập giữa các Khách hàng khác nhau.
4. WHEN TTL của Session hết hạn, THE Cart_Manager SHALL xóa toàn bộ dữ liệu Session khỏi Redis và ghi log sự kiện.
5. IF Redis không khả dụng, THEN THE Cart_Manager SHALL trả về lỗi có cấu trúc và Telegram_Bot SHALL thông báo cho Khách hàng thử lại sau.

---

### Yêu cầu 4: Tư vấn Món ăn bằng AI

**User Story:** Là khách hàng, tôi muốn được tư vấn món ăn theo phong cách tự nhiên như nói chuyện với người thật, để trải nghiệm đặt món trở nên thú vị và dễ dàng hơn.

#### Tiêu chí chấp nhận

1. THE AI_Engine SHALL phản hồi bằng ngôn ngữ phù hợp với ngôn ngữ Khách hàng sử dụng (tiếng Việt hoặc tiếng Anh).
2. WHEN Khách hàng hỏi về món ăn, THE AI_Engine SHALL trả lời dựa trên thông tin từ Menu_Catalog, không tự bịa thêm món không có trong menu.
3. THE AI_Engine SHALL duy trì phong cách trả lời thân thiện, ấm áp, nhất quán với persona "Cô chủ tiệm trà sữa" xuyên suốt toàn bộ hội thoại.
4. WHEN Khách hàng yêu cầu gợi ý, THE AI_Engine SHALL đề xuất tối đa 3 món từ Menu_Catalog kèm mô tả ngắn.
5. THE AI_Engine SHALL phản hồi trong vòng 5 giây kể từ khi nhận được tin nhắn của Khách hàng.

---

### Yêu cầu 5: Trích xuất Entity Đơn hàng

**User Story:** Là cô chủ tiệm, tôi muốn hệ thống tự động nhận diện món, số lượng và ghi chú từ tin nhắn của khách, để không bị sót hay nhầm thông tin đơn hàng.

#### Tiêu chí chấp nhận

1. WHEN AI_Engine phân tích tin nhắn của Khách hàng, THE AI_Engine SHALL trích xuất entity đơn hàng dưới dạng JSON có cấu trúc cố định (tên_món, số_lượng, ghi_chú) sử dụng OpenAI Structured Outputs.
2. THE AI_Engine SHALL khớp tên món trong tin nhắn với tên món trong Menu_Catalog bằng fuzzy matching, chấp nhận sai lệch chính tả tối đa 2 ký tự.
3. IF AI_Engine không thể xác định rõ tên món hoặc số lượng, THEN THE AI_Engine SHALL yêu cầu Khách hàng xác nhận lại thông tin cụ thể đó.
4. THE AI_Engine SHALL không sử dụng kết quả trích xuất để tính toán giá tiền — việc tính tiền thuộc trách nhiệm của Order_Processor dựa trên Menu_Catalog.
5. FOR ALL tin nhắn hợp lệ chứa thông tin đặt món, THE AI_Engine SHALL trích xuất đầy đủ entity mà không bỏ sót món nào được đề cập rõ ràng.

---

### Yêu cầu 6: Quản lý Giỏ hàng

**User Story:** Là khách hàng, tôi muốn xem, thêm, sửa và xóa món trong giỏ hàng trước khi xác nhận đặt, để chắc chắn đơn hàng đúng với ý muốn.

#### Tiêu chí chấp nhận

1. WHEN AI_Engine trích xuất thành công entity đơn hàng, THE Cart_Manager SHALL cập nhật Giỏ hàng trong Redis ngay lập tức.
2. THE Cart_Manager SHALL hỗ trợ các thao tác: thêm món, cập nhật số lượng, xóa món khỏi giỏ hàng.
3. WHEN Khách hàng yêu cầu xem giỏ hàng, THE Cart_Manager SHALL trả về danh sách món kèm số lượng, ghi chú và giá từng món từ Menu_Catalog.
4. WHILE Giỏ hàng trống, THE Cart_Manager SHALL từ chối yêu cầu xác nhận đơn hàng và thông báo cho Khách hàng.
5. THE Cart_Manager SHALL đảm bảo tính nhất quán của dữ liệu Giỏ hàng — thao tác cập nhật phải là atomic để tránh race condition khi có nhiều tin nhắn đồng thời từ cùng một Khách hàng.

---

### Yêu cầu 7: Xác nhận Đơn hàng và Tạo Thanh toán

**User Story:** Là khách hàng, tôi muốn nhận mã QR thanh toán ngay sau khi xác nhận đơn, để có thể thanh toán nhanh chóng mà không cần chờ đợi.

#### Tiêu chí chấp nhận

1. WHEN Khách hàng xác nhận đặt hàng, THE Order_Processor SHALL tính tổng tiền dựa hoàn toàn vào giá từ Menu_Catalog, không sử dụng bất kỳ nguồn giá nào khác.
2. WHEN Order_Processor tính xong tổng tiền, THE Payment_Gateway SHALL gọi API payOS để tạo mã VietQR trong vòng 3 giây.
3. WHEN mã VietQR được tạo thành công, THE Telegram_Bot SHALL gửi ảnh QR và thông tin chuyển khoản (số tiền, nội dung CK) cho Khách hàng trong vòng 5 giây.
4. THE Order_Processor SHALL lưu đơn hàng vào cơ sở dữ liệu với trạng thái ban đầu là "Chờ thanh toán" trước khi gọi Payment_Gateway.
5. IF Payment_Gateway trả về lỗi, THEN THE Order_Processor SHALL giữ nguyên đơn hàng trong cơ sở dữ liệu và Telegram_Bot SHALL thông báo Khách hàng thử lại.
6. THE Payment_Gateway SHALL tạo mã đơn hàng duy nhất (order_id) cho mỗi giao dịch để sử dụng trong nội dung chuyển khoản.

---

### Yêu cầu 8: Xác thực Thanh toán qua Webhook

**User Story:** Là cô chủ tiệm, tôi muốn hệ thống tự động xác nhận thanh toán khi khách chuyển khoản, để không cần kiểm tra thủ công từng giao dịch ngân hàng.

#### Tiêu chí chấp nhận

1. WHEN payOS gửi Webhook đến hệ thống, THE Payment_Gateway SHALL xác thực chữ ký (HMAC signature) của request trước khi xử lý bất kỳ dữ liệu nào.
2. IF chữ ký Webhook không hợp lệ, THEN THE Payment_Gateway SHALL từ chối request với HTTP 400 và ghi log cảnh báo bảo mật.
3. WHEN Webhook được xác thực thành công với trạng thái thanh toán thành công, THE Order_Processor SHALL cập nhật trạng thái đơn hàng từ "Chờ thanh toán" sang "Chờ làm" trong cơ sở dữ liệu.
4. THE Payment_Gateway SHALL xử lý Webhook idempotent — nhận cùng một Webhook nhiều lần không được tạo ra nhiều cập nhật trạng thái.
5. WHEN trạng thái đơn hàng được cập nhật thành công, THE Realtime_Broadcaster SHALL phát sự kiện ORDER_PAID kèm dữ liệu đơn hàng đầy đủ đến tất cả Admin_Dashboard đang kết nối.
6. THE Payment_Gateway SHALL trả lời payOS với HTTP 200 trong vòng 5 giây để tránh payOS retry không cần thiết.

---

### Yêu cầu 9: Dashboard Kanban Thời gian Thực

**User Story:** Là cô chủ tiệm, tôi muốn thấy tất cả đơn hàng trên một bảng Kanban cập nhật tức thì, để biết ngay cần làm gì mà không cần refresh trang.

#### Tiêu chí chấp nhận

1. THE Admin_Dashboard SHALL hiển thị Kanban_Board với 3 cột: "Chờ làm", "Đang làm", "Xong".
2. WHEN Admin_Dashboard tải lần đầu, THE Admin_Dashboard SHALL hiển thị tất cả đơn hàng đang hoạt động từ cơ sở dữ liệu theo đúng cột trạng thái tương ứng.
3. WHEN Realtime_Broadcaster phát sự kiện ORDER_PAID, THE Admin_Dashboard SHALL tự động thêm thẻ đơn hàng mới vào cột "Chờ làm" mà không cần Cô chủ tiệm reload trang.
4. THE Admin_Dashboard SHALL hiển thị trên mỗi thẻ đơn hàng: tên Khách hàng (Telegram username), danh sách món kèm số lượng và ghi chú, tổng tiền, thời gian đặt hàng.
5. WHEN Cô chủ tiệm kéo thẻ đơn hàng sang cột khác, THE Admin_Dashboard SHALL cập nhật trạng thái đơn hàng trong cơ sở dữ liệu và phát sự kiện WebSockets đến tất cả Admin_Dashboard khác đang mở.
6. WHILE kết nối WebSockets bị gián đoạn, THE Admin_Dashboard SHALL hiển thị thông báo "Mất kết nối" và tự động thử kết nối lại mỗi 5 giây.

---

### Yêu cầu 10: Thông báo cho Khách hàng sau Thanh toán

**User Story:** Là khách hàng, tôi muốn nhận xác nhận qua Telegram khi thanh toán thành công, để biết đơn hàng của tôi đã được tiếp nhận.

#### Tiêu chí chấp nhận

1. WHEN Order_Processor cập nhật trạng thái đơn hàng sang "Chờ làm", THE Telegram_Bot SHALL gửi tin nhắn xác nhận đến Khách hàng trong vòng 10 giây.
2. THE Telegram_Bot SHALL bao gồm trong tin nhắn xác nhận: danh sách món đã đặt, tổng tiền đã thanh toán, thời gian dự kiến hoàn thành (nếu có).
3. WHEN Cô chủ tiệm cập nhật trạng thái đơn hàng sang "Xong" trên Admin_Dashboard, THE Telegram_Bot SHALL gửi tin nhắn thông báo hoàn thành cho Khách hàng.
4. IF Telegram_Bot không gửi được tin nhắn xác nhận sau 3 lần thử, THEN THE Order_Processor SHALL ghi log lỗi kèm thông tin đơn hàng để xử lý thủ công.

---

### Yêu cầu 11: Giới hạn Tốc độ và Bảo vệ Hệ thống

**User Story:** Là người vận hành hệ thống, tôi muốn hệ thống được bảo vệ khỏi lạm dụng và quá tải, để dịch vụ luôn ổn định cho tất cả người dùng.

#### Tiêu chí chấp nhận

1. THE Cart_Manager SHALL giới hạn mỗi Khách hàng gửi tối đa 20 tin nhắn mỗi phút sử dụng Redis rate limiting.
2. IF Khách hàng vượt quá giới hạn tốc độ, THEN THE Telegram_Bot SHALL thông báo thân thiện và bỏ qua các tin nhắn vượt hạn mức trong 1 phút tiếp theo.
3. THE AI_Engine SHALL giới hạn tối đa 100 lời gọi OpenAI API mỗi phút ở cấp độ hệ thống.
4. IF AI_Engine nhận được lỗi rate limit từ OpenAI, THEN THE AI_Engine SHALL thực hiện exponential backoff với thời gian chờ tối đa 30 giây trước khi thử lại.
5. THE Order_Processor SHALL từ chối tạo đơn hàng có tổng tiền bằng 0 hoặc chứa tên món không tồn tại trong Menu_Catalog.

---

### Yêu cầu 12: Giám sát và Ghi log

**User Story:** Là người vận hành hệ thống, tôi muốn theo dõi sức khỏe hệ thống và tra cứu lịch sử sự kiện, để phát hiện và xử lý sự cố kịp thời.

#### Tiêu chí chấp nhận

1. THE Order_Processor SHALL ghi log mọi thay đổi trạng thái đơn hàng kèm timestamp, order_id và tác nhân gây ra thay đổi.
2. THE Payment_Gateway SHALL ghi log mọi Webhook nhận được kèm kết quả xác thực chữ ký, bất kể hợp lệ hay không.
3. THE AI_Engine SHALL ghi log thời gian phản hồi của mỗi lời gọi OpenAI API để phục vụ giám sát hiệu năng.
4. WHERE môi trường sản xuất được cấu hình, THE hệ thống SHALL xuất metrics (số đơn hàng, thời gian phản hồi, tỉ lệ lỗi) sang Prometheus endpoint `/metrics`.
5. WHERE Grafana được tích hợp, THE hệ thống SHALL cung cấp dashboard hiển thị các chỉ số: số đơn hàng theo giờ, thời gian phản hồi trung bình của AI_Engine, tỉ lệ thanh toán thành công.
