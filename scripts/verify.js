/**
 * Deploy öncesi doğrulama kapısı.
 *
 * Hostinger her `git push`'ta kodu çekip build eder ve process'i restart eder.
 * Build kırıksa site 503 verir. Bu script, kırık bir build'in Hostinger'a
 * ulaşmasını ENGELLEMEK için push'tan önce (pre-push hook) çalışır:
 *
 *   1. tsc --noEmit   → tip hataları
 *   2. next build     → tüm sayfaların gerçekten derlendiğini kanıtlar (OOM korumalı)
 *
 * Her ikisi de geçmezse çıkış kodu 1 olur ve push engellenir.
 * `npm run verify` ile elle de çalıştırılabilir.
 *
 * Not: Alt süreçler doğrudan `node` ile çalıştırılır (shell YOK) — böylece
 * yol içinde boşluk olan Windows kurulumlarında ("C:\Program Files\nodejs")
 * tırnaklama sorunu yaşanmaz.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const tscBin = path.join(root, "node_modules", "typescript", "bin", "tsc");
const buildScript = path.join(root, "scripts", "build.js");

/** Bir adımı node ile çalıştırır; başarısızsa süreci kodla sonlandırır. */
function adim(baslik, args) {
  console.log(`\n\x1b[36m▶ ${baslik}\x1b[0m`);
  const res = spawnSync(process.execPath, args, { stdio: "inherit", cwd: root, env: process.env });
  if (res.status !== 0) {
    console.error(`\n\x1b[31m✖ ${baslik} BAŞARISIZ — push/deploy iptal edildi.\x1b[0m`);
    process.exit(res.status ?? 1);
  }
  console.log(`\x1b[32m✔ ${baslik} geçti\x1b[0m`);
}

if (!fs.existsSync(tscBin)) {
  console.error("\x1b[31m✖ typescript bulunamadı — `npm install` gerekli.\x1b[0m");
  process.exit(1);
}

console.log("\x1b[1m=== Deploy öncesi doğrulama ===\x1b[0m");
adim("1/2 TypeScript tip kontrolü", [tscBin, "--noEmit"]);
adim("2/2 Production build (tüm sayfalar)", [buildScript]);
console.log("\n\x1b[32m\x1b[1m✔ Tüm kontroller geçti — deploy güvenli.\x1b[0m");
