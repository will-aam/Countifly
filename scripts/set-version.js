// scripts/set-version.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔹 [Countifly] Iniciando cálculo de versão...");

try {
  // 1. Tenta recuperar o histórico.
  // Estratégia A: Unshallow (Padrão)
  try {
    console.log("   Tentando recuperar histórico completo (unshallow)...");
    execSync("git fetch --unshallow", { stdio: "ignore" });
  } catch (e) {
    // Estratégia B: Fetch explícito com profundidade (Fallback para Vercel)
    try {
      console.log(
        "   ⚠️ Unshallow falhou. Tentando fetch profundo (depth=10000)..."
      );
      // Tenta buscar os últimos 10 mil commits da branch atual
      execSync("git fetch --depth=10000", { stdio: "ignore" });
    } catch (ex) {
      console.warn("   ⚠️ Não foi possível recuperar o histórico Git remoto.");
    }
  }

  // 2. Conta os commits
  // Adicionamos '|| echo 0' para garantir que não quebre se o git falhar totalmente
  const output = execSync("git rev-list --count HEAD || echo 0")
    .toString()
    .trim();
  const commitCount = parseInt(output, 10);

  if (commitCount === 0) {
    throw new Error("Contagem de commits retornou 0");
  }

  // 3. Aplica a lógica Countifly: v1.{minor}.{patch}
  const major = 1;
  const minor = Math.floor(commitCount / 100);
  const patch = commitCount % 100;

  const appVersion = `v${major}.${minor}.${patch}`;
  console.log(
    `   🚀 Versão calculada: ${appVersion} (Commits: ${commitCount})`
  );

  // 4. Salva em um arquivo estático
  const versionData = { version: appVersion, commitCount };
  const outputPath = path.join(process.cwd(), "version.json");

  fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));
  console.log("   💾 Arquivo 'version.json' gerado com sucesso.");
} catch (error) {
  console.error(
    "   ❌ Erro ao calcular versão (Usando Fallback):",
    error.message
  );

  // Fallback seguro para v1.0.0 se tudo falhar
  const fallback = { version: "v1.0.0", commitCount: 0 };
  fs.writeFileSync("version.json", JSON.stringify(fallback));
}
