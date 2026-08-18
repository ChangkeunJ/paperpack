// Assembles the static site for deployment: the app at the root, dist and the pack
// data beside it. Usage: node scripts/bundle.mjs   (writes ./site)
import { rmSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs'

rmSync('site', { recursive: true, force: true })
mkdirSync('site')
cpSync('dist', 'site/dist', { recursive: true })
cpSync('packs/au-whm-tax/i18n', 'site/packs/au-whm-tax/i18n', { recursive: true })
cpSync('packs/au-whm-tax/rules', 'site/packs/au-whm-tax/rules', { recursive: true })
writeFileSync('site/index.html', readFileSync('web/index.html', 'utf8').replaceAll("'../", "'./"))
console.log('site/ ready')
