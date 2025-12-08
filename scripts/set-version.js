// scripts/set-version.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔹 [Countifly] Iniciando cálculo de versão...");

try {
  // 1. Tenta recuperar o histórico completo (necessário para contar commits)
  // O stdio: 'ignore' impede que erros de auth sujem o log se não tiver token
  try {
    console.log("   Tentando 'git fetch --unshallow'...");
    execSync("git fetch --unshallow", { stdio: "ignore" });
    console.log("   ✅ Histórico completo recuperado!");
  } catch (e) {
    console.warn(
      "   ⚠️ 'git fetch --unshallow' falhou ou o repositório já está completo."
    );
    console.warn(
      "      Se este projeto for privado na Vercel, isso é esperado sem um GITHUB_ACCESS_TOKEN."
    );
  }

  // 2. Conta os commits
  const commitCount = parseInt(
    execSync("git rev-list --count HEAD").toString().trim()
  );

  // 3. Aplica a lógica Countifly: v1.{minor}.{patch}
  // Ex: 184 commits -> 1.1.84
  const major = 1;
  const minor = Math.floor(commitCount / 100);
  const patch = commitCount % 100;

  const appVersion = `v${major}.${minor}.${patch}`;
  console.log(
    `   🚀 Versão calculada: ${appVersion} (Commits: ${commitCount})`
  );

  // 4. Salva em um arquivo estático para o Next.js ler
  const versionData = { version: appVersion, commitCount };
  const outputPath = path.join(process.cwd(), "version.json");

  fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));
  console.log("   💾 Arquivo 'version.json' gerado com sucesso.");
} catch (error) {
  console.error("   ❌ Erro fatal ao calcular versão:", error.message);
  // Fallback seguro
  const fallback = { version: "v1.0.0", commitCount: 0 };
  fs.writeFileSync("version.json", JSON.stringify(fallback));
  console.log("   ⚠️ Usando versão de fallback v1.0.0");
}
