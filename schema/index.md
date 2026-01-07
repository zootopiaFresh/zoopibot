# Zootopia 데이터베이스 스키마 인덱스

> 생성일: 2025-12-08

이 디렉토리는 대규모 스키마 파일을 도메인별로 분리하여 Claude가 참조하기 쉽게 구성되어 있습니다.

---

## 📁 도메인별 스키마 파일

| 파일 | 도메인 | 설명 | 테이블 수 |
|------|--------|------|----------|
| [01-member.md](01-member.md) | 회원 (Member) | 회원 정보, 소셜 로그인, 등급, 활동 로그 관련 테이블 | 18 |
| [02-pet.md](02-pet.md) | 반려동물 (Pet) | 반려동물 정보, 알레르기, 질병, 식습관 관련 테이블 | 10 |
| [03-item.md](03-item.md) | 상품 (Item) | 상품 정보, 카테고리, 재고, 옵션, 영양소 관련 테이블 | 26 |
| [04-order.md](04-order.md) | 주문 (Order) | 주문, 결제, 배송, 정산 관련 테이블 | 16 |
| [05-subscribe.md](05-subscribe.md) | 구독 (Subscribe) | 정기구독, 구독 상품, 결제 관련 테이블 | 7 |
| [06-coupon.md](06-coupon.md) | 쿠폰/포인트 (Coupon & Point) | 쿠폰, 포인트, 프리퀀시 관련 테이블 | 10 |
| [07-event.md](07-event.md) | 이벤트 (Event) | 이벤트, 캠페인, 출석, 경품, 응모 관련 테이블 | 19 |
| [08-content.md](08-content.md) | 콘텐츠 (Content) | 배너, 섹션, 콘텐츠, 게시물 관련 테이블 | 18 |
| [09-review.md](09-review.md) | 리뷰 (Review) | 리뷰, 리뷰 옵션, 신고 관련 테이블 | 9 |
| [10-delivery.md](10-delivery.md) | 배송 (Delivery) | 배송지, 배송일, 배송 권역 관련 테이블 | 6 |
| [11-alarm.md](11-alarm.md) | 알림 (Alarm) | 푸시 알림, SMS, 재입고 알림 관련 테이블 | 8 |
| [12-partner.md](12-partner.md) | 파트너 (Partner) | 파트너사, 물류, 재고 관련 테이블 | 7 |
| [13-system.md](13-system.md) | 시스템 (System) | 관리자, 로그, 설정, FAQ 관련 테이블 | 16 |
| [99-vip.md](99-vip.md) | VIP/테스트 (VIP & Test) | VIP 회원, 테스트 테이블 | 5 |

---

## 📑 전체 테이블 인덱스 (알파벳순)

특정 테이블을 찾을 때 이 목록을 참고하세요.

| 테이블명 | 도메인 | 파일 |
|----------|--------|------|
| admin | 시스템 (System) | [13-system.md](13-system.md#admin) |
| alarm | 알림 (Alarm) | [11-alarm.md](11-alarm.md#alarm) |
| alarm_sub | 알림 (Alarm) | [11-alarm.md](11-alarm.md#alarm_sub) |
| allergy_list | 반려동물 (Pet) | [02-pet.md](02-pet.md#allergy_list) |
| api_call_log | 시스템 (System) | [13-system.md](13-system.md#api_call_log) |
| app_event_log | 시스템 (System) | [13-system.md](13-system.md#app_event_log) |
| badge_list | 상품 (Item) | [03-item.md](03-item.md#badge_list) |
| banner | 콘텐츠 (Content) | [08-content.md](08-content.md#banner) |
| banner_detail | 콘텐츠 (Content) | [08-content.md](08-content.md#banner_detail) |
| banner_items | 콘텐츠 (Content) | [08-content.md](08-content.md#banner_items) |
| bgm_list | 시스템 (System) | [13-system.md](13-system.md#bgm_list) |
| block_delivery_date | 배송 (Delivery) | [10-delivery.md](10-delivery.md#block_delivery_date) |
| cache_view_items | 상품 (Item) | [03-item.md](03-item.md#cache_view_items) |
| card | 주문 (Order) | [04-order.md](04-order.md#card) |
| cart | 주문 (Order) | [04-order.md](04-order.md#cart) |
| category_rankings | 상품 (Item) | [03-item.md](03-item.md#category_rankings) |
| circuit_break | 시스템 (System) | [13-system.md](13-system.md#circuit_break) |
| content | 콘텐츠 (Content) | [08-content.md](08-content.md#content) |
| content_list | 콘텐츠 (Content) | [08-content.md](08-content.md#content_list) |
| content_list_item | 콘텐츠 (Content) | [08-content.md](08-content.md#content_list_item) |
| content_template | 콘텐츠 (Content) | [08-content.md](08-content.md#content_template) |
| content_template_list | 콘텐츠 (Content) | [08-content.md](08-content.md#content_template_list) |
| coupon | 쿠폰/포인트 (Coupon & Point) | [06-coupon.md](06-coupon.md#coupon) |
| coupon_code_list | 쿠폰/포인트 (Coupon & Point) | [06-coupon.md](06-coupon.md#coupon_code_list) |
| coupon_list | 쿠폰/포인트 (Coupon & Point) | [06-coupon.md](06-coupon.md#coupon_list) |
| coupon_pack | 쿠폰/포인트 (Coupon & Point) | [06-coupon.md](06-coupon.md#coupon_pack) |
| coupon_pack_coupon | 쿠폰/포인트 (Coupon & Point) | [06-coupon.md](06-coupon.md#coupon_pack_coupon) |
| dawn_shipping_area | 배송 (Delivery) | [10-delivery.md](10-delivery.md#dawn_shipping_area) |
| declaration | 리뷰 (Review) | [09-review.md](09-review.md#declaration) |
| declaration_content | 리뷰 (Review) | [09-review.md](09-review.md#declaration_content) |
| deeplink_list | 시스템 (System) | [13-system.md](13-system.md#deeplink_list) |
| default_coupon | 쿠폰/포인트 (Coupon & Point) | [06-coupon.md](06-coupon.md#default_coupon) |
| delivery_address | 배송 (Delivery) | [10-delivery.md](10-delivery.md#delivery_address) |
| delivery_date | 배송 (Delivery) | [10-delivery.md](10-delivery.md#delivery_date) |
| delivery_date_recommand_item | 배송 (Delivery) | [10-delivery.md](10-delivery.md#delivery_date_recommand_item) |
| disease_category_list | 반려동물 (Pet) | [02-pet.md](02-pet.md#disease_category_list) |
| disease_list | 반려동물 (Pet) | [02-pet.md](02-pet.md#disease_list) |
| dmb_list | 상품 (Item) | [03-item.md](03-item.md#dmb_list) |
| eating_habits | 반려동물 (Pet) | [02-pet.md](02-pet.md#eating_habits) |
| entry_ticket | 이벤트 (Event) | [07-event.md](07-event.md#entry_ticket) |
| etc | 시스템 (System) | [13-system.md](13-system.md#etc) |
| event_activity | 이벤트 (Event) | [07-event.md](07-event.md#event_activity) |
| event_attendance | 이벤트 (Event) | [07-event.md](07-event.md#event_attendance) |
| event_attendance_apply | 이벤트 (Event) | [07-event.md](07-event.md#event_attendance_apply) |
| event_campaign | 이벤트 (Event) | [07-event.md](07-event.md#event_campaign) |
| event_condition_status | 이벤트 (Event) | [07-event.md](07-event.md#event_condition_status) |
| event_configuration | 이벤트 (Event) | [07-event.md](07-event.md#event_configuration) |
| event_coupon | 이벤트 (Event) | [07-event.md](07-event.md#event_coupon) |
| event_draw_history | 이벤트 (Event) | [07-event.md](07-event.md#event_draw_history) |
| event_info | 이벤트 (Event) | [07-event.md](07-event.md#event_info) |
| event_item_application | 이벤트 (Event) | [07-event.md](07-event.md#event_item_application) |
| event_item_application_apply | 이벤트 (Event) | [07-event.md](07-event.md#event_item_application_apply) |
| event_item_application_item_list | 이벤트 (Event) | [07-event.md](07-event.md#event_item_application_item_list) |
| event_notification | 이벤트 (Event) | [07-event.md](07-event.md#event_notification) |
| event_notification_queue | 이벤트 (Event) | [07-event.md](07-event.md#event_notification_queue) |
| event_notification_type | 이벤트 (Event) | [07-event.md](07-event.md#event_notification_type) |
| event_popup | 이벤트 (Event) | [07-event.md](07-event.md#event_popup) |
| event_prize | 이벤트 (Event) | [07-event.md](07-event.md#event_prize) |
| event_prize_daily_stats | 이벤트 (Event) | [07-event.md](07-event.md#event_prize_daily_stats) |
| faq | 시스템 (System) | [13-system.md](13-system.md#faq) |
| faq_group | 시스템 (System) | [13-system.md](13-system.md#faq_group) |
| food_list | 상품 (Item) | [03-item.md](03-item.md#food_list) |
| frequency | 쿠폰/포인트 (Coupon & Point) | [06-coupon.md](06-coupon.md#frequency) |
| frequency_reward | 쿠폰/포인트 (Coupon & Point) | [06-coupon.md](06-coupon.md#frequency_reward) |
| frequency_step | 쿠폰/포인트 (Coupon & Point) | [06-coupon.md](06-coupon.md#frequency_step) |
| gift_history | 주문 (Order) | [04-order.md](04-order.md#gift_history) |
| grade | 회원 (Member) | [01-member.md](01-member.md#grade) |
| grade_coupon | 회원 (Member) | [01-member.md](01-member.md#grade_coupon) |
| home_tab_list | 콘텐츠 (Content) | [08-content.md](08-content.md#home_tab_list) |
| item_badge | 상품 (Item) | [03-item.md](03-item.md#item_badge) |
| item_category | 상품 (Item) | [03-item.md](03-item.md#item_category) |
| item_dmb_list | 상품 (Item) | [03-item.md](03-item.md#item_dmb_list) |
| item_dmb_title | 상품 (Item) | [03-item.md](03-item.md#item_dmb_title) |
| item_material | 상품 (Item) | [03-item.md](03-item.md#item_material) |
| item_memo | 상품 (Item) | [03-item.md](03-item.md#item_memo) |
| item_pet_kind | 상품 (Item) | [03-item.md](03-item.md#item_pet_kind) |
| item_qna | 상품 (Item) | [03-item.md](03-item.md#item_qna) |
| item_qna_comment | 상품 (Item) | [03-item.md](03-item.md#item_qna_comment) |
| item_stock_date | 상품 (Item) | [03-item.md](03-item.md#item_stock_date) |
| item_stock_log | 상품 (Item) | [03-item.md](03-item.md#item_stock_log) |
| item_type | 상품 (Item) | [03-item.md](03-item.md#item_type) |
| items | 상품 (Item) | [03-item.md](03-item.md#items) |
| items___test | 상품 (Item) | [03-item.md](03-item.md#items___test) |
| items_detail | 상품 (Item) | [03-item.md](03-item.md#items_detail) |
| items_option | 상품 (Item) | [03-item.md](03-item.md#items_option) |
| json_chunk | 시스템 (System) | [13-system.md](13-system.md#json_chunk) |
| kls_goods_inventory | 파트너 (Partner) | [12-partner.md](12-partner.md#kls_goods_inventory) |
| kls_invoices | 파트너 (Partner) | [12-partner.md](12-partner.md#kls_invoices) |
| kls_order_items | 파트너 (Partner) | [12-partner.md](12-partner.md#kls_order_items) |
| kls_orders | 파트너 (Partner) | [12-partner.md](12-partner.md#kls_orders) |
| kls_requests | 파트너 (Partner) | [12-partner.md](12-partner.md#kls_requests) |
| landing_route | 시스템 (System) | [13-system.md](13-system.md#landing_route) |
| like_history | 시스템 (System) | [13-system.md](13-system.md#like_history) |
| live_rooms | 시스템 (System) | [13-system.md](13-system.md#live_rooms) |
| marketing_log | 알림 (Alarm) | [11-alarm.md](11-alarm.md#marketing_log) |
| material_list | 상품 (Item) | [03-item.md](03-item.md#material_list) |
| member | 회원 (Member) | [01-member.md](01-member.md#member) |
| member_20230227 | 회원 (Member) | [01-member.md](01-member.md#member_20230227) |
| member_action_log | 회원 (Member) | [01-member.md](01-member.md#member_action_log) |
| member_claim | 회원 (Member) | [01-member.md](01-member.md#member_claim) |
| member_frequency_reward | 회원 (Member) | [01-member.md](01-member.md#member_frequency_reward) |
| member_grade_job | 회원 (Member) | [01-member.md](01-member.md#member_grade_job) |
| member_grade_log | 회원 (Member) | [01-member.md](01-member.md#member_grade_log) |
| member_install_info | 회원 (Member) | [01-member.md](01-member.md#member_install_info) |
| member_out_item | 회원 (Member) | [01-member.md](01-member.md#member_out_item) |
| member_out_reason | 회원 (Member) | [01-member.md](01-member.md#member_out_reason) |
| member_out_request | 회원 (Member) | [01-member.md](01-member.md#member_out_request) |
| member_qna | 회원 (Member) | [01-member.md](01-member.md#member_qna) |
| member_scrap | 회원 (Member) | [01-member.md](01-member.md#member_scrap) |
| member_social | 회원 (Member) | [01-member.md](01-member.md#member_social) |
| member_subscription | 회원 (Member) | [01-member.md](01-member.md#member_subscription) |
| member_view_item | 회원 (Member) | [01-member.md](01-member.md#member_view_item) |
| notice | 시스템 (System) | [13-system.md](13-system.md#notice) |
| optimize_view_items | 상품 (Item) | [03-item.md](03-item.md#optimize_view_items) |
| order | 주문 (Order) | [04-order.md](04-order.md#order) |
| order241010 | 주문 (Order) | [04-order.md](04-order.md#order241010) |
| order_delivery | 주문 (Order) | [04-order.md](04-order.md#order_delivery) |
| order_detail | 주문 (Order) | [04-order.md](04-order.md#order_detail) |
| order_discount | 주문 (Order) | [04-order.md](04-order.md#order_discount) |
| order_history | 주문 (Order) | [04-order.md](04-order.md#order_history) |
| order_out_item | 주문 (Order) | [04-order.md](04-order.md#order_out_item) |
| order_out_reason | 주문 (Order) | [04-order.md](04-order.md#order_out_reason) |
| order_payment | 주문 (Order) | [04-order.md](04-order.md#order_payment) |
| order_settlement | 주문 (Order) | [04-order.md](04-order.md#order_settlement) |
| order_sms_history | 주문 (Order) | [04-order.md](04-order.md#order_sms_history) |
| ordered | 주문 (Order) | [04-order.md](04-order.md#ordered) |
| partners | 파트너 (Partner) | [12-partner.md](12-partner.md#partners) |
| payment_error_log | 주문 (Order) | [04-order.md](04-order.md#payment_error_log) |
| pet | 반려동물 (Pet) | [02-pet.md](02-pet.md#pet) |
| pet_allergy | 반려동물 (Pet) | [02-pet.md](02-pet.md#pet_allergy) |
| pet_disease | 반려동물 (Pet) | [02-pet.md](02-pet.md#pet_disease) |
| pet_food | 반려동물 (Pet) | [02-pet.md](02-pet.md#pet_food) |
| pet_kind | 반려동물 (Pet) | [02-pet.md](02-pet.md#pet_kind) |
| pet_type | 반려동물 (Pet) | [02-pet.md](02-pet.md#pet_type) |
| photos | 리뷰 (Review) | [09-review.md](09-review.md#photos) |
| plus_shipping_area | 배송 (Delivery) | [10-delivery.md](10-delivery.md#plus_shipping_area) |
| point | 쿠폰/포인트 (Coupon & Point) | [06-coupon.md](06-coupon.md#point) |
| post | 콘텐츠 (Content) | [08-content.md](08-content.md#post) |
| post_detail | 콘텐츠 (Content) | [08-content.md](08-content.md#post_detail) |
| post_recipe_item | 콘텐츠 (Content) | [08-content.md](08-content.md#post_recipe_item) |
| post_recipe_item_tag | 콘텐츠 (Content) | [08-content.md](08-content.md#post_recipe_item_tag) |
| promotion_items | 상품 (Item) | [03-item.md](03-item.md#promotion_items) |
| push_token_list | 알림 (Alarm) | [11-alarm.md](11-alarm.md#push_token_list) |
| reply | 리뷰 (Review) | [09-review.md](09-review.md#reply) |
| restock_notification | 알림 (Alarm) | [11-alarm.md](11-alarm.md#restock_notification) |
| restock_notification_queue | 알림 (Alarm) | [11-alarm.md](11-alarm.md#restock_notification_queue) |
| review | 리뷰 (Review) | [09-review.md](09-review.md#review) |
| review_230302 | 리뷰 (Review) | [09-review.md](09-review.md#review_230302) |
| review_option | 리뷰 (Review) | [09-review.md](09-review.md#review_option) |
| review_option_category_list | 리뷰 (Review) | [09-review.md](09-review.md#review_option_category_list) |
| review_option_list | 리뷰 (Review) | [09-review.md](09-review.md#review_option_list) |
| scheduler_log | 시스템 (System) | [13-system.md](13-system.md#scheduler_log) |
| section | 콘텐츠 (Content) | [08-content.md](08-content.md#section) |
| section___test | 콘텐츠 (Content) | [08-content.md](08-content.md#section___test) |
| section_contents | 콘텐츠 (Content) | [08-content.md](08-content.md#section_contents) |
| section_detail | 콘텐츠 (Content) | [08-content.md](08-content.md#section_detail) |
| section_detail___test | 콘텐츠 (Content) | [08-content.md](08-content.md#section_detail___test) |
| sms_send_log | 알림 (Alarm) | [11-alarm.md](11-alarm.md#sms_send_log) |
| sms_template | 알림 (Alarm) | [11-alarm.md](11-alarm.md#sms_template) |
| spare_items | 상품 (Item) | [03-item.md](03-item.md#spare_items) |
| subscribe | 구독 (Subscribe) | [05-subscribe.md](05-subscribe.md#subscribe) |
| subscribe_card | 구독 (Subscribe) | [05-subscribe.md](05-subscribe.md#subscribe_card) |
| subscribe_fail | 구독 (Subscribe) | [05-subscribe.md](05-subscribe.md#subscribe_fail) |
| subscribe_fail_item_list | 구독 (Subscribe) | [05-subscribe.md](05-subscribe.md#subscribe_fail_item_list) |
| subscribe_item | 구독 (Subscribe) | [05-subscribe.md](05-subscribe.md#subscribe_item) |
| subscribe_item_temp | 구독 (Subscribe) | [05-subscribe.md](05-subscribe.md#subscribe_item_temp) |
| subscribe_pass | 구독 (Subscribe) | [05-subscribe.md](05-subscribe.md#subscribe_pass) |
| teamfresh_stock_excel | 파트너 (Partner) | [12-partner.md](12-partner.md#teamfresh_stock_excel) |
| user | 시스템 (System) | [13-system.md](13-system.md#user) |
| view_items | 상품 (Item) | [03-item.md](03-item.md#view_items) |
| vvip250102 | VIP/테스트 (VIP & Test) | [99-vip.md](99-vip.md#vvip250102) |
| vvip250701 | VIP/테스트 (VIP & Test) | [99-vip.md](99-vip.md#vvip250701) |
| z_test_member_one | VIP/테스트 (VIP & Test) | [99-vip.md](99-vip.md#z_test_member_one) |
| z_test_member_thr | VIP/테스트 (VIP & Test) | [99-vip.md](99-vip.md#z_test_member_thr) |
| z_test_member_two | VIP/테스트 (VIP & Test) | [99-vip.md](99-vip.md#z_test_member_two) |

---

**총 175개 테이블**
