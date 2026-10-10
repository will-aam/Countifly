Countifly é um sistema de gerenciamento de estoque full-stack construído como um Progressive Web App (PWA) no Next.js 14 App Router. Ele combina um servidor apoiado pelo PostgreSQL com uma camada offline IndexedDB nativa do navegador, permitindo a contagem de estoque baseada em código de barras em três modos operacionais — tudo isso enquanto funciona sem conectividade de rede. A versão atual é a v1.4.16 com mais de 416 commits de evolução em produção [Fontes: [version.json](https://zread.ai/will-aam/Countifly/version.json#L1-L5), [package.json](https://zread.ai/will-aam/Countifly/package.json#L1-L2)].

## Visão Geral da Arquitetura do Sistema
A aplicação segue uma arquitetura monolítica full-stack com uma camada de dados estratégica offline-first. Em vez de uma divisão tradicional cliente-servidor, o Countifly mantém dois níveis de persistência sincronizados: um banco de dados PostgreSQL para dados autoritativos e uma instância IndexedDB no cliente que atua como cache local, buffer de sincronização e mecanismo de persistência de estado. Esse padrão de banco de dados duplo é a pedra angular arquitetônica que permite que o PWA funcione em ambientes de armazém com conectividade não confiável.
O Middleware em [middleware.ts](https://zread.ai/will-aam/Countifly/middleware.ts#L1-L46) atua como a primeira linha de defesa, inspecionando cada solicitação recebida em busca de um cookie JWT (authToken) e redirecionando o tráfego não autenticado para /login. Caminhos públicos — /login, /api/auth, /participant, /api/session — estão isentos dessa verificação explicitamente. Ativos estáticos e partes internas do Next.js passam intocados. O middleware realiza apenas validação de verificação de presença; a verificação completa do token (assinatura, expiração, claims de emissor/audiência) acontece no lado do servidor via [getAuthPayload()](https://zread.ai/will-aam/Countifly/lib/auth.ts#L85-L107) ou [validateAuth()](https://zread.ai/will-aam/Countifly/lib/auth.ts#L109-L155) quando as rotas da API ou os componentes do servidor precisam da identidade do usuário autenticado.

```
authToken
```

```
/login
```

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
getAuthPayload()
```

```
validateAuth()
```

## Stack de Tecnologia
A stack é deliberadamente coesa, minimizando a complexidade arquitetônica enquanto maximiza a ergonomia do desenvolvedor e a confiabilidade de produção.

```
idb
```

O pipeline de build encadeia a geração do cliente Prisma antes da etapa de build do Next.js: "build": "prisma generate && next build" [Fonte: [package.json](https://zread.ai/will-aam/Countifly/package.json#L9-L10)]. O versionamento é automatizado através de um script em [scripts/set-version.js](https://zread.ai/will-aam/Countifly/scripts/set-version.js) que grava no [version.json](https://zread.ai/will-aam/Countifly/version.json), o qual a configuração do Next.js lê no momento do build e expõe como NEXT_PUBLIC_APP_VERSION [Fonte: [next.config.mjs](https://zread.ai/will-aam/Countifly/next.config.mjs#L10-L22)].

```
"build": "prisma generate && next build"
```

```
NEXT_PUBLIC_APP_VERSION
```

A base de código está organizada em cinco diretórios de nível superior seguindo as convenções do Next.js, com uma clara separação de preocupações entre apresentação, acesso a dados e infraestrutura.

```
countifly/
├── app/
│   ├── (main)/           # Grupo de rotas autenticadas
│   │   ├── admin/        # Painel do administrador (gestão de usuários)
│   │   ├── audit/        # Modo Contagem Livre
│   │   ├── count-import/ # Modo de Importação CSV
│   │   ├── history/      # Registros históricos de contagem
│   │   ├── inventory/    # Interface principal de estoque
│   │   ├── settings-user/# Preferências de usuário e empresas
│   │   ├── team/         # Gestão de sessão de equipe
│   │   ├── layout.tsx    # Layout autenticado (nav + barra inferior)
│   │   └── page.tsx      # Dashboard (renderizado no servidor)
│   ├── login/            # Página de login pública
│   ├── participant/      # Visão de participante público (sem auth)
│   └── api/              # Endpoints da API REST
│       ├── auth/         # Login, logout, troca de senha
│       ├── inventory/    # CRUD para contagens, histórico, importações
│       ├── sessions/     # Ciclo de vida da sessão de equipe
│       ├── session/      # Entrada na sessão (público)
│       ├── companies/    # CRUD multi-empresa
│       ├── user/         # Perfil de usuário, módulos, preferências
│       ├── admin/        # Operações do admin
│       └── dashboard/    # Endpoints de dados do dashboard
├── components/           # Componentes React (3 camadas)
│   ├── ui/               # Primitivas shadcn/ui (28 componentes)
│   ├── shared/           # Componentes cruzados (nav, modais)
│   ├── theme/            # Provedor e toggle de tema
│   └── inventory/        # Componentes específicos de funcionalidade
│       ├── Audit/        # UI de contagem livre
│       ├── Import/       # UI de importação CSV
│       ├── team/         # UI de colaboração em equipe
│       ├── report-builder/# Motor de geração de relatórios
│       └── database-report/# Componentes de relatório de banco de dados
├── hooks/                # Hooks personalizados do React
│   ├── useInventory.ts   # Hook maestro (orquestrador)
│   ├── useSyncQueue.ts   # Motor de sincronização em segundo plano
│   ├── useUserModules.ts # Acesso ao módulo de permissões
│   ├── useParticipantInventory.ts
│   └── inventory/        # Sub-hooks especializados
│       ├── useCatalog.ts # Dados do catálogo de produtos
│       ├── useScanner.ts # Controle do leitor de código de barras
│       ├── useCounts.ts  # Gerenciamento de estado de contagem
│       ├── useHistory.ts # Histórico de contagem
│       ├── useHistoryFilters.ts # Filtros da tabela de histórico
│       └── useHistoryColumns.ts # Colunas da tabela de histórico
├── lib/                  # Utilitários compartilhados e infraestrutura
│   ├── auth.ts           # Validação JWT, classes de erro
│   ├── auth-client.ts    # Ajudantes de autenticação no cliente
│   ├── db.ts             # Gerenciador IndexedDB (camada offline)
│   ├── prisma.ts         # Singleton do cliente Prisma
│   ├── types.ts          # Interfaces TypeScript
│   ├── api.ts            # Funções utilitárias da API
│   ├── rate-limit.ts     # Limitação de taxa
│   ├── auth-rate-limit.ts# Limites de taxa específicos de autenticação
│   ├── utils.ts          # Utilitários gerais (cn, etc.)
│   └── sessions/single-player.ts # Lógica de sessão de jogador único
├── prisma/               # Esquema de banco de dados e migrações
│   ├── schema.prisma     # 11 modelos, PostgreSQL
│   └── migrations/       # 9 arquivos de migração
└── public/               # Ativos estáticos e manifesto PWA
```

O grupo de rotas (main) em [app/(main)/layout.tsx](https://zread.ai/will-aam/Countifly/app/(main)/layout.tsx#L1-L53) impõe autenticação no nível do layout. Ele chama getAuthPayload() para extrair a identidade do usuário a partir do cookie JWT e, em seguida, executa uma verificação de banco de dados em tempo real via prisma.usuario.findUnique() para confirmar se o usuário ainda está ativo — o que significa que um usuário desativado é expulso imediatamente, mesmo que seu JWT não tenha expirado. Esse padrão de verificação dupla (middleware para roteamento + layout para status em tempo real) evita que sessões obsoletas persistam.

```
(main)
```

```
getAuthPayload()
```

```
prisma.usuario.findUnique()
```

## Modelo de Autenticação e Segurança
A autenticação usa um JWT armazenado em um cookie HTTP-only (authToken), emitido após login bem-sucedido em [/api/auth](https://zread.ai/will-aam/Countifly/app/api/auth/route.ts) e verificado usando HS256 com claims de emissor (countifly-system) e audiência (countifly-users) [Fonte: [[lib/auth.ts](https://zread.ai/will-aam/Countifly/lib/auth.ts#L14-L42)](https://zread.ai/will-aam/Countifly/lib/auth.ts#L85-L107)]. A camada de autenticação define uma hierarquia de erros estruturada — AppError (base), AuthError (401), ForbiddenError (403) — que fornece um mapeamento de status HTTP consistente em todas as rotas da API [Fonte: lib/auth.ts].

```
authToken
```

```
/api/auth
```

```
countifly-system
```

```
countifly-users
```

```
AppError
```

```
AuthError
```

```
ForbiddenError
```

Cabeçalhos de segurança são aplicados globalmente na configuração do Next.js: X-Content-Type-Options: nosniff, X-Frame-Options: DENY, e X-XSS-Protection: 1; mode=block [Fonte: [next.config.mjs](https://zread.ai/will-aam/Countifly/next.config.mjs#L61-L72)]. A limitação de taxa (rate limiting) é implementada na camada de autenticação via módulos dedicados [Fonte: [lib/rate-limit.ts](https://zread.ai/will-aam/Countifly/lib/rate-limit.ts), [lib/auth-rate-limit.ts](https://zread.ai/will-aam/Countifly/lib/auth-rate-limit.ts)].

```
X-Content-Type-Options: nosniff
```

```
X-Frame-Options: DENY
```

```
X-XSS-Protection: 1; mode=block
```

## Arquitetura de Banco de Dados Duplo
A decisão arquitetônica mais distinta é o modelo de persistência dupla — PostgreSQL como servidor de registro, IndexedDB como companheiro offline do cliente. O esquema IndexedDB, definido em [lib/db.ts](https://zread.ai/will-aam/Countifly/lib/db.ts#L1-L200), mantém quatro "object stores":

```
sync_queue
```

```
by-timestamp
```

```
by-user
```

```
products
```

```
by-code
```

```
barcodes
```

```
local_counts
```

```
by-product
```

```
by-user
```

A fila de sincronização implementa o padrão "carteiro silencioso": as leituras são gravadas no IndexedDB imediatamente para um feedback instantâneo da interface do usuário e, em seguida, um intervalo em segundo plano (padrão de 5 segundos) em [useSyncQueue](https://zread.ai/will-aam/Countifly/[hooks/useSyncQueue.ts](https://zread.ai/will-aam/Countifly/hooks/useSyncQueue.ts#L95-L125)#L1-L194) esvazia a fila postando lotes (POST) para /api/session/{id}/sync. No caso de HTTP 409 (sessão encerrada), o hook marca os itens como não sincronizados, interrompe o intervalo e exibe um toast de aviso ao participante informando que a sessão foi encerrada pelo gerente [Fonte: hooks/useSyncQueue.ts].

```
useSyncQueue
```

```
/api/session/{id}/sync
```

As contagens locais são isoladas por modo: ao salvar, o sistema limpa apenas as contagens do modo atual (auditoria ou importação), preservando os dados do outro modo, prevenindo a contaminação cruzada entre os fluxos de contagem [Fonte: [lib/db.ts](https://zread.ai/will-aam/Countifly/lib/db.ts#L224-L265)].

## Controle de Acesso Baseado em Módulos
Em vez do RBAC tradicional, o Countifly usa um modelo de licenciamento de módulos. Cada usuário tem quatro flags booleanas armazenadas no modelo Usuario: modulo_importacao, modulo_livre, modulo_sala e modulo_empresa [Fonte: [prisma/schema.prisma](https://zread.ai/will-aam/Countifly/prisma/schema.prisma#L8-L12)]. O hook [useUserModules](https://zread.ai/will-aam/Countifly/hooks/useUserModules.ts#L1-L71) busca essas flags em /api/user/me no momento da montagem e expõe os acessores hasModule() e isModuleLocked(). Os usuários administradores (tipo = ADMIN) ignoram todas as restrições de módulo. O componente Navigation em [components/shared/navigation/Navigation.tsx](https://zread.ai/will-aam/Countifly/components/shared/navigation/Navigation.tsx#L74-L356) renderiza condicionalmente ou bloqueia itens de menu com base nessas flags de módulo, exibindo um ícone de cadeado e um texto explicativo para recursos restritos.

```
Usuario
```

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

```
/api/user/me
```

```
hasModule()
```

```
isModuleLocked()
```

```
ADMIN
```

## Modos de Contagem de Estoque
O sistema suporta três fluxos de trabalho de contagem, cada um com fluxos de dados distintos:
Contagem Livre (Modo Auditoria) — Os usuários escaneiam códigos de barras em relação a um catálogo de produtos pré-carregado. O hook [useInventory](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L1-L200) orquestra os sub-hooks useCatalog, useScanner e useCounts. Quando um código de barras é escaneado, o sistema o resolve para um produto através do catálogo, atualiza o estado de contagem na memória e persiste isso no IndexedDB. Produtos ausentes podem ser adicionados manualmente como itens temporários.

```
useInventory
```

```
useCatalog
```

```
useScanner
```

```
useCounts
```

Contagem por Importação CSV — Os usuários carregam arquivos CSV via PapaParse, que populam a interface de contagem sem exigir um catálogo pré-carregado. Os produtos importados dessa maneira recebem tipo_cadastro = "IMPORTADO" e são isolados em seu modo do fluxo de auditoria.

```
tipo_cadastro = "IMPORTADO"
```

Sessões Colaborativas em Equipe — Um host (anfitrião) cria uma sessão com um código de acesso em /team. Os participantes ingressam via /participant usando esse código (sem necessidade de conta). As leituras de cada participante são armazenadas em buffer em sua fila de sincronização IndexedDB local e descarregadas periodicamente no servidor. O host pode visualizar os resultados agregados em tempo real e fechar a sessão, o que aciona respostas 409 para interromper todos os intervalos de sincronização dos participantes.

```
/team
```

```
/participant
```

## PWA e Service Worker
O Countifly é um Progressive Web App (PWA) totalmente instalável configurado através do [public/manifest.json](https://zread.ai/will-aam/Countifly/public/manifest.json#L1-L62) com display: standalone e orientação retrato (portrait). O service worker baseado no Serwist em [app/sw.ts](https://zread.ai/will-aam/Countifly/app/sw.ts#L1-L47) faz o pré-cache de todos os ativos gerados pelo build, habilita skipWaiting e clientsClaim para ativação imediata, e fornece um fallback de documento em /~offline para falhas de navegação. O service worker é embutido apenas em builds de produção via uma exportação condicional: process.env.NODE_ENV === "production" ? withSerwist(nextConfig) : nextConfig [Fonte: [next.config.mjs](https://zread.ai/will-aam/Countifly/next.config.mjs#L97-L100)].

```
display: standalone
```

```
skipWaiting
```

```
clientsClaim
```

```
/~offline
```

```
process.env.NODE_ENV === "production" ? withSerwist(nextConfig) : nextConfig
```

## Arquitetura de Hooks: O Padrão Maestro
A lógica no lado do cliente do sistema de estoque segue um padrão "Maestro + Especialistas". O hook [useInventory](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L1-L200) atua como orquestrador, compondo quatro sub-hooks especializados e gerenciando preocupações transversais (itens manuais, erros de CSV, itens ausentes, limpeza de dados). Cada especialista possui um único domínio:

```
useInventory
```

Esta decomposição garante que cada hook permaneça testável e coeso enquanto o Maestro lida com a lógica de união (glue) — seleção do contexto da empresa, detecção de itens ausentes e fluxo de dados entre hooks.

## Arquitetura de Componentes de UI
O sistema de componentes tem quatro camadas distintas. Na base, 28 primitivas shadcn/ui em [components/ui/](https://zread.ai/will-aam/Countifly/components/ui/) fornecem blocos de construção acessíveis e personalizáveis por tema construídos sobre o Radix UI. A camada compartilhada (shared) em [components/shared/](https://zread.ai/will-aam/Countifly/components/shared/) contém componentes usados em vários recursos como Navigaton, modais e a barra de navegação inferior mobile. A camada de tema envolve o next-themes para seguir o sistema (dark/light mode). Finalmente, a camada de recursos (feature layer) em [components/inventory/](https://zread.ai/will-aam/Countifly/components/inventory/) contém componentes específicos do modo de uso organizados pelo fluxo de trabalho de estoque.

```
next-themes
```

Toda a interface do usuário (UI) é responsiva, com uma abordagem mobile-first: a navegação no desktop colapsa em uma barra de navegação inferior ([MobileBottomNav](https://zread.ai/will-aam/Countifly/components/shared/MobileBottomNav.tsx)) e em um menu lateral em telas menores. Os temas CSS utilizam propriedades personalizadas HSL para alternância de tema em tempo de execução, sem necessidade de reconstrução [Fonte: [tailwind.config.ts](https://zread.ai/will-aam/Countifly/tailwind.config.ts#L1-L99)].

## Resumo do Fluxo de Dados
Essa arquitetura permite feedback do usuário com latência zero (as gravações vão primeiro para o IndexedDB) com consistência eventual no servidor (a sincronização ocorre em segundo plano). O tratamento de conflitos 409 garante a degradação elegante (graceful degradation) quando uma sessão é fechada enquanto os participantes ainda estão lendo códigos.

## Caminho de Leitura Recomendado
Para aprofundar sua compreensão sobre subsistemas específicos, siga esta progressão através do catálogo:
- Modos de Estoque: Comece por [Contagem Livre (Modo Auditoria)](https://zread.ai/4-free-count-audit-mode) para o fluxo de leitura primário, depois [Contagem por Importação CSV](https://zread.ai/5-csv-import-counting) para a rota de importação, e [Sessões Colaborativas em Equipe](https://zread.ai/6-team-collaborative-sessions) para o sistema de colaboração em tempo real.
- Sistemas Técnicos Principais: O [Motor do Leitor de Código de Barras](https://zread.ai/7-barcode-scanner-engine) aborda a integração com a câmera, seguido da [Camada IndexedDB Offline-First](https://zread.ai/8-offline-first-indexeddb-layer) para o padrão de banco de dados duplo, e [Mecanismo de Fila de Sincronização](https://zread.ai/9-sync-queue-mechanism) para a sincronização em segundo plano.
- Camada de Dados: Explore o [Design do Esquema do Banco de Dados](https://zread.ai/10-database-schema-design) para todos os relacionamentos de modelo do Prisma, [Estrutura das Rotas da API](https://zread.ai/11-api-route-structure) para os endpoints REST, e [Autenticação e Segurança](https://zread.ai/12-authentication-and-security) para a implementação do JWT.
- Transversal: [Controle de Acesso Baseado em Módulos](https://zread.ai/13-module-based-access-control) para o modelo de licenciamento, [Motor Construtor de Relatórios](https://zread.ai/14-report-builder-engine) para a exportação de dados, e [Hooks Personalizados do React](https://zread.ai/18-custom-react-hooks) para os detalhes do padrão Maestro.
[Contagem Livre (Modo Auditoria)](https://zread.ai/4-free-count-audit-mode)
[Contagem por Importação CSV](https://zread.ai/5-csv-import-counting)
[Sessões Colaborativas em Equipe](https://zread.ai/6-team-collaborative-sessions)
[Motor do Leitor de Código de Barras](https://zread.ai/7-barcode-scanner-engine)
[Camada IndexedDB Offline-First](https://zread.ai/8-offline-first-indexeddb-layer)
[Mecanismo de Fila de Sincronização](https://zread.ai/9-sync-queue-mechanism)
[Design do Esquema do Banco de Dados](https://zread.ai/10-database-schema-design)
[Estrutura das Rotas da API](https://zread.ai/11-api-route-structure)
[Autenticação e Segurança](https://zread.ai/12-authentication-and-security)
[Controle de Acesso Baseado em Módulos](https://zread.ai/13-module-based-access-control)
[Motor Construtor de Relatórios](https://zread.ai/14-report-builder-engine)
[Hooks Personalizados do React](https://zread.ai/18-custom-react-hooks)
