/**
 * Hostinger ve diğer PaaS ortamları için production başlatıcı.
 * PORT ve HOSTNAME env değişkenlerini okur (Hostinger dinamik port atar).
 */
const { spawn } = require("child_process");
const path = require("path");

const port = process.env.PORT || "3000";
const host = process.env.HOSTNAME || "0.0.0.0";
const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "start", "-p", port, "-H", host], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[start] next sonlandı (sinyal: ${signal})`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error("[start] next başlatılamadı:", err);
  process.exit(1);
});
