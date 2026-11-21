# 8. Estratégia e Roteiro de Distribuição: Desktop (.exe / Electron) e Mobile (Android / Capacitor)

> **Documento Arquitetural e Operacional**  
> **Status:** Planejamento e Arquitetura Definida (Pronto para Execução Futura)  
> **Escopo:** Geração de instalador desktop para Windows/Linux e aplicativo móvel para Android.

---

## 1. Decisão Arquitetural & Racional Técnico

Após avaliação entre as abordagens de mercado (**Electron**, **Tauri** e **Java** tradicional), definiu-se a seguinte estratégia combinada para o ecossistema Countifly:

* **Desktop (Windows `.exe` / Linux):** **Electron** (`electron` + `electron-builder`)
* **Mobile (Android `.apk` / Google Play):** **Capacitor** (`@capacitor/core` + `@capacitor/android`)

### Por que essa combinação vence as outras opções?

| Critério | Java (Tradicional) | Tauri v2 (Rust) | Electron + Capacitor (Escolhida) |
| :--- | :--- | :--- | :--- |
| **Linguagem / Stack** | Java / JVM externa | Rust + TypeScript | **100% TypeScript / Node.js** |
| **Curva de Aprendizado** | Alta (linguagem diferente) | Alta (Rust, ponte JNI/Kotlin) | **Zero (mesma base web do Countifly)** |
| **Reaproveitamento de Código** | 0% (reescrever tudo) | Parcial no mobile | **> 95% do código React e telas** |
| **Acesso a Hardware (USB/Impressoras)** | Depende de libs legadas | Complexo via Rust FFI | **Extenso ecossistema Node.js / NPM** |
| **Performance Real em Inventário** | Média | Alta (baixo uso de RAM) | **Alta (otimizado no React e IndexedDB)** |
| **Estabilidade no Android** | App separado | Recente no mobile | **Extremamente maduro e estável** |

> **Nota sobre Memória RAM:** Em computadores corporativos modernos (Windows 10/11 com 8 GB de RAM ou mais), o consumo de memória do Electron não impacta a operação. O desempenho de consultas e fluidez na bipagem é determinado pelo front-end (indexação no IndexedDB e renderização no React), que já foi otimizado no Countifly.

---

## 2. Visão de Arquitetura

```
                          ┌─────────────────────────────────────┐
                          │         COUNTIFLY CORE WEB          │
                          │   (Next.js 16 + React 19 + TS)      │
                          └──────────────────┬──────────────────┘
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
     ┌───────────────────────────────┐               ┌───────────────────────────────┐
     │        DESKTOP WINDOWS        │               │        MOBILE ANDROID         │
     │      (Electron Runtime)       │               │      (Capacitor Runtime)      │
     ├───────────────────────────────┤               ├───────────────────────────────┤
     │ • Janela Nativa sem abas      │               │ • WebView Nativa Android      │
     │ • Node.js integrado           │               │ • Acesso à Câmera (Barcode)   │
     │ • Leitores USB/Bluetooth HID  │               │ • Armazenamento sem expiração │
     │ • Cache local / Offline       │               │ • Empacotamento em APK / AAB │
     │ • Gerador: Countifly-Setup.exe│               │ • Publicação na Google Play   │
     └───────────────────────────────┘               └───────────────────────────────┘
```

---

## 3. Implementação Desktop com Electron (Windows `.exe`)

O Electron fornece uma casca nativa sobre o Chromium e o Node.js. Para o operador de inventário, o aplicativo abre em tela cheia, com ícone próprio na barra de tarefas e sem risco de fechamento acidental de abas.

### 3.1 Modelos de Execução Possíveis

1. **Modo Conectado com Cache Offline (Recomendado para início):**
   * A janela do Electron carrega a aplicação hospedada na nuvem ou na rede local.
   * A persistência offline e cache de assets continuam sendo garantidos pelo **IndexedDB** e pelo **Service Worker (Serwist)** que já operam no Countifly.
   * O Electron apenas fornece os privilégios nativos de janela, atalhos de teclado e integração com periféricos.

2. **Modo Standalone Totalmente Embutido:**
   * O Electron empacota o build standalone do Next.js e inicia um servidor Node.js interno em `localhost:PORTA_LOCAL`.
   * Permite instalação 100% independente de internet desde o primeiro uso.

### 3.2 Estrutura de Arquivos Recomendada

```
Countifly/
├── electron/
│   ├── main.ts              # Processo principal (gerenciamento da janela, IPC e menus)
│   ├── preload.ts           # Ponte de segurança (ContextBridge) entre Node e Web
│   └── updater.ts           # Lógica de atualização automática (electron-updater)
├── electron-builder.yml     # Configuração de build (.exe, ícones, instalador NSIS)
```

### 3.3 Pacotes Necessários

```bash
npm install -D electron electron-builder concurrently wait-on
```

### 3.4 Configuração do Instalador (`electron-builder.yml`)

```yaml
appId: com.countifly.app
productName: Countifly
directories:
  output: dist-electron
win:
  target:
    - target: nsis
      arch:
        - x64
  icon: public/icons/icon-512x512.png
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: Countifly Inventário
```

---

## 4. Implementação Mobile com Capacitor (Android `.apk`)

O Capacitor empacota a interface web diretamente em uma aplicação nativa Android Studio, sem exigir programação em Java ou Kotlin para as funções principais.

### 4.1 Benefícios do Capacitor no Android

* **Leitura com a Câmera:** Acesso de alto desempenho à câmera traseira para bipar códigos de barras e QR Codes utilizando `@capacitor-community/barcode-scanner` ou a biblioteca `@zxing/library` que o Countifly já possui.
* **Armazenamento Seguro:** Não sofre com a limpeza de cache que o navegador mobile do Android pode fazer após semanas sem uso.
* **Experiência Imersiva:** Modo Fullscreen, controle de vibração nativa (`@capacitor/haptics`) e bloqueio de suspensão de tela durante a contagem (`@capacitor-community/keep-awake`).

### 4.2 Pacotes Necessários

```bash
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
```

### 4.3 Inicialização do Projeto

```bash
npx cap init "Countifly" "com.countifly.app" --web-dir "out"
npx cap add android
```

---

## 5. Roteiro Passo a Passo de Execução Futura

Quando os ajustes das rotas e telas web estiverem 100% finalizados e homologados, siga esta ordem de execução:

### Fase 1: Desktop Windows (.exe)
1. Criar o diretório `electron/` com o arquivo de entrada `main.ts` e `preload.ts`.
2. Adicionar os scripts no `package.json`:
   * `"electron:dev": "concurrently \"next dev\" \"wait-on http://localhost:3000 && electron .\""`
   * `"electron:build": "next build && electron-builder --win"`
3. Testar a janela nativa no Windows com leitores de código de barras USB (modo teclado/HID).
4. Gerar o primeiro instalador `Countifly-Setup.exe` na pasta `dist-electron/`.
5. Disponibilizar o arquivo `.exe` para download na página `/downloads` da plataforma.

### Fase 2: Mobile Android (.apk)
1. Instalar o Capacitor e gerar a pasta nativa `android/`.
2. Configurar permissões de câmera e vibração no `AndroidManifest.xml`.
3. Testar no emulador Android e em dispositivo físico via USB debugging.
4. Gerar APK de teste assinado (Debug) para testes internos da equipe.
5. Gerar o pacote de produção `app-release.aab` e cadastrar na Google Play Console.

### Fase 3: Atualizações Automáticas (Auto-update)
* **Desktop:** Configurar o `electron-updater` apontando para o repositório GitHub Releases. Quando você publicar uma nova versão com tag `v1.x.x`, os computadores dos clientes baixam a atualização em segundo plano.
* **Android:** Atualizações distribuídas nativamente pela Google Play Store.

---

## 6. Resumo das Decisões

1. **Stack Unificada:** 100% TypeScript/Node.js em todo o ciclo de desenvolvimento.
2. **Sem necessidade de aprender Rust ou reescrever código em Java.**
3. **Manutenção Simplificada:** Qualquer correção de regra de negócio ou layout feita nas páginas de contagem reflete simultaneamente na Web, no Desktop e no Android.
