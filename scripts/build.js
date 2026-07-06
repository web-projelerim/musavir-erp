/**
 * Hostinger gibi düşük bellekli ortamlarda build OOM'unu önlemek için
 * NODE_OPTIONS ile heap limiti ayarlar (yerelde de güvenli).
 */
const { spawnSync } = require("child_process");
const path = require("path");

const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");

const env = {
  ...process.env,
  NODE_OPTIONS: [
    process.env.NODE_OPTIONS,
    "--max-old-space-size=2048",
  ]
    .filter(Boolean)
    .join(" "),
};

const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env,
});

process.exit(result.status ?? 1);
