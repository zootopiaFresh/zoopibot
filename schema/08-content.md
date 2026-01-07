# 콘텐츠 (Content)

> 배너, 섹션, 콘텐츠, 게시물 관련 테이블

---

## 📋 테이블 목록

- [banner](#banner)
- [banner_detail](#banner_detail)
- [banner_items](#banner_items)
- [content](#content)
- [content_list](#content_list)
- [content_list_item](#content_list_item) - 콘텐츠 질문 상품 연결 테이블
- [content_template](#content_template)
- [content_template_list](#content_template_list)
- [home_tab_list](#home_tab_list)
- [post](#post)
- [post_detail](#post_detail)
- [post_recipe_item](#post_recipe_item)
- [post_recipe_item_tag](#post_recipe_item_tag)
- [section](#section)
- [section___test](#section___test)
- [section_contents](#section_contents)
- [section_detail](#section_detail)
- [section_detail___test](#section_detail___test)

---

## banner

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(100) | YES |  |  | 배너 제목 |
| bold_title | varchar(100) | YES |  |  | 굵은 제목 |
| sub_title | varchar(100) | YES |  |  | 부제목 |
| thumbnail_img | varchar(500) | YES |  |  | 썸네일 이미지 URL |
| big_img_url | varchar(500) | YES |  |  | 배너 메인 이미지 URL |
| items_title | varchar(100) | YES |  |  | 아이템 제목 |
| url | varchar(500) | YES |  |  | 배너 링크 URL |
| target_no | bigint | YES |  |  | 대상 상품/이벤트 번호 |
| external_url | varchar(500) | YES |  |  | 외부 링크 URL |
| openDate | datetime | YES |  |  | 배너 시작 일시 |
| closeDate | datetime | YES |  |  | 배너 종료 일시 |
| always_open_yn | varchar(10) | YES |  | N | 항상 표시 여부 (Y/N) |
| always_open_title | varchar(100) | YES |  |  | 항상 표시 제목 |
| ordering | int | YES |  | 0 | 배너 표시 순서 |
| show_category_yn | varchar(10) | YES |  | N | 카테고리 표시 여부 (Y/N) |
| hide_yn | varchar(10) | YES | MUL | N | 숨김 여부 (Y/N) |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 (Y/N) |
| createdAt | datetime | NO |  |  | 생성 일시 |
| updatedAt | datetime | NO |  |  | 수정 일시 |
| alias_code | varchar(30) | YES |  |  | 배너 별칭 코드 |
| is_selected | varchar(10) | YES |  | N | 선택 여부 (Y/N) |
| show_title_yn | varchar(10) | YES |  | Y | 제목 표시 여부 (Y/N) |

## banner_detail

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| banner_no | bigint | NO |  |  | 배너번호 |
| banner_detail_no | bigint | YES |  |  | 배너상세참조번호 |
| title | varchar(500) | YES |  |  | 제목 |
| content | text | YES |  |  | 콘텐츠 |
| layout_type | varchar(10) | YES |  | 2column | 레이아웃타입 |
| banner_img_url | varchar(500) | YES |  |  | 배너이미지URL |
| banner_thumbnail_img_url | varchar(500) | YES |  |  | 배너썸네일이미지URL |
| banner_img_width | int | YES |  | 0 | 배너이미지너비 |
| banner_img_height | int | YES |  | 0 | 배너이미지높이 |
| banner_title | varchar(100) | YES |  |  | 배너제목 |
| banner_sub_title | varchar(100) | YES |  |  | 배너부제목 |
| banner_content | varchar(200) | YES |  |  | 배너콘텐츠 |
| banner_btn_title | varchar(50) | YES |  |  | 배너버튼제목 |
| deeplink | varchar(500) | YES |  |  | 딥링크 |
| target_no | bigint | YES |  |  | 대상번호 |
| img_url | varchar(500) | YES |  |  | 이미지URL |
| thumbnail_img_url | varchar(500) | YES |  |  | 썸네일이미지URL |
| img_width | int | YES |  | 0 | 이미지너비 |
| img_height | int | YES |  | 0 | 이미지높이 |
| ordering | bigint | YES |  | 0 | 정렬순서 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |
| start_date | datetime | YES |  |  |  |
| end_date | datetime | YES |  |  |  |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |
| note | varchar(100) | YES |  |  |  |

## banner_items

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| banner_no | bigint | NO |  |  | 배너 번호 |
| banner_detail_no | bigint | YES |  |  | 배너 상세 번호 |
| item_no | bigint | YES | MUL |  | 상품 번호 |
| ordering | bigint | YES |  | 0 | 정렬 순서 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부(Y/N) |
| start_date | datetime | YES |  |  |  |
| end_date | datetime | YES |  |  |  |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |
| note | varchar(100) | YES |  |  |  |

## content

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| template_no | bigint | YES |  |  | 템플릿 번호 |
| type | varchar(100) | YES |  |  | 콘텐츠 유형 |
| title | varchar(500) | YES |  |  | 콘텐츠 제목 |
| creator | bigint | YES |  |  | 작성자 |
| modifier | bigint | YES |  |  | 수정자 |
| status | varchar(50) | YES |  | new | 콘텐츠 상태 |
| expose_yn | varchar(1) | YES |  | N | 노출 여부 |
| del_yn | varchar(1) | YES |  | N | 삭제 여부 |
| link_code | varchar(50) | YES |  |  | 링크 코드 |
| thumbnail_img | varchar(500) | YES |  |  | 썸네일 이미지 경로 |
| ordering | int | YES |  | 0 | 정렬 순서 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## content_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| content_no | bigint | YES |  |  | 콘텐츠 번호 |
| title | varchar(500) | YES |  |  | 보호자님의 성함과 반려동물 소개를 부탁드려요! - 질문 제목 |
| answer | text | YES |  |  | 답변 내용 |
| answer_temp | text | YES |  |  | 임시 저장된 답변 |
| ordering | bigint | YES |  |  | 표시 순서 |
| guideline | text | YES |  |  | 가이드라인 |
| del_yn | varchar(1) | YES |  | N | 삭제 여부 (Y/N) |
| createdAt | datetime | NO |  |  | 생성 일시 |
| updatedAt | datetime | NO |  |  | 수정 일시 |

## content_list_item
> 콘텐츠 질문 상품 연결 테이블

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| content_list_no | bigint | NO | MUL |  | 콘텐츠 질문 PK |
| item_no | bigint | NO | MUL |  | 상품 PK |
| ordering | bigint | YES |  |  | 순서 |
| del_yn | varchar(1) | YES |  | N | 삭제여부 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## content_template

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| type | varchar(100) | YES |  |  | 콘텐츠 타입 |
| title | varchar(500) | YES |  |  | 캐비어 등급 인터뷰 |
| display_name | varchar(500) | YES |  |  | 노출명 |
| del_yn | varchar(1) | YES |  | N | 삭제 여부 |
| modifier | bigint | YES |  |  | 수정자 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## content_template_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| template_no | bigint | YES |  |  |  |
| title | varchar(500) | YES |  |  |  |
| ordering | bigint | YES |  |  |  |
| guideline | text | YES |  |  |  |
| del_yn | varchar(1) | YES |  | N |  |
| modifier | bigint | YES |  |  |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## home_tab_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 탭 번호 |
| name | varchar(100) | YES |  |  | 탭 구분명 |
| title | varchar(100) | YES |  |  | 메인 제목 |
| bold_title | varchar(100) | YES |  |  | 강조 제목 |
| gray_title | varchar(100) | YES |  |  | 보조 제목 |
| sub_title | varchar(100) | YES |  |  | 가격 또는 설명 |
| thumbnail_img | varchar(500) | YES |  |  | 썸네일 이미지 URL |
| ordering | int | YES |  | 0 | 정렬 순서 |
| background_color | varchar(10) | YES |  |  | 배경색 |
| hide_yn | varchar(10) | YES | MUL | N | 숨김 여부 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## post

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | YES | MUL |  | 회원번호 |
| type | varchar(10) | YES |  | 1 | 게시물유형 |
| title | varchar(500) | YES |  |  | 게시물제목 |
| content | text | YES |  |  | 게시물내용 |
| tag_list | json | YES |  |  | 태그목록 |
| concept | json | YES |  |  | 컨셉정보 |
| instagram_url | varchar(1000) | YES |  |  | 인스타그램URL |
| open_date | datetime | YES | MUL |  | 공개일시 |
| like_cnt | int | YES |  | 0 | 좋아요수 |
| reply_cnt | int | YES |  | 0 | 댓글수 |
| temp_yn | varchar(10) | YES |  | N | 임시저장여부 |
| hide_yn | varchar(10) | YES | MUL | N | 숨김여부 |
| del_yn | varchar(10) | YES | MUL | N | 삭제여부 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## post_detail

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| post_no | bigint | YES | MUL |  | 게시물 번호 |
| type | varchar(50) | YES |  | default | 게시물 타입 |
| title | varchar(100) | YES |  |  | 제목 |
| content | text | YES |  |  | 내용 - 음식 제조 방법, 재료, 레시피 등 상세 정보 |
| ordering | bigint | YES | MUL |  | 정렬 순서 |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## post_recipe_item

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| post_no | bigint | YES | MUL |  | 게시물 번호 |
| post_detail_no | bigint | YES | MUL |  | 게시물 상세 번호 |
| item_no | bigint | YES | MUL |  | 아이템 번호 |
| ordering | bigint | YES | MUL |  | 순서 |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## post_recipe_item_tag

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| post_no | bigint | YES |  |  |  |
| tag_name | varchar(500) | YES |  |  |  |
| ordering | bigint | YES |  |  |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## section

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| home_tab_no | bigint | YES |  |  |  |
| post_no | bigint | YES |  |  |  |
| title | varchar(100) | YES |  |  |  |
| sub_title | varchar(100) | YES |  |  |  |
| home_title | varchar(100) | YES |  |  |  |
| home_sub_title | varchar(100) | YES |  |  |  |
| detail_title | varchar(100) | YES |  |  |  |
| detail_content | text | YES |  |  |  |
| img_url | varchar(500) | YES |  |  |  |
| thumb_img_url | varchar(500) | YES |  |  |  |
| big_img_url | varchar(500) | YES |  |  |  |
| big_thumb_img_url | varchar(500) | YES |  |  |  |
| openDate | datetime | YES |  |  |  |
| closeDate | datetime | YES |  |  |  |
| ordering | bigint | YES |  | 0 |  |
| view_type | int | YES |  | 1 |  |
| hide_yn | varchar(10) | YES |  | Y |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |
| alias_code | varchar(30) | YES |  |  |  |
| deeplink | varchar(200) | YES |  |  |  |
| deeplink_param | varchar(255) | YES |  |  |  |

## section___test

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| home_tab_no | bigint | YES | MUL |  |  |
| post_no | bigint | YES |  |  |  |
| title | varchar(100) | YES |  |  |  |
| sub_title | varchar(100) | YES |  |  |  |
| home_title | varchar(100) | YES |  |  |  |
| home_sub_title | varchar(100) | YES |  |  |  |
| detail_title | varchar(100) | YES |  |  |  |
| detail_content | text | YES |  |  |  |
| img_url | varchar(500) | YES |  |  |  |
| thumb_img_url | varchar(500) | YES |  |  |  |
| big_img_url | varchar(500) | YES |  |  |  |
| big_thumb_img_url | varchar(500) | YES |  |  |  |
| openDate | datetime | YES |  |  |  |
| closeDate | datetime | YES |  |  |  |
| ordering | bigint | YES | MUL | 0 |  |
| view_type | int | YES |  | 1 |  |
| hide_yn | varchar(10) | YES | MUL | Y |  |
| del_yn | varchar(10) | YES | MUL | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## section_contents

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| section_no | bigint | YES |  |  |  |
| title | varchar(100) | YES |  |  |  |
| content | text | YES |  |  |  |
| ordering | bigint | YES |  |  |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## section_detail

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| section_no | bigint | NO | MUL |  |  |
| item_no | bigint | NO | MUL |  |  |
| ordering | int | YES |  | 0 |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## section_detail___test

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| section_no | bigint | NO | MUL |  |  |
| item_no | bigint | NO | MUL |  |  |
| ordering | int | YES |  | 0 |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

