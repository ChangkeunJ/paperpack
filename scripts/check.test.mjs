import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'

const checker = new URL('./check.mjs', import.meta.url).pathname
const root = mkdtempSync(join(tmpdir(), 'paperpack-check-'))

function run(relPath, contents) {
  const file = join(root, relPath)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, contents)
  const r = spawnSync(process.execPath, [checker, relPath], { cwd: root, encoding: 'utf8' })
  return { ok: r.status === 0, out: r.stderr }
}

// Built at runtime so this file itself carries no Korean, encoded or otherwise.
const KOREAN = String.fromCodePoint(0xd55c, 0xad6d, 0xc5b4)
const HELLO = String.fromCodePoint(0xc548, 0xb155)

const rule = extra => JSON.stringify({
  rules: { rate: { value: 0.15, from: '2025-07-01', source: 'https://ato.gov.au/x', checked: '2026-08-18', ...extra } },
})

test('clean file passes', () => {
  assert.ok(run('a.ts', 'export const x = 1\n').ok)
})

test('rejects AI attribution trailer', () => {
  const r = run('b.md', 'fix parser\n\nCo-Authored-' + 'By: Claude <noreply@anthropic.com>\n')
  assert.ok(!r.ok)
  assert.match(r.out, /AI attribution trailer/)
})

test('rejects emoji heading and divider comments', () => {
  assert.ok(!run('c.md', '## \u{1F680} Features\n').ok)
  assert.ok(!run('d.ts', '// ===== SECTION =====\n').ok)
})

test('rejects LLM cliches in prose but not in code identifiers', () => {
  assert.ok(!run('e.md', 'It seamlessly handles everything.\n').ok)
  assert.ok(run('f.ts', 'const seamlesslyNamedVar = 1\n').ok)
})

test('rejects Korean outside i18n/ko.json', () => {
  assert.ok(!run('g.ts', `const label = "${KOREAN}"\n`).ok)
  assert.ok(run('packs/au-whm-tax/i18n/ko.json', `{"hello":"${HELLO}"}\n`).ok)
})

test('rejects revenue wording inside the tax pack only', () => {
  assert.ok(!run('packs/au-whm-tax/page.ts', 'const s = "see pricing"\n').ok)
  assert.ok(run('web/page.ts', 'const s = "see pricing"\n').ok)
})

test('regulatory rules must carry provenance', () => {
  assert.ok(run('packs/au-whm-tax/rules/tax.json', rule()).ok)
  for (const missing of ['value', 'from', 'source', 'checked']) {
    const r = run('packs/au-whm-tax/rules/tax.json', rule({ [missing]: undefined }))
    assert.ok(!r.ok, `should reject missing ${missing}`)
    assert.match(r.out, new RegExp(`missing "${missing}"`))
  }
})

test('rejects malformed dates and non-URL sources', () => {
  assert.ok(!run('packs/au-whm-tax/rules/tax.json', rule({ from: '1 July 2025' })).ok)
  assert.ok(!run('packs/au-whm-tax/rules/tax.json', rule({ source: 'ATO website' })).ok)
})

test('binary files are skipped rather than decoded as text', () => {
  // A PNG decoded as UTF-8 yields bytes that look like all sorts of scripts.
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]),
    Buffer.from(KOREAN, 'utf8'),
  ])
  assert.ok(run('docs/shot.png', png).ok)
})

test('a NUL byte cannot excuse a source file from the rules', () => {
  const smuggled = Buffer.concat([Buffer.from([0]), Buffer.from('see pricing\n')])
  const r = run('packs/au-whm-tax/nul.ts', smuggled)
  assert.ok(!r.ok)
  assert.match(r.out, /NUL byte/)
})

test('path spelling does not change which rules apply', () => {
  assert.ok(!run('./packs/au-whm-tax/dot.ts', 'const s = "see pricing"\n').ok)
})

test('rejects the revenue forms the hard rule actually names', () => {
  for (const wording of ['a donation link', 'the paid tier', 'premium features', 'sponsored by']) {
    assert.ok(!run('packs/au-whm-tax/rev.ts', `const s = "${wording}"\n`).ok, wording)
  }
  const note = rule({ note: 'The fund may charge a fee on a paper application.' })
  assert.ok(run('packs/au-whm-tax/rules/tax.json', note).ok, 'a rule note may describe a government fee')
  assert.ok(!run('packs/au-whm-tax/rules/tax.json', rule({ note: 'donate here' })).ok)
})

test('regulatory numbers cannot hide outside the rules key', () => {
  const r = run('packs/au-whm-tax/rules/tax.json', '{"jurisdiction":"AU","bands":[{"rate":0.15}],"rules":{}}')
  assert.ok(!r.ok)
  assert.match(r.out, /top-level key "bands"/)
  assert.match(r.out, /nothing under "rules"/)
})

test('escaped Korean is still Korean', () => {
  assert.ok(!run('h.ts', 'const k = "\\u{D55C}\\u{AD6D}"\n').ok)
  const entities = [0xd55c, 0xad6d, 0xc5b4].map(n => `&#${n};`).join('')
  assert.ok(!run('i.html', `<b>${entities}</b>\n`).ok)
  assert.ok(run('j.ts', 'const re = new RegExp("[\\\\u3131-\\\\u318E]")\n').ok, 'an escaped backslash is not Korean')
})

test('a readme may name the Korean translation and nothing more', () => {
  assert.ok(run('README.ko.md', `# paperpack\n\n${HELLO} ${KOREAN}\n`).ok, 'the Korean readme is a translation file')
  assert.ok(run('README.md', `English | [${KOREAN}](README.ko.md)\n`).ok, 'the switcher may name the language')
  assert.ok(!run('README.md', `${HELLO}\n`).ok, 'anything beyond the name is still Korean')
  assert.ok(!run('docs/notes.md', `[${KOREAN}](README.ko.md)\n`).ok, 'the allowance is readmes only')
})

test('Korean in other encodings is still Korean', () => {
  const jamo = String.fromCodePoint(0x1112, 0x1161, 0x11ab)
  const halfwidth = String.fromCodePoint(0xffa1, 0xffb3, 0xffa9)
  assert.ok(!run('p.ts', `const a = "${jamo}"\n`).ok, 'conjoining jamo')
  assert.ok(!run('q.ts', `const a = "${halfwidth}"\n`).ok, 'halfwidth hangul')
})

test('the revenue screen follows the pack into dist', () => {
  assert.ok(!run('dist/packs/au-whm-tax/page.js', 'const s = "see pricing"\n').ok)
})

test('the Korean exemption is only the pack translation file', () => {
  assert.ok(!run('web/i18n/ko.json', `{"hello":"${HELLO}"}\n`).ok)
})

test('an emoji anywhere in a heading is still an emoji heading', () => {
  assert.ok(!run('k.md', '## Features \u{1F680}\n').ok)
})

test('extension case does not change which rules apply', () => {
  const r = run('packs/au-whm-tax/rules/tax.JSON', '{"bands":[{"rate":0.15}],"rules":{}}')
  assert.ok(!r.ok)
  assert.match(r.out, /top-level key "bands"/)
})

test('flag and keycap emoji count as emoji in headings', () => {
  assert.ok(!run('l.md', '# Trip to \u{1F1E6}\u{1F1FA}\n').ok)
  assert.ok(!run('m.md', '# Step 1\u{FE0F}\u{20E3} done\n').ok)
})

test('a NUL byte past the head is still a NUL byte', () => {
  const late = Buffer.concat([Buffer.alloc(9000, 0x61), Buffer.from([0])])
  assert.ok(!run('n.ts', late).ok)
})

test('fullwidth lookalikes do not slip past the revenue screen', () => {
  const fullwidth = [...'Donate'].map(c => String.fromCodePoint(c.codePointAt(0) + 0xfee0)).join('')
  assert.ok(!run('packs/au-whm-tax/fw.ts', `const s = "${fullwidth} here"\n`).ok)
})
