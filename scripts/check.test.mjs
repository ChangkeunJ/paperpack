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
  assert.ok(!run('g.ts', 'const label = "\u{D55C}\u{AD6D}\u{C5B4}"\n').ok)
  assert.ok(run('packs/au-whm-tax/i18n/ko.json', '{"hello":"\u{C548}\u{B155}"}\n').ok)
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
