#!/usr/bin/env node
// Single source of truth for repo rules. Run by git hooks, Claude Code hooks and CI.
// Usage: node scripts/check.mjs [file ...]   (no args: every tracked file)

import { readFileSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'

const AI_TELLS = [
  [/Co-Authored-By:\s*Claude/i, 'AI attribution trailer'],
  [/Generated with \[?Claude/i, 'AI generation footer'],
  [/\u{1F916}/u, 'robot emoji'],
  [/^#{1,6}\s*[\p{Extended_Pictographic}]/mu, 'emoji heading'],
  [/^\s*(\/\/|#|\*)\s*=={3,}/m, 'divider comment'],
  [/^\s*(\/\/|#)\s*Step \d+[:.]/m, 'numbered step comment'],
]

// Only applied to prose (markdown) and comment lines, where they are actually tells.
const CLICHES = /\b(seamlessly|effortlessly|delve into|robust and scalable|comprehensive solution|leverage the power|perfect for anyone|it'?s worth noting that|this ensures that)\b/i

const HANGUL = /[\u3131-\u318E\uAC00-\uD7A3]/
const REVENUE = /\b(affiliate|sponsor(ship)?|pricing|paid plan|pro tier|subscribe now|buy now)\b/i

const args = process.argv.slice(2)
const files = (args.length ? args : execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' }).split('\n'))
  .filter(f => f && !f.startsWith('.git/'))
  .filter(f => { try { return statSync(f).isFile() } catch { return false } })

const problems = []
const fail = (file, msg) => problems.push(`${file}: ${msg}`)

const isComment = line => /^\s*(\/\/|#|\*|<!--)/.test(line)

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const isMd = file.endsWith('.md')

  for (const [re, name] of AI_TELLS) {
    if (re.test(text)) fail(file, `AI tell: ${name}`)
  }

  for (const [i, line] of text.split('\n').entries()) {
    if ((isMd || isComment(line)) && CLICHES.test(line)) {
      fail(file, `line ${i + 1}: LLM cliche — ${line.trim().slice(0, 60)}`)
    }
    // Korean belongs only in translation files.
    if (HANGUL.test(line) && !/\/i18n\/ko\.json$/.test(file)) {
      fail(file, `line ${i + 1}: Korean text outside i18n/ko.json`)
    }
  }

  // Revenue paths inside the tax pack would make it a "tax agent service for reward"
  // under TASA 2009 s 50-5(1)(c). See docs/legal.md.
  if (file.startsWith('packs/au-whm-tax/') && REVENUE.test(text)) {
    fail(file, 'revenue-related wording inside the tax pack (TASA s 50-5)')
  }

  // Every regulatory constant carries its provenance, or it does not ship.
  if (/^packs\/.+\/rules\/.+\.json$/.test(file)) {
    let doc
    try { doc = JSON.parse(text) } catch (e) { fail(file, `invalid JSON: ${e.message}`); continue }
    for (const [key, rule] of Object.entries(doc.rules ?? {})) {
      for (const field of ['value', 'from', 'source', 'checked']) {
        if (rule?.[field] === undefined) fail(file, `rule "${key}" is missing "${field}"`)
      }
      if (rule?.source && !/^https?:\/\//.test(rule.source)) {
        fail(file, `rule "${key}" source is not a URL`)
      }
      for (const field of ['from', 'to', 'checked']) {
        if (rule?.[field] !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(rule[field])) {
          fail(file, `rule "${key}" ${field} is not YYYY-MM-DD`)
        }
      }
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'))
  console.error(`\n${problems.length} problem(s)`)
  process.exit(1)
}
console.log(`checked ${files.length} file(s), clean`)
