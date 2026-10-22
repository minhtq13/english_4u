// Converts the lesson files in ../lessons (window.LESSON objects) into app/data/course.json.
// The phase order comes from ../index.html (const PHASES = [...]).
// Usage: npm run lessons
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { fileURLToPath } from "node:url"

const web = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const root = path.join(web, "..")

const firstScript = file => fs.readFileSync(file, "utf8").match(/<script>([\s\S]*?)<\/script>/)[1]

const indexSrc = firstScript(path.join(root, "index.html"))
const PHASES = vm.runInNewContext(indexSrc.match(/const PHASES = (\[[\s\S]*?\n\]);/)[1])

const phases = PHASES.map(([name, lessons]) => ({
  name,
  lessons: lessons.map(([id, file, title, desc]) => {
    const ctx = { window: {} }
    vm.runInNewContext(firstScript(path.join(root, "lessons", file)), ctx)
    const L = ctx.window.LESSON
    return { id, title, desc, sub: L.sub, fullTitle: L.title, sections: L.sections }
  }),
}))

const out = path.join(web, "app", "data", "course.json")
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify({ phases }, null, 1) + "\n")
const count = phases.reduce((n, p) => n + p.lessons.length, 0)
console.log(`Wrote ${path.relative(web, out)} — ${count} lessons`)
