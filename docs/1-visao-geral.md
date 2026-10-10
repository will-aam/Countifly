O Countifly é um Progressive Web Application (PWA) para contagem de inventário — um sistema full-stack construído com Next.js 14 que capacita equipes a contar, rastrear e relatar o estoque do armazém usando leitura de código de barras, importação de CSV e sessões colaborativas em tempo real. Projetado para uso em campo com foco em dispositivos móveis (mobile-first), ele funciona como um aplicativo instalável em telefones e tablets, ao mesmo tempo que oferece uma rica experiência em desktops com um sistema responsivo de navegação lateral. Atualmente na versão v1.4.16, o Countifly é voltado para profissionais de inventário falantes de português do Brasil que precisam de uma contagem de estoque confiável com resiliência offline.
O aplicativo segue um modelo de controle de acesso baseado em módulos, onde cada modo de contagem (Importação, Contagem Livre, Sessões em Equipe, Multiemprasa) pode ser ativado ou desativado de forma independente por um administrador para cada usuário. O painel principal reflete visualmente esse controle — os cartões dos módulos bloqueados aparecem desfocados com um ícone de cadeado, enquanto os módulos acessíveis mostram dados em tempo real, como a contagem global do catálogo e o status das sessões em equipe ativas.

## [Arquitetura de Alto Nível](https://zread.ai/will-aam/Countifly#high-level-architecture)
O Countifly é uma aplicação monolítica Next.js que utiliza o padrão App Router com Server Components, rotas de API e interatividade no lado do cliente. A autenticação é tratada através de cookies JWT verificados na camada de middleware, enquanto a autorização (acesso aos módulos) é aplicada tanto no lado do servidor nas rotas de API quanto no lado do cliente através de um hook React dedicado. A camada de dados abrange dois mecanismos de armazenamento: PostgreSQL para dados persistentes no lado do servidor e IndexedDB para estado local offline-first (priorizando offline) com uma fila de sincronização em segundo plano.
O Service Worker ([app/sw.ts](https://zread.ai/will-aam/app/sw.ts#L17-L46)) utiliza o Serwist para fazer o pré-cache de ativos estáticos no momento da compilação e fornece uma estratégia de cache em tempo de execução com uma página de fallback offline. O middleware ([middleware.ts](https://zread.ai/will-aam/middleware.ts#L5-L46)) intercepta todas as rotas, exceto os caminhos públicos (/login, /api/auth, /participant, /api/session), e redireciona solicitações não autenticadas verificando o cookie authToken. O layout principal ([app/(main)/layout.tsx](https://zread.ai/will-aam/app/(main)/layout.tsx#L10-L53)) realiza uma verificação adicional no banco de dados do lado do servidor para confirmar o status `ativo` do usuário a cada solicitação.

```
/login
```

```
/api/auth
```

```
/participant
```

```
/api/session
```

```
authToken
```

```
ativo
```

## [Stack de Tecnologia em Resumo](https://zread.ai/will-aam/Countifly#tech-stack-at-a-glance)
```
idb
```

```
@zxing/library
```

```
jsonwebtoken
```

```
bcryptjs
```

```
@tanstack/react-table
```

```
next-themes
```

Fontes: [package.json](https://zread.ai/will-aam/package.json#L1-L78)

## [Modos Principais de Contagem](https://zread.ai/will-aam/Countifly#core-counting-modes)
O Countifly fornece três fluxos de trabalho principais de contagem de inventário, cada um restrito por controle de acesso em nível de módulo. Os administradores podem conceder ou revogar cada módulo por usuário através do painel de administração.

### [Contagem Livre](https://zread.ai/will-aam/Countifly#free-count-contagem-livre)
O modo de Contagem Livre permite que os usuários leiam códigos de barras ou insiram códigos de produtos manualmente em relação a um catálogo global. É o modo mais flexível — ideal para verificações rápidas ou auditorias completas de armazém, onde os itens são contados um por vez. Os produtos podem ser registrados como temporários (criados automaticamente na primeira leitura) ou permanentes (pré-carregados no catálogo). Cada contagem é salva com contexto de localização ("Loja" ou "Estoque"), quantidade e carimbos de data/hora (timestamps).
Esse modo é mapeado para o booleano `modulo_livre` no modelo `Usuario` em [prisma/schema.prisma](https://zread.ai/will-aam/prisma/schema.prisma#L15). A página correspondente no frontend fica em `app/(main)/audit/`.

```
modulo_livre
```

```
Usuario
```

```
app/(main)/audit/
```

### [Contagem por Importação de CSV](https://zread.ai/will-aam/Countifly#csv-import-counting)
O modo de Importação de CSV permite que os usuários façam upload de planilhas pré-formatadas contendo códigos de produtos e quantidades esperadas. O Countifly analisa essas planilhas usando PapaParse, valida a estrutura e exibe quaisquer erros de importação antes de confirmar. Este modo é projetado para cenários onde a lista de inventário esperada já existe em um ERP ou planilha — as equipes simplesmente caminham pelo armazém e contam com base na lista importada.
Esse modo é mapeado para o booleano `modulo_importacao` (ativado por padrão para novos usuários) em [prisma/schema.prisma](https://zread.ai/will-aam/prisma/schema.prisma#L14). O frontend fica em `app/(main)/count-import/`.

```
modulo_importacao
```

```
app/(main)/count-import/
```

### [Sessões Colaborativas em Equipe](https://zread.ai/will-aam/Countifly#team-collaborative-sessions)
O modo de Sessões em Equipe permite a contagem multiusuário em tempo real. Um anfitrião (host) cria uma sessão com um código de acesso e os participantes ingressam através da página dedicada aos participantes. Cada participante lê os itens de forma independente, e todas as movimentações são agregadas sob a sessão. O sistema rastreia quem contou o quê, quando e onde — fornecendo total auditabilidade. As sessões progridem através dos estados: ABERTA → ENCERRANDO → FINALIZADA.

```
ABERTA
```

```
ENCERRANDO
```

```
FINALIZADA
```

Este é o modo mais rico arquiteturalmente, envolvendo os modelos `Sessao`, `Participante`, `Movimento` e `ProdutoSessao` definidos em [prisma/schema.prisma](https://zread.ai/will-aam/prisma/schema.prisma#L42-L105). O frontend abrange `app/(main)/team/` e `app/participant/`.

```
Sessao
```

```
Participante
```

```
Movimento
```

```
ProdutoSessao
```

```
app/(main)/team/
```

```
app/participant/
```

O Countifly segue as convenções do Next.js App Router com uma separação clara entre rotas, componentes, hooks e configuração. O diretório `app/` contém tanto as páginas quanto as rotas de API, enquanto `components/` é organizado por funcionalidade de domínio em vez de preocupação técnica.

```
app/
```

```
components/
```

```
Countifly/ ├── app/ │ ├── (main)/ # Authenticated main layout group │ │ ├── admin/ # Admin panel (user management) │ │ ├── audit/ # Free Count (Audit Mode) pages │ │ ├── count-import/ # CSV Import workflow pages │ │ ├── history/ # Count history & reports │ │ ├── inventory/ # Inventory management │ │ ├── settings-user/ # User settings & preferences │ │ ├── team/ # Team session management │ │ ├── layout.tsx # Main authenticated layout │ │ └── page.tsx # Dashboard home │ ├── api/ # Backend API routes │ │ ├── auth/ # Login, logout, password change │ │ ├── companies/ # Multi-company CRUD │ │ ├── dashboard/ # Dashboard data endpoints │ │ ├── inventory/ # Inventory CRUD & history │ │ ├── session/ # Single session operations │ │ ├── sessions/ # Session management endpoints │ │ ├── single/ # Individual counting session │ │ └── user/ # User profile & preferences │ ├── login/ # Public login page │ ├── participant/ # Public participant join page │ ├── sw.ts # Serwist service worker │ └── layout.tsx # Root layout (theme, toaster, PWA) ├── components/ # React components │ ├── features/ # Standalone feature components │ │ └── barcode-scanner.tsx # Camera barcode scanner │ ├── inventory/ # Inventory domain components │ │ ├── Audit/ # Free Count sub-components │ │ ├── Import/ # CSV Import sub-components │ │ ├── database-report/ # Database report views │ │ ├── history/ # History table components │ │ ├── report-builder/ # Custom report builder │ │ └── team/ # Team session components │ ├── shared/ # Cross-feature shared components │ │ ├── navigation/ # Nav, MobileBottomNav, CompanySelector │ │ └── ...modals & prompts │ ├── theme/ # Theme provider & toggle │ └── ui/ # Base UI primitives (shadcn/ui) ├── hooks/ # Custom React hooks │ ├── inventory/ # Domain-specific hooks │ └── useSyncQueue.ts # Offline sync queue hook ├── prisma/ # Database schema & migrations │ └── schema.prisma # 11 models, 3 enums ├── public/ # Static assets & PWA manifest └── middleware.ts # Route protection middleware
```

## [Estrutura do Projeto](https://zread.ai/will-aam/Countifly#project-structure)
```
Countifly/ ├── app/ │ ├── (main)/ # Authenticated main layout group │ │ ├── admin/ # Admin panel (user management) │ │ ├── audit/ # Free Count (Audit Mode) pages │ │ ├── count-import/ # CSV Import workflow pages │ │ ├── history/ # Count history & reports │ │ ├── inventory/ # Inventory management │ │ ├── settings-user/ # User settings & preferences │ │ ├── team/ # Team session management │ │ ├── layout.tsx # Main authenticated layout │ │ └── page.tsx # Dashboard home │ ├── api/ # Backend API routes │ │ ├── auth/ # Login, logout, password change │ │ ├── companies/ # Multi-company CRUD │ │ ├── dashboard/ # Dashboard data endpoints │ │ ├── inventory/ # Inventory CRUD & history │ │ ├── session/ # Single session operations │ │ ├── sessions/ # Session management endpoints │ │ ├── single/ # Individual counting session │ │ └── user/ # User profile & preferences │ ├── login/ # Public login page │ ├── participant/ # Public participant join page │ ├── sw.ts # Serwist service worker │ └── layout.tsx # Root layout (theme, toaster, PWA) ├── components/ # React components │ ├── features/ # Standalone feature components │ │ └── barcode-scanner.tsx # Camera barcode scanner │ ├── inventory/ # Inventory domain components │ │ ├── Audit/ # Free Count sub-components │ │ ├── Import/ # CSV Import sub-components │ │ ├── database-report/ # Database report views │ │ ├── history/ # History table components │ │ ├── report-builder/ # Custom report builder │ │ └── team/ # Team session components │ ├── shared/ # Cross-feature shared components │ │ ├── navigation/ # Nav, MobileBottomNav, CompanySelector │ │ └── ...modals & prompts │ ├── theme/ # Theme provider & toggle │ └── ui/ # Base UI primitives (shadcn/ui) ├── hooks/ # Custom React hooks │ ├── inventory/ # Domain-specific hooks │ └── useSyncQueue.ts # Offline sync queue hook ├── prisma/ # Database schema & migrations │ └── schema.prisma # 11 models, 3 enums ├── public/ # Static assets & PWA manifest └── middleware.ts # Route protection middleware
```

Fontes: [app/(main)/layout.tsx](https://zread.ai/will-aam/app/(main)/layout.tsx#L1-L53), [app/(main)/page.tsx](https://zread.ai/will-aam/app/(main)/page.tsx#L1-L311), [middleware.ts](https://zread.ai/will-aam/middleware.ts#L1-L46)

## [Principais Decisões de Design](https://zread.ai/will-aam/Countifly#key-design-decisions)
Arquitetura PWA mobile-first — O manifesto declara `display: standalone` com orientação retrato, e o layout raiz configura a tag meta viewport para evitar o redimensionamento pelo usuário (`userScalable: false`) para proporcionar uma sensação de aplicativo nativo. Um componente `InstallPrompt` ([components/shared/InstallPrompt.tsx](https://zread.ai/will-aam/components/shared/InstallPrompt.tsx)) exibe o prompt nativo de instalação quando disponível.

```
display: standalone
```

```
userScalable: false
```

```
InstallPrompt
```

Estratégia de dados offline-first — Em vez de depender exclusivamente do estado no lado do servidor, o Countifly grava os itens escaneados no IndexedDB imediatamente e, em seguida, os enfileira para sincronização com o servidor. O hook `useSyncQueue` faz verificações em intervalos configuráveis (padrão de 5 segundos) e processa os itens pendentes quando o contexto da sessão (ID da sessão, ID do participante, ID do usuário) está disponível.

```
useSyncQueue
```

Gating de recursos baseado em módulos — O controle de acesso não é um simples binário admin/usuário. Cada usuário possui quatro flags booleanas independentes (`modulo_importacao`, `modulo_livre`, `modulo_sala`, `modulo_empresa`) que determinam quais modos de contagem estão disponíveis. Isso é aplicado em três níveis: o hook `useUserModules` para a visibilidade da UI, as verificações do lado do servidor no layout principal e a autorização individual de rotas de API.

```
modulo_importacao
```

```
modulo_livre
```

```
modulo_sala
```

```
modulo_empresa
```

```
useUserModules
```

Renderização `force-dynamic` — Tanto o layout raiz quanto o layout principal exportam `dynamic = "force-dynamic"`, garantindo que toda solicitação de página atinja o servidor para verificações atualizadas de autenticação e permissão, em vez de servir páginas antigas em cache.

```
dynamic = "force-dynamic"
```

Esta Visão Geral introduziu o propósito, a arquitetura e os conceitos fundamentais do Countifly. Para começar a construir ou rodar o projeto localmente, prossiga para o guia de [Início Rápido](https://zread.ai/2-quick-start). Para uma compreensão mais profunda de como a base de código é organizada e como os dados fluem entre as camadas, explore a [Visão Geral da Arquitetura](https://zread.ai/3-architecture-overview). Para aprender sobre subsistemas específicos, você pode mergulhar diretamente em qualquer uma das análises profundas dos modos de contagem: [Contagem Livre (Modo de Auditoria)](https://zread.ai/4-free-count-audit-mode), [Contagem por Importação de CSV](https://zread.ai/5-csv-import-counting) ou [Sessões Colaborativas em Equipe](https://zread.ai/6-team-collaborative-sessions).
