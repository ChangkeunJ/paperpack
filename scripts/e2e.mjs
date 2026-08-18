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
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => m.type() === 'error' && errors.push(m.text()))

await page.goto(`${base}/web/index.html`)
await page.waitForSelector('fieldset')

const legend = async i => (await page.locator('fieldset legend').nth(i).textContent())?.trim()
const answerSelect = (i, value) => page.locator('fieldset select').nth(i).selectOption(value)
const answerNumber = async (label, value) => {
  const fs = page.locator('fieldset').filter({ has: page.getByText(label, { exact: false }) })
  await fs.locator('input[type=number]').fill(String(value))
}
const answerBool = async (label, yes) => {
  const fs = page.locator('fieldset').filter({ has: page.getByText(label, { exact: false }) })
  await fs.locator(`.yesno button:text-is("${yes ? 'Yes' : 'No'}")`).click()
}

assert.match(await legend(0), /income year/i)

// A Korean backpacker whose employer never registered, so 30 per cent was withheld
// on 30,000 dollars. The whole point of the tool is that this comes back.
await answerSelect(0, '2025-26')
await answerSelect(1, 'KR')
// Typed digit by digit: the form must not be rebuilt under the cursor.
const days = page.locator('fieldset').filter({ has: page.getByText('How many days') }).locator('input')
await days.click()
await days.pressSequentially('200')
assert.equal(await days.inputValue(), '200')
assert.ok(await days.evaluate(el => el === document.activeElement), 'focus lost while typing')
await answerBool('keep a home', true)
await answerBool('resident for tax purposes', false)
await answerBool('tax file number', true)
await answerNumber('total gross income', 30000)
await answerNumber('tax was withheld', 9000)
await answerNumber('work related deductions', 0)

await page.waitForSelector('#result:not([hidden])')
const figures = await page.locator('#figures').innerText()
assert.match(figures, /Estimated refund/, figures)
assert.match(figures, /\$4,500/, figures)

// Sources stay hidden until the estimate is explicitly acknowledged.
assert.ok(await page.locator('#worksheet').isHidden(), 'sources should be gated behind the confirmation')
await page.locator('#confirm').check()
await page.waitForSelector('#worksheet:not([hidden])')
assert.ok((await page.locator('#sources li').count()) >= 2, 'every figure needs a citation')

// The acknowledgment belongs to one estimate. Changing an answer lapses it.
await answerNumber('tax was withheld', 9500)
assert.ok(await page.locator('#worksheet').isHidden(), 'confirmation must lapse when figures change')
await answerNumber('tax was withheld', 9000)
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

// Dark mode: the page must follow the system scheme, the explicit choice must beat
// the system in both directions, and the native select popup must be painted for the
// scheme in use (color-scheme), or option text disappears into it.
await page.emulateMedia({ colorScheme: 'dark' })
const scheme = () => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)
const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
const lum = c => c.match(/\d+/g).slice(0, 3).reduce((a, b) => a + Number(b), 0)
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
await answerSelect(1, 'GB')
await answerBool('resident for tax purposes', true)
await answerNumber('months of the year', 12)
await answerBool('Medicare Entitlement Statement', false)
await page.waitForSelector('#comparison:not([hidden])')
const sides = await page.locator('#comparison').innerText()
assert.match(sides, /working holiday maker/i, sides)
assert.match(sides, /resident national/i, sides)
assert.equal(await page.locator('#comparison tr.total').count(), 1, 'exactly one side applies')

// The super calculator is a separate tool behind the same disclaimer gate.
await page.locator('.tools button[data-tool=dasp]').click()
await answerNumber('super is in your fund', 6000)
await answerBool('ever held a working holiday visa', true)
await answerNumber('tax free component', 0)
await answerNumber('untaxed element', 0)
await answerBool('expired or been cancelled', true)
await answerBool('left Australia', true)
// The second limb of the rate test is unanswered, so no figure may show yet.
assert.ok(await page.locator('#result').isHidden(), 'a blank answer must not be read as a No')
await answerBool('paid in while you held', true)
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

assert.deepEqual(errors, [], 'the page logged errors')
await browser.close()
server.close()
console.log(`e2e ok${shot ? ` (screenshot: ${shot})` : ''}`)
