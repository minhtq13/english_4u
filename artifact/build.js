// Builds the artifact page from the local lessons.
// Usage: node artifact/build.js   → writes artifact/grammar-b2.html
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");

const firstScript = file => fs.readFileSync(file, "utf8").match(/<script>([\s\S]*?)<\/script>/)[1];

// Phase list comes from the local index.html (const PHASES = [...]).
const indexSrc = firstScript(path.join(root, "index.html"));
const PHASES = vm.runInNewContext(indexSrc.match(/const PHASES = (\[[\s\S]*?\n\]);/)[1]);

const phases = PHASES.map(([name, lessons]) => ({
  name,
  lessons: lessons.map(([id, file, title, desc]) => {
    const ctx = { window: {} };
    vm.runInNewContext(firstScript(path.join(root, "lessons", file)), ctx);
    return { id, title, desc, data: ctx.window.LESSON };
  }),
}));

const json = JSON.stringify({ phases }).replace(/<\//g, "<\\/");
const template = fs.readFileSync(path.join(__dirname, "template.html"), "utf8");
const out = path.join(__dirname, "grammar-b2.html");
fs.writeFileSync(out, template.replace("__COURSE__", () => json));
console.log(`Wrote ${path.relative(root, out)} — ${phases.reduce((n, p) => n + p.lessons.length, 0)} lessons, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
