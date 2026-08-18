[English](README.md) | [한국어](README.ko.md) | 简体中文 | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md) | [Tiếng Việt](README.vi.md) | [Français](README.fr.md) | [Español](README.es.md)

# paperpack

回答一组问题，得到算好的数字，每一个数字都附有出处。完全在浏览器中运行。

访问 https://paperpack-7v7.pages.dev/ 即可使用，无需安装任何东西。您输入的内容永远不会离开这个标签页，托管版本和您自建的版本都是如此。

![填写完成的打工度假税务规则包](docs/screenshot.png)

第一个规则包计算澳大利亚打工度假者的税。任一时点约有 211,000 人持有 417 或 462 签证，其中大多数人没有免税额、从第一元收入起就要缴税，还有不少人被从未注册为打工度假雇主的雇主多扣了税。这笔钱只有报税才能拿回来。

它还计算离澳养老金支付（DASP）——对大多数背包客来说，这是两个数字中更大的一个，也是被课税最重的一个。

## 它做什么

- 计算 2025-26 和 2026-27 年度打工度假收入的税额
- 显示您已被预扣的税款，以及两者的差额
- 在国籍会改变结果的地方向您提示，八个条约国和十一个互惠医疗协定国家的国籍确实会改变结果
- 为条约国居民运行 *Addy* 比较：分别按打工度假者身份和澳大利亚居民国民身份计算税额，两者都展示出来，并采用较低的一个——这才是条约真正给您的东西
- 计算 DASP 申领在扣税后实际给您留下多少：适用打工度假税率的情形按该税率计算，不适用的情形按普通临时居民税率计算
- 每个数字都标明它出自哪个 ATO 页面，以及该页面最后核对的日期
- 支持英语、韩语、简繁两种中文、日语、越南语、法语和西班牙语

## 它不做什么

- 它不代为报税。报税要通过 myTax，由您亲自完成。
- 它不假定居民基础一定胜出。条约给您的是两种计税结果中较低的一个，而不是居民税率，两个结果都会显示在屏幕上。
- 它不处理在澳大利亚境外赚取的收入。这类收入只计入比较的一侧而不计入另一侧，所以工具会明确说明，而不是悄悄算错。
- 在 ATO 公布 2026-27 年度的 Medicare 征费起征点之前，它不会估算居民该年度的税额。拒绝计算一个年度好过瞎猜。
- 它不对自己没有读过的扣除规则建模。从 2026-27 年度起，300 澳元的免凭证额度被废止，取而代之的是仅适用于居民的 1,000 澳元标准扣除，因此这两个年度的行为是有意不同的。
- 它不单凭签证决定 DASP 税率。持有过 417 或 462 只是判定的一半；这笔支付还必须包含持有签证期间存入的养老金，而一旦包含，较高税率就适用于整笔支付。
- 它不是税务代理服务，其中的任何内容都不构成税务建议。它只是把公布的税率套用到您输入的数字上。请自行核对这些数字；如果您需要可以信赖的建议，请咨询注册税务代理。参见 [docs/legal.md](docs/legal.md)。

## 运行

```
pnpm install
pnpm build
npx http-server . -p 8080     # or any static server
```

然后打开 `/web/index.html`。没有后端，也没有任何需要配置的东西。您输入的内容只留在标签页里。

## 规则如何存储

每一个法规数字都存放在 `packs/<pack>/rules/*.json` 中，没有出处的数字一个也不会发布：

```json
"noTfnWithholdingRate": {
  "value": 0.45,
  "from": "2024-07-01",
  "source": "https://www.ato.gov.au/tax-rates-and-codes/schedule-15-tax-table-for-working-holiday-makers",
  "checked": "2026-08-18",
  "note": "45 per cent, not 47. The published 47 per cent applies to a resident payee; Schedule 15 sets a flat 45 per cent for working holiday makers with no residency test. The rate itself is long standing, but this URL is overwritten each 1 July and now serves the version effective 1 July 2026, so the start date recorded here rests on an archived copy of the previous version rather than on the live page."
}
```

`scripts/check.mjs` 会拒绝任何缺少 `value`、`from`、`source` 或 `checked` 的规则，也会拒绝存放在 `rules` 键之外的法规数据；测试套件还会断言每张税率级距表的基础金额与其下方的级距相符——正是靠这一点，敲错的税率会在任何人看到错误数字之前被抓出来。

如果页面没有公布生效日期，`from` 记录的就是首次读到该数值的日期，并在规则的 note 中说明这一点。

澳大利亚的税率在 7 月 1 日变更。请在那之前重新核对来源；当记录的核对日期落后于最近一个 7 月 1 日时，每月运行的 CI 作业就会开始失败。

## 添加语言

复制 `packs/au-whm-tax/i18n/en.json`，翻译值、保留键，然后在 `web/index.html` 中注册该语言（`dicts` 映射和一个按钮）。测试会读取 `i18n/` 中的每个文件，键缺失或为空时即告失败。税务措辞在翻译中很容易走样，所以请让来源链接始终显示在您翻译的任何内容旁边。

## 添加规则包

一个规则包由一份问卷（`interview.ts`）、一项或多项计算（`calculate.ts`、`dasp.ts`）、带来源的规则数据（`rules/*.json`）和文案（`i18n/*.json`）组成。`src/` 中的引擎是一个问题求值器加一个级距表计算器；其中没有任何澳大利亚特有的东西。

## 许可证

MIT。
