Coloque o Countifly para rodar na sua máquina local em menos de dez minutos. Este guia acompanha você por todos os pré-requisitos, etapas de configuração e verificação da primeira execução — de um terminal vazio a um aplicativo de contagem de inventário totalmente funcional.

## Pré-requisitos
Antes de começar, certifique-se de que seu ambiente de desenvolvimento inclui as ferramentas das quais o Countifly depende. O aplicativo é construído em Next.js 14 com React 18, usa o Prisma 6 como sua camada ORM comunicando-se com o PostgreSQL e aproveita o pnpm como seu gerenciador de pacotes. A tabela abaixo resume tudo o que você precisa.

O `package.json` declara a árvore de dependências completa. Os itens essenciais em tempo de execução incluem `@prisma/client`, `bcryptjs` para hash de senhas, `jsonwebtoken` para autenticação JWT, `@zxing/library` para leitura de código de barras, `idb` para acesso ao IndexedDB no cliente e `serwist` para a camada de service worker do PWA.

## Passo 1 — Clonar e Instalar
Comece clonando o repositório e instalando as dependências. O Countifly usa o pnpm exclusivamente — a configuração do workspace em `pnpm-workspace.yaml` marca pacotes nativos como `@prisma/client`, `sharp` e `bcrypt` como as únicas dependências que requerem compilação.

```bash
git clone https://github.com/will-aam/Countifly.git
cd Countifly
# Instalar todas as dependências
pnpm install
```

Após a instalação, o diretório `node_modules` conterá todas as dependências de produção e desenvolvimento. Preste atenção a quaisquer avisos de compilação do `bcrypt` — é a única dependência nativa intencionalmente construída.

## Passo 2 — Configurar Variáveis de Ambiente
O Countifly requer duas variáveis de ambiente para funcionar. Crie um arquivo `.env` na raiz do projeto com sua string de conexão do PostgreSQL e uma chave secreta para assinatura do token JWT.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME"
JWT_SECRET="sua-string-aleatoria-segura-pelo-menos-32-caracteres"
```

A `DATABASE_URL` é consumida pela configuração de datasource do Prisma em `prisma/schema.prisma`, que declara explicitamente `provider = "postgresql"`. O `JWT_SECRET` é referenciado durante a autenticação na rota de login em `app/api/auth/route.ts` — sem ela, o servidor retorna um erro de configuração 500 em cada tentativa de login.

## Passo 3 — Inicializar o Banco de Dados
O Countifly vem com duas estratégias de inicialização de banco de dados. Você pode usar o schema push do Prisma (recomendado para novas configurações) ou aplicar a base SQL bruta diretamente. O esquema do banco de dados define dez modelos interconectados abrangendo usuários, empresas, sessões de inventário, registros de contagem, códigos de barras e muito mais.

```bash
# Opção A: Prisma schema push (recomendado)
pnpm db:init
# Opção B: Aplicar a base SQL bruta diretamente
psql -U seu_usuario -d seu_banco -f baseline.sql
```

O script `db:init` definido no `package.json` executa `prisma db push` contra o esquema em `prisma/schema.prisma`. Após a criação do esquema, gere o cliente do Prisma:

```bash
# Gerar o Prisma Client (também é executado automaticamente durante o build)
npx prisma generate
```

O script `build` no `package.json` encadeia o `prisma generate` antes do `next build`, então o cliente está sempre atualizado em produção. Para desenvolvimento, você só precisa executá-lo uma vez manualmente após a inicialização do banco de dados.

## Passo 4 — Executar o Servidor de Desenvolvimento
Com o banco de dados pronto e o ambiente configurado, inicie o servidor de desenvolvimento:

```bash
pnpm dev
```

Isso executa `next dev`, iniciando o servidor de desenvolvimento do Next.js (tipicamente em http://localhost:3000). Abra essa URL no seu navegador, e você será recebido pela página de login — o Countifly aplica autenticação em todas as rotas, exceto um conjunto público definido.

## Passo 5 — Criar o Seu Primeiro Usuário
Na primeira inicialização, nenhum usuário existe no banco de dados. Você precisa semear pelo menos um usuário administrador para acessar o sistema. Conecte-se à sua instância PostgreSQL e insira um usuário diretamente. A senha deve ser hacheada com bcrypt — o Countifly usa `bcryptjs` com o padrão de 10 rodadas de salt.

```sql
-- Exemplo: Inserir um usuário administrador (substitua o hash pela sua senha hacheada com bcrypt)
INSERT INTO usuarios (email, senha_hash, display_name, tipo, ativo) VALUES (
  'admin@example.com',
  '$2a$10$SEU_HASH_BCRYPT_AQUI',
  'Admin User',
  'ADMIN',
  true
);
```

Você pode gerar um hash bcrypt rapidamente com o Node.js:

```bash
node -e "const b = require('bcryptjs'); console.log(b.hashSync('sua-senha', 10));"
```

## Passo 6 — Verificar se Tudo Funciona
Navegue até http://localhost:3000 e faça login com suas credenciais recém-criadas. Após a autenticação bem-sucedida, o sistema emite um token JWT armazenado como um cookie `httpOnly` chamado `authToken` com validade de 24 horas. O middleware em `middleware.ts` verifica esse cookie em cada solicitação e redireciona usuários não autenticados para `/login`.

O diagrama a seguir mostra a arquitetura de alto nível que você acabou de implantar. Entender esse fluxo o ajudará a navegar na base de código conforme você começa a personalizar o Countifly.
O aplicativo segue uma separação clara de camadas: a camada de cliente renderiza a UI com os componentes `shadcn/ui`, lida com a leitura de códigos de barras e mantém um armazenamento offline do IndexedDB para resiliência. A camada de servidor usa o Next.js App Router com proteção de rota baseada em middleware. A camada de dados se conecta por meio do Prisma ao PostgreSQL. A linha tracejada do IndexedDB para a API representa o mecanismo de fila de sincronização que reconcilia as alterações offline quando a conectividade é restaurada.

Aqui está uma visualização simplificada do layout do diretório focada nas áreas mais relevantes durante a configuração inicial:

```text
Countifly/
├── app/                  # Next.js App Router
│   ├── (main)/           # Rotas de aplicativo autenticadas
│   │   ├── admin/        # Painel de administração
│   │   ├── audit/        # Contagem livre (modo auditoria)
│   │   ├── count-import/ # Contagem de importação CSV
│   │   ├── inventory/    # Gerenciamento de inventário
│   │   ├── team/         # Sessões colaborativas de equipe
│   │   └── page.tsx      # Dashboard principal
│   ├── api/              # Manipuladores de rota de API
│   │   ├── auth/         # Autenticação (login, logout)
│   │   ├── admin/        # Operações de administração
│   │   ├── companies/    # CRUD de empresa
│   │   ├── inventory/    # Operações de inventário
│   │   └── sessions/     # Gerenciamento de sessão
│   ├── login/            # Página de login (pública)
│   ├── participant/      # Página de participante (pública)
│   ├── layout.tsx        # Layout raiz com ThemeProvider
│   └── sw.ts             # Service worker do Serwist
├── components/
│   ├── features/         # Componentes específicos de funcionalidade
│   ├── inventory/        # Componentes de UI de inventário
│   ├── shared/           # Componentes compartilhados (AuthPage, Modals)
│   ├── theme/            # Provedor de tema e alternância
│   └── ui/               # Primitivas do shadcn/ui (28 componentes)
├── hooks/                # Hooks personalizados do React
├── lib/                  # Utilitários compartilhados (auth, prisma, api)
├── prisma/
│   ├── schema.prisma     # Esquema do banco de dados (10 modelos)
│   └── migrations/       # Histórico de migração do Prisma
├── public/               # Ativos estáticos e manifesto PWA
├── middleware.ts         # Middleware de proteção de rota
├── next.config.mjs       # Configuração do Next.js + Serwist
├── tailwind.config.ts    # Tema Tailwind + shadcn
└── package.json          # Scripts e dependências
```

A biblioteca de componentes é configurada via `components.json`, que configura o `shadcn/ui` com o estilo padrão, uma cor base neutra e variáveis CSS para temas. Todas as primitivas de interface do usuário ficam sob `components/ui/` — 28 componentes que variam de `alert-dialog.tsx` a `tooltip.tsx`, todos construídos sobre as primitivas do Radix UI.

## Referência das Principais Configurações
A tabela a seguir consolida os arquivos de configuração mais importantes que você pode precisar personalizar no início:

* `.env`: `DATABASE_URL`, `JWT_SECRET`
* `next.config.mjs`: `swSrc`, `swDest`, `maximumFileSizeToCacheInBytes`
* `tailwind.config.ts`: `darkMode: ["class"]`
* `middleware.ts`: `publicPaths` (`/login`, `/api/auth`, `/participant`, `/api/session`)
* `public/manifest.json`: `display: "standalone"`, `orientation: "portrait-primary"`
* `version.json`: `v1.4.16`

## Scripts NPM Disponíveis
Todos os scripts do projeto estão definidos no `package.json`:

* `pnpm dev`: `next dev`
* `pnpm build`: `prisma generate && next build`
* `pnpm start`: `next start`
* `pnpm db:init`: `prisma db push`
* `pnpm lint`: `next lint`
* `pnpm generate-version`: `node scripts/set-version.js`

## O Que Vem A Seguir
Agora que o Countifly está em execução, o melhor próximo passo depende do que você quer explorar:
- Para uma visão panorâmica de como os modos de contagem, autenticação e camadas de dados se conectam, leia a [Visão Geral da Arquitetura](https://zread.ai/3-architecture-overview).
- Para entender como os três modos de contagem de inventário funcionam (Contagem Livre, Importação CSV, Sessões de Equipe), comece com a [Contagem Livre (Modo Auditoria)](https://zread.ai/4-free-count-audit-mode).
- Para mergulhar no esquema de banco de dados por trás de tudo o que você acabou de configurar, consulte o [Design do Esquema do Banco de Dados](https://zread.ai/10-database-schema-design).
- Se você estiver interessado em como o leitor de código de barras funciona por baixo dos panos, pule para a [Engine do Leitor de Código de Barras](https://zread.ai/7-barcode-scanner-engine).
