[English](README.md) | [한국어](README.ko.md) | [简体中文](README.zh.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md) | Tiếng Việt | [Français](README.fr.md) | [Español](README.es.md)

# paperpack

Trả lời một loạt câu hỏi, nhận lại các con số đã được tính sẵn kèm nguồn gốc của từng
con số một. Chạy hoàn toàn trong trình duyệt.

Dùng ngay tại https://paperpack-7v7.pages.dev/ mà không cần cài đặt gì. Những gì quý vị
nhập không bao giờ rời khỏi tab, trên bản được lưu trữ sẵn cũng như trên bản của chính
quý vị.

![Gói tính thuế working holiday, đã điền xong](docs/screenshot.png)

Pack đầu tiên tính thuế working holiday maker tại Úc. Vào bất kỳ thời điểm nào cũng có
khoảng 211.000 người đang giữ visa 417 hoặc 462, phần lớn bị đánh thuế từ đồng đô la
đầu tiên mà không có ngưỡng miễn thuế, và rất nhiều người bị khấu trừ quá mức bởi một
chủ lao động chưa từng đăng ký làm chủ lao động working holiday. Số tiền đó chỉ quay về
khi quý vị nộp tờ khai.

Nó cũng tính khoản chi trả hưu bổng khi rời Úc (DASP), mà với phần lớn backpacker là
con số lớn hơn trong hai khoản và là khoản bị đánh thuế nặng nhất.

## Những gì công cụ này làm

- Tính thuế trên thu nhập working holiday cho các năm 2025-26 và 2026-27
- Cho biết số thuế quý vị đã bị khấu trừ và phần chênh lệch là bao nhiêu
- Cảnh báo khi quốc tịch làm thay đổi kết quả, điều xảy ra với tám quốc gia có hiệp
  định thuế và mười một quốc gia có hiệp định chăm sóc y tế tương hỗ
- Thực hiện phép so sánh theo án lệ *Addy* cho cư dân của một quốc gia có hiệp định:
  tính thuế theo cả diện working holiday maker lẫn diện công dân Úc cư trú, hiển thị cả
  hai, và áp dụng cách tính có số thuế thấp hơn — đó chính là điều hiệp định thực sự
  dành cho quý vị
- Tính số tiền còn lại sau thuế khi yêu cầu chi trả DASP, theo mức thuế working holiday
  ở nơi mức này áp dụng và theo các mức thuế cư dân tạm thời thông thường ở nơi nó
  không áp dụng
- In ra từng con số kèm trang ATO nơi con số đó được lấy và ngày trang đó được đối chiếu
- Nói tiếng Anh, tiếng Hàn, tiếng Trung cả hai dạng chữ viết, tiếng Nhật, tiếng Việt,
  tiếng Pháp và tiếng Tây Ban Nha

## Những gì công cụ này không làm

- Nó không nộp bất cứ thứ gì. Việc nộp tờ khai diễn ra qua myTax, do chính quý vị thực
  hiện.
- Nó không mặc định rằng cách tính theo diện cư dân thắng. Hiệp định cho quý vị mức
  thấp hơn trong hai kết quả tính, chứ không phải mức thuế cư dân, và cả hai đều hiển
  thị trên màn hình.
- Nó không xử lý thu nhập phát sinh ngoài Úc. Khoản thu nhập đó được tính vào một vế
  của phép so sánh nhưng không tính vào vế kia, nên công cụ nói rõ điều đó thay vì lặng
  lẽ đưa ra kết quả sai.
- Nó không ước tính thuế năm 2026-27 của một cư dân cho đến khi ATO công bố các ngưỡng
  phụ phí Medicare của năm đó. Từ chối một năm vẫn tốt hơn là đoán mò.
- Nó không mô phỏng các quy tắc khấu trừ mà nó chưa đọc. Từ năm 2026-27, mức miễn chứng
  từ 300 đô la bị bãi bỏ và một khoản khấu trừ chuẩn 1.000 đô la thay thế, chỉ dành cho
  cư dân, nên hai năm cố ý hoạt động khác nhau.
- Nó không quyết định mức thuế DASP chỉ dựa vào visa. Việc giữ visa 417 hoặc 462 mới
  chỉ là một nửa điều kiện; khoản chi trả còn phải chứa tiền hưu bổng được đóng vào
  trong thời gian giữ visa đó, và nếu có thì biểu thuế working holiday áp dụng cho toàn bộ khoản
  chi trả.
- Nó không phải là dịch vụ đại lý thuế và không nội dung nào trong nó là tư vấn thuế.
  Nó áp dụng các mức thuế đã công bố lên những con số quý vị nhập. Hãy tự kiểm tra
  chúng, và nếu quý vị cần tư vấn có thể tin cậy được, hãy hỏi một đại lý thuế có đăng
  ký. Xem [docs/legal.md](docs/legal.md).

## Chạy công cụ

```
pnpm install
pnpm build
npx http-server . -p 8080     # or any static server
```

Sau đó mở `/web/index.html`. Không có backend và không có gì phải cấu hình. Những gì
quý vị nhập ở nguyên trong tab.

## Cách lưu trữ các quy tắc

Mọi con số mang tính quy định đều nằm trong `packs/<pack>/rules/*.json`, và không con
số nào được phát hành mà thiếu nguồn gốc xuất xứ:

```json
"noTfnWithholdingRate": {
  "value": 0.45,
  "from": "2024-07-01",
  "source": "https://www.ato.gov.au/tax-rates-and-codes/schedule-15-tax-table-for-working-holiday-makers",
  "checked": "2026-08-18",
  "note": "45 per cent, not 47. The published 47 per cent applies to a resident payee; Schedule 15 sets a flat 45 per cent for working holiday makers with no residency test. The rate itself is long standing, but this URL is overwritten each 1 July and now serves the version effective 1 July 2026, so the start date recorded here rests on an archived copy of the previous version rather than on the live page."
}
```

`scripts/check.mjs` từ chối bất kỳ quy tắc nào thiếu `value`, `from`, `source` hoặc
`checked`, từ chối dữ liệu quy định đặt ngoài khóa `rules`, và bộ kiểm thử xác nhận
rằng các số tiền cơ sở của mỗi bảng bậc thuế khớp với bảng ngay bên dưới, nhờ đó một
mức thuế gõ nhầm bị phát hiện trước khi bất kỳ ai nhìn thấy một con số sai.

Khi một trang không công bố ngày hiệu lực, `from` ghi lại ngày giá trị đó được đọc lần
đầu, và phần ghi chú của quy tắc nói rõ điều này.

Các mức thuế của Úc thay đổi vào ngày 1 tháng 7. Hãy đối chiếu lại các nguồn trước thời
điểm đó; một tác vụ CI chạy hằng tháng sẽ bắt đầu báo lỗi khi các ngày đối chiếu được
ghi lại tụt sau ngày 1 tháng 7 gần nhất.

## Thêm một ngôn ngữ

Sao chép `packs/au-whm-tax/i18n/en.json`, dịch các giá trị, giữ nguyên các khóa, rồi
đăng ký locale trong `web/index.html` (map `dicts` và một nút bấm). Bộ kiểm thử tự quét
mọi tệp trong `i18n/` và báo lỗi nếu một khóa bị thiếu hoặc để trống. Từ ngữ về thuế
rất dễ dịch sai, vì vậy hãy giữ liên kết nguồn hiển thị ngay cạnh bất cứ nội dung nào
quý vị dịch.

## Thêm một pack

Một pack gồm một phần phỏng vấn (`interview.ts`), một hoặc nhiều phép tính
(`calculate.ts`, `dasp.ts`), dữ liệu quy tắc kèm nguồn (`rules/*.json`) và các chuỗi
văn bản (`i18n/*.json`). Engine trong `src/` là một bộ đánh giá câu hỏi và một bộ tính
theo bảng bậc thuế; không có gì trong đó riêng cho nước Úc.

## Giấy phép

MIT.
