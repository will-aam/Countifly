// scripts/set-version.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔹 [Countifly] Gerando versão estática...");

try {
  // 1. Conta os commits atuais no histórico local
  const output = execSync("git rev-list --count HEAD").toString().trim();
  let commitCount = parseInt(output, 10);

  if (isNaN(commitCount)) {
    commitCount = 0;
  }

  // Opcional: Adiciona +1 para contar o commit que estamos prestes a fazer
  // Isso garante que a versão gerada já contemple o estado atual
  commitCount += 1;

  // 2. Aplica a lógica v1.{minor}.{patch}
  const major = 1;
  const minor = Math.floor(commitCount / 100);
  const patch = commitCount % 100;

  const appVersion = `v${major}.${minor}.${patch}`;

  // 3. Salva o arquivo
  const versionData = {
    version: appVersion,
    commitCount,
    buildDate: new Date().toISOString(),
  };

  const outputPath = path.join(process.cwd(), "version.json");
  fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));

  console.log(`✅ Versão ${appVersion} gerada e salva em version.json`);
} catch (error) {
  console.error("❌ Erro ao gerar versão local:", error.message);
  // Não quebra o processo, mas avisa
}
