/**
 * Git hook'larını repo'daki .githooks dizinine bağlar (core.hooksPath).
 * postinstall'dan çağrılır — böylece her `npm install` sonrası pre-push
 * doğrulama kapısı otomatik kurulu olur (yeni klonlarda da).
 *
 * Git repo değilse veya git yoksa sessizce atlanır (ör. Hostinger deploy).
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
if (!fs.existsSync(path.join(root, ".git")) && !fs.existsSync(path.join(root, ".githooks"))) {
  process.exit(0);
}

const res = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "ignore",
});
if (res.status === 0) {
  console.log("[hooks] pre-push doğrulama kapısı kuruldu (core.hooksPath=.githooks)");
}
// Git yoksa/başarısızsa deploy'u bozmamak için hata yutulur.
process.exit(0);
