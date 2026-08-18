// Drives the real page in a real browser. Also produces the README screenshot.
// Usage: node scripts/e2e.mjs [--shot docs/screenshot.png]

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' }
const root = process.cwd()

const server = createServer(async (req, res) => {
  const path = join(root, normalize(decodeURI(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''))
  try {
    const body = await readFile(path)
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } })
const requests = []
page.on('request', r => requests.push(r))
const websockets = []
page.on('websocket', w => websockets.push(w.url()))
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => m.type() === 'error' && errors.push(m.text()))

await page.goto(`${base}/web/index.html`)
await page.waitForSelector('fieldset')

const legend = async i => (await page.locator('fieldset legend').nth(i).textContent())?.trim()
const field = id => page.locator(`fieldset[data-q="${id}"]`)
const answerSelect = (id, value) => field(id).locator('select').selectOption(value)
const answerNumber = (id, value) => field(id).locator('input').fill(String(value))
const answerBool = (id, yes) => field(id).locator(`.yesno button[data-value="${yes}"]`).click()

assert.match(await legend(0), /income year/i)

// A Korean backpacker whose employer never registered, so 30 per cent was withheld
// on 30,000 dollars. The whole point of the tool is that this comes back.
await answerSelect('financialYear', '2025-26')
await answerSelect('nationality', 'KR')
// Typed digit by digit: the form must not be rebuilt under the cursor.
const days = field('daysInAustralia').locator('input')
await days.click()
await days.pressSequentially('200')
assert.equal(await days.inputValue(), '200')
assert.ok(await days.evaluate(el => el === document.activeElement), 'focus lost while typing')
await answerBool('maintainedHomeOverseas', true)
await answerBool('isAustralianTaxResident', false)
await answerBool('providedTfn', true)
await answerNumber('grossIncome', 30000)
await answerNumber('taxWithheld', 9000)
await answerNumber('workRelatedDeductions', 0)

await page.waitForSelector('#result:not([hidden])')
const figures = await page.locator('#figures').innerText()
assert.match(figures, /Estimated refund/, figures)
assert.match(figures, /\$4,500/, figures)

// A typed negative is clamped where the user can see it, not just in the maths.
await answerNumber('grossIncome', -5)
assert.equal(await field('grossIncome').locator('input').inputValue(), '0', 'the clamp must show in the field')
await answerNumber('grossIncome', 30000)

// Sources stay hidden until the estimate is explicitly acknowledged.
assert.ok(await page.locator('#worksheet').isHidden(), 'sources should be gated behind the confirmation')
await page.locator('#confirm').check()
await page.waitForSelector('#worksheet:not([hidden])')
assert.equal(await page.locator('#sources li').count(), 4, 'every cited rule and only the cited rules')

// The acknowledgment belongs to one estimate. Changing an answer lapses it.
await answerNumber('taxWithheld', 9500)
assert.ok(await page.locator('#worksheet').isHidden(), 'confirmation must lapse when figures change')
await answerNumber('taxWithheld', 9000)
await page.locator('#confirm').check()

// Every locale renders, and the interview itself localises with it.
for (const b of await page.locator('.locale button').all()) {
  const code = await b.getAttribute('data-locale')
  const dict = JSON.parse(await readFile(`packs/au-whm-tax/i18n/${code}.json`, 'utf8'))
  await b.click()
  assert.equal(await page.locator('.tagline').textContent(), dict['app.tagline'], `${code} did not load`)
  assert.equal(await page.locator('.yesno button').first().textContent(), dict['ui.yes'], `${code} yes/no buttons`)
}
await page.locator('.locale button[data-locale=en]').click()
// Neither a locale switch nor re-clicking the active tool changes any figure,
// so neither may lapse the acknowledgment.
assert.ok(await page.locator('#confirm').isChecked(), 'locale switch must not lapse the confirmation')
await page.locator('.tools button[data-tool=tax]').click()
assert.ok(await page.locator('#confirm').isChecked(), 're-clicking the active tool must not lapse the confirmation')

// Dark mode: the page must follow the system scheme, the explicit choice must beat
// the system in both directions, and the native select popup must be painted for the
// scheme in use (color-scheme), or option text disappears into it.
await page.emulateMedia({ colorScheme: 'dark' })
const scheme = () => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)
const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
const lum = c => {
  assert.match(c, /^rgb\(/, `body background must be opaque, got ${c}`)
  return c.match(/\d+/g).slice(0, 3).reduce((a, b) => a + Number(b), 0)
}
const darkBg = await bodyBg()
assert.ok(lum(darkBg) < 200, `auto must follow a dark system scheme, got ${darkBg}`)
await page.locator('#theme').click()
const lightBg = await bodyBg()
assert.ok(lum(lightBg) > 600, `explicit light must override a dark system, got ${lightBg}`)
assert.equal(await scheme(), 'light')
await page.locator('#theme').click()
await page.emulateMedia({ colorScheme: 'light' })
assert.equal(await bodyBg(), darkBg, 'explicit dark must override a light system')
assert.equal(await scheme(), 'dark', 'popups must be dark when the page is dark')
await page.locator('#theme').click()
assert.equal(await bodyBg(), lightBg, 'auto must follow the system again')
assert.equal(await page.locator('#theme').textContent(), 'Auto', 'cycle ends back at auto')

const shot = process.argv.includes('--shot') ? process.argv[process.argv.indexOf('--shot') + 1] : null
if (shot) await page.screenshot({ path: shot, fullPage: true })

// The treaty path is the one that shows two assessments and applies the cheaper.
await answerSelect('nationality', 'GB')
await answerBool('isAustralianTaxResident', true)
await answerNumber('residentMonths', 12)
await answerBool('hasMedicareEntitlementStatement', false)
await page.waitForSelector('#comparison:not([hidden])')
const sides = await page.locator('#comparison').innerText()
assert.match(sides, /working holiday maker/i, sides)
assert.match(sides, /resident national/i, sides)
assert.equal(await page.locator('#comparison tr.total').count(), 1, 'exactly one side applies')

// The super calculator is a separate tool behind the same disclaimer gate.
await page.locator('.tools button[data-tool=dasp]').click()
await answerNumber('superBalance', 6000)
await answerBool('everHeldWhmVisa', true)
await answerNumber('taxFreeComponent', 0)
await answerNumber('untaxedElement', 0)
await answerBool('visaCeased', true)
await answerBool('hasDeparted', true)
// The second limb of the rate test is unanswered, so no figure may show yet.
assert.ok(await page.locator('#result').isHidden(), 'a blank answer must not be read as a No')
await answerBool('superFromWhmPeriod', true)
await page.waitForSelector('#result:not([hidden])')
const dasp = await page.locator('#figures').innerText()
assert.match(dasp, /\$2,100/, dasp)
assert.ok(await page.locator('#worksheet').isHidden(), 'switching tools must re-arm the confirmation')

// The theme choice must survive a reload, applied before the module loads. Answers
// must not: they live in memory only, so this comes last.
await page.locator('#theme').click()
await page.locator('#theme').click()
await page.reload()
await page.waitForSelector('fieldset')
assert.equal(await bodyBg(), darkBg, 'stored dark must survive a reload on a light system')
assert.ok(await page.locator('#result').isHidden(), 'answers must not survive a reload')

assert.deepEqual(errors, [], 'the page logged errors')
assert.equal(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(rs => rs.length)), 0,
  'a service worker would sit outside the network invariant below')

// Leave the page so exit-time senders (pagehide, beacons) fire before judging.
await page.goto('about:blank')

// The privacy promise is measured, not assumed: every request the page ever makes,
// across the whole session above, is a bodyless same-host GET with no query string.
// Analytics, error reporting, or a form submission added anywhere would fail here.
assert.ok(requests.length > 0)
for (const r of requests) {
  assert.equal(r.method(), 'GET', `non-GET request: ${r.method()} ${r.url()}`)
  assert.ok(!r.postData(), `request with a body: ${r.url()}`)
  assert.ok(r.url().startsWith(`${base}/`), `request left the host: ${r.url()}`)
  assert.equal(new URL(r.url()).search, '', `query string on a request: ${r.url()}`)
}
assert.deepEqual(websockets, [], 'the page opened a websocket')
await browser.close()
server.close()
console.log(`e2e ok${shot ? ` (screenshot: ${shot})` : ''}`)
