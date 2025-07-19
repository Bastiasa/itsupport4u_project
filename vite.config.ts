import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import fs from 'fs'
import path from 'path'

const IGNORED_FILES = new Set([
  "webscrapping",
  "src",
  "scripts",
  "public",
  "others",
  "node_modules",
  "dist"
]);

function getHtmlEntryFiles(dir: string) {

  const entry: Record<string, string> = {}

  function walk(d: string) {
    fs.readdirSync(d).filter(f => !IGNORED_FILES.has(f)).forEach(file => {
      const fp = path.join(d, file)
      if (fs.statSync(fp).isDirectory()) walk(fp)
      else if (path.extname(fp) === '.html') {
        const name = path.relative(dir, fp).replace(/\.html$/, '')
        entry[name] = fp
      }
    })
  }
  walk(dir)
  return entry
}


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],

  build: {
    rollupOptions: {
      input: getHtmlEntryFiles("./")
    }
  }
})
