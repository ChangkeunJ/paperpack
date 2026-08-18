#!/usr/bin/env node
// Single source of truth for repo rules. Run by git hooks, Claude Code hooks and CI.
// Usage: node scripts/check.mjs [file ...]   (no args: every tracked file)

import { readFileSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, relative, sep } from 'node:path'

const AI_TELLS = [
  [/Co-Authored-By:\s*Claude/i, 'AI attribution trailer'],
  [/Generated with \[?Claude/i, 'AI generation footer'],
  [/\u{1F916}/u, 'robot emoji'],
  [/^#{1,6}\s*[^\n]*(\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\u20E3)/mu, 'emoji heading'],
  [/^\s*(\/\/|#|\*)\s*=={3,}/m, 'divider comment'],
  [/^\s*(\/\/|#)\s*Step \d+[:.]/m, 'numbered step comment'],
]

// Only applied to prose (markdown) and comment lines, where they are actually tells.
const CLICHES = /\b(seamlessly|effortlessly|delve into|robust and scalable|comprehensive solution|leverage the power|perfect for anyone|it'?s worth noting that|this ensures that)\b/i

const HANGUL = new RegExp('[\\u1100-\\u11FF\\u3131-\\u318E\\uA960-\\uA97F\\uAC00-\\uD7A3\\uD7B0-\\uD7FF\\uFFA0-\\uFFDC]')
const KO_EXEMPT = /^(dist\/)?packs\/[^/]+\/i18n\/ko\.json$|^README\.ko\.md$/
// A readme language switcher may name the Korean translation in Korean, and that
// exact word is all it may say. Built from code points so this file passes itself.
const KOREAN_NAME = String.fromCodePoint(0xd55c, 0xad6d, 0xc5b4)
const README = /^README(\.[A-Za-z-]+)?\.md$/

// Korean smuggled in as escapes or entities is still Korean on screen.
const cp = h => { const n = parseInt(h, 16); return n <= 0x10ffff ? String.fromCodePoint(n) : '' }
const decodeEscapes = line => line
  .replace(/(?<!\\)\\u\{([0-9a-fA-F]{1,6})\}/g, (_, h) => cp(h))
  .replace(/(?<!\\)\\u([0-9a-fA-F]{4})/g, (_, h) => cp(h))
  .replace(/&#x([0-9a-fA-F]{1,6});/gi, (_, h) => cp(h))
  .replace(/&#(\d{1,7});/g, (_, d) => cp(Number(d).toString(16)))

// Money changing hands for the tool, in any form. Rule notes legitimately describe
// government and fund fees, so rules data is only screened for revenue channels;
// every other pack file also gets the broader wording list.
const REVENUE_CHANNELS = /\b(affiliate|sponsor\w*|patreon|ko-fi|donat\w*|paid (?:plan|tier)|pro tier|pricing|paywall)\b/i
const REVENUE_WORDING = /\b(subscribe|buy now|premium|tip jar|checkout|in-app purchase)\b/i

// Binary formats are skipped, but a NUL byte cannot excuse a source file from the
// rules: that is the one-byte switch that would turn every check off.
const TEXT = /\.(ts|mts|cts|js|mjs|cjs|json|md|html|css|svg|yml|yaml|txt|sh)$/i

const args = process.argv.slice(2)
// Paths are matched against rules, so './packs/x' and an absolute path must mean the
// same thing as 'packs/x'.
const normalise = f => relative(process.cwd(), resolve(f)).split(sep).join('/')
const files = (args.length ? args : execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' }).split('\n'))
  .filter(f => f)
  .map(normalise)
  .filter(f => f && !f.startsWith('.git/'))
  .filter(f => { try { return statSync(f).isFile() } catch { return false } })

const problems = []
const fail = (file, msg) => problems.push(`${file}: ${msg}`)

const isComment = line => /^\s*(\/\/|#|\*|<!--)/.test(line)

for (const file of files) {
  const buf = readFileSync(file)
  // A NUL byte in the head is the usual sign of a binary file. Decoding a PNG as
  // UTF-8 produces convincing nonsense, including things that look like Hangul.
  if (buf.includes(0)) {
    if (TEXT.test(file)) fail(file, 'NUL byte in a text file')
    continue
  }
  const text = buf.toString('utf8')
  const isMd = file.endsWith('.md')

  for (const [re, name] of AI_TELLS) {
    if (re.test(text)) fail(file, `AI tell: ${name}`)
  }

  for (const [i, line] of text.split('\n').entries()) {
    if ((isMd || isComment(line)) && CLICHES.test(line)) {
      fail(file, `line ${i + 1}: LLM cliche — ${line.trim().slice(0, 60)}`)
    }
    // Korean belongs only in translation files.
    // NFKC folds halfwidth Hangul back into the ranges above.
    const folded = decodeEscapes(line).normalize('NFKC')
    const decoded = README.test(file) ? folded.replaceAll(KOREAN_NAME, '') : folded
    if (HANGUL.test(decoded) && !KO_EXEMPT.test(file)) {
      fail(file, `line ${i + 1}: Korean text outside packs/*/i18n/ko.json`)
    }
  }

  // Revenue paths inside the tax pack would make it a "tax agent service for reward"
  // under TASA 2009 s 50-5(1)(c). See docs/legal.md.
  if (/^(dist\/)?packs\/au-whm-tax\//.test(file)) {
    const rulesData = /\/rules\/[^/]+\.json$/i.test(file)
    // NFKC folds fullwidth lookalikes back to ASCII. This screens against accident,
    // not against an adversary with commit access.
    const folded = text.normalize('NFKC')
    if (REVENUE_CHANNELS.test(folded) || (!rulesData && REVENUE_WORDING.test(folded))) {
      fail(file, 'revenue-related wording inside the tax pack (TASA s 50-5)')
    }
  }

  // Every regulatory constant carries its provenance, or it does not ship.
  if (/^packs\/.+\/rules\/.+\.json$/i.test(file)) {
    let doc
    try { doc = JSON.parse(text) } catch (e) { fail(file, `invalid JSON: ${e.message}`); continue }
    // A number parked outside "rules" would dodge the provenance fields below.
    for (const key of Object.keys(doc)) {
      if (key !== 'jurisdiction' && key !== 'rules') {
        fail(file, `top-level key "${key}" — regulatory data belongs under "rules"`)
      }
    }
    if (!doc.rules || typeof doc.rules !== 'object' || !Object.keys(doc.rules).length) {
      fail(file, 'a rules file with nothing under "rules"')
    }
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
