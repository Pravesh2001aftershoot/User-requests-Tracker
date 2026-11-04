#!/usr/bin/env node
// Turn the single-file Vite build into a claude.ai Artifact page.
//
// The Artifact publisher wraps the file in its own <!doctype>/<head>/<body>
// skeleton, so this keeps only what the page needs inside that skeleton:
// <title>, the viewport-fit-sides meta, the inlined <style> and <script>
// blocks, and <div id="root">. Output: dist-artifact/artifact.html.
import { readFileSync, writeFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const src = join(root, "dist-artifact", "index.html")
const out = join(root, "dist-artifact", "artifact.html")

const html = readFileSync(src, "utf8")

const title = html.match(/<title>[\s\S]*?<\/title>/i)?.[0]
if (!title) throw new Error("No <title> in the artifact build")

const styles = html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? []
// Inline scripts only; anything with src= would point at a file we don't ship.
const scripts = (html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? []).filter(
  (s) => !/^<script\b[^>]*\bsrc=/i.test(s),
)
if (!styles.length || !scripts.length) throw new Error("Expected inlined <style> and <script> blocks")

const page = [
  title,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  ...styles,
  '<div id="root"></div>',
  ...scripts,
].join("\n")

writeFileSync(out, page + "\n")
const kb = (statSync(out).size / 1024).toFixed(0)
console.log(`Wrote ${out} (${kb} KB): ${styles.length} style, ${scripts.length} script block(s)`)
