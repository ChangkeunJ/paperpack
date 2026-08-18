[English](README.md) | [한국어](README.ko.md) | [简体中文](README.zh.md) | 繁體中文 | [日本語](README.ja.md) | [Tiếng Việt](README.vi.md) | [Français](README.fr.md) | [Español](README.es.md)

# paperpack

回答一組問題，就能拿回算好的數字，而且每一個數字都附有出處。全部在瀏覽器內執行。

直接在 https://paperpack-7v7.pages.dev/ 使用，無需安裝任何東西。您輸入的內容絕不會離開瀏覽器分頁，託管版本和您自行架設的版本都是如此。

![已填寫完成的打工度假稅 pack](docs/screenshot.png)

第一個 pack 計算澳洲打工度假者的稅。任一時點大約有 211,000 人持有 417 或 462 簽證，其中大多數人沒有免稅額，從第一元起就要繳稅，還有許多人被從未登記為打工度假雇主的雇主多扣了稅。這筆錢只有在您報稅之後才會回來。

它也計算離澳退休金給付（DASP）；對大多數背包客而言，這是兩個數字中較大的一個，也是被課稅最重的一個。

## 它做的事

- 計算 2025-26 和 2026-27 年度打工度假收入的稅額
- 顯示您已被扣繳的金額，以及與應納稅額之間的差額
- 在國籍會改變結果的地方提出提醒；八個協定國和十一個互惠醫療協定國家就是如此
- 為協定國居民執行 *Addy* 比較：分別按打工度假者身分和澳洲居民國民身分計算稅額，兩者都顯示出來，並採用較低的一種，這正是協定實際給您的東西
- 計算 DASP 請領在扣稅後您實際到手的金額；適用打工度假稅率時按該稅率計算，不適用時按普通臨時居民稅率計算
- 每一個數字都印出它來自的 ATO 頁面，以及該頁面最後核對的日期
- 支援英文、韓文、簡體與繁體中文、日文、越南文、法文和西班牙文

## 它不做的事

- 它不會替您申報任何東西。申報要透過 myTax，由您親自完成。
- 它不假設居民計稅基礎一定勝出。協定給您的是兩種計算結果中較低的一種，而不是直接給您居民稅率，而且兩者都會顯示在畫面上。
- 它不處理在澳洲以外賺取的收入。這類收入只計入比較中的一側而不計入另一側，因此工具會明白說出這一點，而不是悄悄算錯。
- 在 ATO 公布 2026-27 年度的 Medicare 徵費門檻之前，它不會估算居民該年度的稅額。拒絕計算一個年度，勝過憑空猜測。
- 它不會為自己沒有讀過的扣除規則建立模型。自 2026-27 年度起，300 澳幣的免憑證額度已被廢止，改由僅適用於居民的 1,000 澳幣標準扣除額取代，因此兩個年度的行為是刻意不同的。
- 它不會只憑簽證就決定 DASP 稅率。持有過 417 或 462 只是判定的一半；給付中還必須包含持有簽證期間提撥的退休金，而只要包含，較高的稅率就適用於整筆給付。
- 它不是稅務代理服務，其中的任何內容都不構成稅務建議。它只是把已公布的稅率套用到您輸入的數字上。請自行核對這些數字；如果您需要可以信賴的建議，請諮詢註冊稅務代理人。請參閱 [docs/legal.md](docs/legal.md)。

## 執行方式

```
pnpm install
pnpm build
npx http-server . -p 8080     # or any static server
```

然後開啟 `/web/index.html`。沒有後端，也沒有任何需要設定的東西。您輸入的內容只會留在瀏覽器分頁裡。

## 規則的儲存方式

每一個法規數字都存放在 `packs/<pack>/rules/*.json`，而且沒有任何一個會在缺少出處的情況下發布：

```json
"noTfnWithholdingRate": {
  "value": 0.45,
  "from": "2024-07-01",
  "source": "https://www.ato.gov.au/tax-rates-and-codes/schedule-15-tax-table-for-working-holiday-makers",
  "checked": "2026-08-18",
  "note": "45 per cent, not 47. The published 47 per cent applies to a resident payee; Schedule 15 sets a flat 45 per cent for working holiday makers with no residency test. The rate itself is long standing, but this URL is overwritten each 1 July and now serves the version effective 1 July 2026, so the start date recorded here rests on an archived copy of the previous version rather than on the live page."
}
```

`scripts/check.mjs` 會拒絕任何缺少 `value`、`from`、`source` 或 `checked` 的規則，也會拒絕存放在 `rules` 鍵之外的法規資料；測試套件則會驗證每張稅率級距表的基準金額與其下方的級距相符，打錯的稅率就是這樣在任何人看到錯誤數字之前被抓出來的。

當來源頁面沒有公布生效日期時，`from` 記錄的是該數值第一次被讀取的日期，而且規則的 note 會說明這一點。

澳洲的稅率在 7 月 1 日調整。請在那之前重新核對來源；當記錄的核對日期落後於最近一個 7 月 1 日時，每月執行的 CI 工作就會開始失敗。

## 新增語言

複製 `packs/au-whm-tax/i18n/en.json`，翻譯值、保留鍵，然後在 `web/index.html` 中註冊該語系（`dicts` 對應表和一個按鈕）。測試會讀取 `i18n/` 中的每一個檔案，只要有鍵缺失或為空就會失敗。稅務用語在翻譯時很容易出錯，因此請讓來源連結保持顯示在您翻譯的每項內容旁邊。

## 新增 pack

一個 pack 由一份問卷（`interview.ts`）、一項或多項計算（`calculate.ts`、`dasp.ts`）、附有出處的規則資料（`rules/*.json`）和字串（`i18n/*.json`）組成。`src/` 中的引擎是一個問題求值器加一個稅率級距表計算器；其中沒有任何部分是澳洲專屬的。

## 授權條款

MIT。
