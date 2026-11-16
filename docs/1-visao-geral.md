## [Modos Principais de Contagem](Countifly#core-counting-modes)
O Countifly fornece três fluxos de trabalho principais de contagem de inventário, cada um restrito por controle de acesso em nível de módulo. Os administradores podem conceder ou revogar cada módulo por usuário através do painel de administração.

### [Contagem Livre](Countifly#free-count-contagem-livre)
O modo de Contagem Livre permite que os usuários leiam códigos de barras ou insiram códigos de produtos manualmente em relação a um catálogo global. É o modo mais flexível — ideal para verificações rápidas ou auditorias completas de armazém, onde os itens são contados um por vez. Os produtos podem ser registrados como temporários (criados automaticamente na primeira leitura) ou permanentes (pré-carregados no catálogo). Cada contagem é salva com contexto de localização ("Loja" ou "Estoque"), quantidade e carimbos de data/hora (timestamps).
Esse modo é mapeado para o booleano `modulo_livre` no modelo `Usuario` em [prisma/schema.prisma](prisma/schema.prisma#L15). A página correspondente no frontend fica em `app/(main)/audit/`.

```
modulo_livre
```

```
Usuario
```

```
app/(main)/audit/
```

### [Contagem por Importação de CSV](Countifly#csv-import-counting)
O modo de Importação de CSV permite que os usuários façam upload de planilhas pré-formatadas contendo códigos de produtos e quantidades esperadas. O Countifly analisa essas planilhas usando PapaParse, valida a estrutura e exibe quaisquer erros de importação antes de confirmar. Este modo é projetado para cenários onde a lista de inventário esperada já existe em um ERP ou planilha — as equipes simplesmente caminham pelo armazém e contam com base na lista importada.
Esse modo é mapeado para o booleano `modulo_importacao` (ativado por padrão para novos usuários) em [prisma/schema.prisma](prisma/schema.prisma#L14). O frontend fica em `app/(main)/count-import/`.

```
modulo_importacao
```

```
app/(main)/count-import/
```

### [Sessões Colaborativas em Equipe](Countifly#team-collaborative-sessions)
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

Este é o modo mais rico arquiteturalmente, envolvendo os modelos `Sessao`, `Participante`, `Movimento` e `ProdutoSessao` definidos em [prisma/schema.prisma](prisma/schema.prisma#L42-L105). O frontend abrange `app/(main)/team/` e `app/participant/`.

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

## [Estrutura do Projeto](Countifly#project-structure)
```
Countifly/ ├── app/ │ ├── (main)/ # Authenticated main layout group │ │ ├── admin/ # Admin panel (user management) │ │ ├── audit/ # Free Count (Audit Mode) pages │ │ ├── count-import/ # CSV Import workflow pages │ │ ├── history/ # Count history & reports │ │ ├── inventory/ # Inventory management │ │ ├── settings-user/ # User settings & preferences │ │ ├── team/ # Team session management │ │ ├── layout.tsx # Main authenticated layout │ │ └── page.tsx # Dashboard home │ ├── api/ # Backend API routes │ │ ├── auth/ # Login, logout, password change │ │ ├── companies/ # Multi-company CRUD │ │ ├── dashboard/ # Dashboard data endpoints │ │ ├── inventory/ # Inventory CRUD & history │ │ ├── session/ # Single session operations │ │ ├── sessions/ # Session management endpoints │ │ ├── single/ # Individual counting session │ │ └── user/ # User profile & preferences │ ├── login/ # Public login page │ ├── participant/ # Public participant join page │ ├── sw.ts # Serwist service worker │ └── layout.tsx # Root layout (theme, toaster, PWA) ├── components/ # React components │ ├── features/ # Standalone feature components │ │ └── barcode-scanner.tsx # Camera barcode scanner │ ├── inventory/ # Inventory domain components │ │ ├── Audit/ # Free Count sub-components │ │ ├── Import/ # CSV Import sub-components │ │ ├── database-report/ # Database report views │ │ ├── history/ # History table components │ │ ├── report-builder/ # Custom report builder │ │ └── team/ # Team session components │ ├── shared/ # Cross-feature shared components │ │ ├── navigation/ # Nav, MobileBottomNav, CompanySelector │ │ └── ...modals & prompts │ ├── theme/ # Theme provider & toggle │ └── ui/ # Base UI primitives (shadcn/ui) ├── hooks/ # Custom React hooks │ ├── inventory/ # Domain-specific hooks │ └── useSyncQueue.ts # Offline sync queue hook ├── prisma/ # Database schema & migrations │ └── schema.prisma # 11 models, 3 enums ├── public/ # Static assets & PWA manifest └── middleware.ts # Route protection middleware
```

Fontes: [app/(main)/layout.tsx](app/(main)/layout.tsx#L1-L53), [app/(main)/page.tsx](app/(main)/page.tsx#L1-L311), [middleware.ts](middleware.ts#L1-L46)

## [Principais Decisões de Design](Countifly#key-design-decisions)
Arquitetura PWA mobile-first — O manifesto declara `display: standalone` com orientação retrato, e o layout raiz configura a tag meta viewport para evitar o redimensionamento pelo usuário (`userScalable: false`) para proporcionar uma sensação de aplicativo nativo. Um componente `InstallPrompt` ([components/shared/InstallPrompt.tsx](components/shared/InstallPrompt.tsx)) exibe o prompt nativo de instalação quando disponível.

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

Esta Visão Geral introduziu o propósito, a arquitetura e os conceitos fundamentais do Countifly. Para começar a construir ou rodar o projeto localmente, prossiga para o guia de [Início Rápido](//2-quick-start). Para uma compreensão mais profunda de como a base de código é organizada e como os dados fluem entre as camadas, explore a [Visão Geral da Arquitetura](//3-architecture-overview). Para aprender sobre subsistemas específicos, você pode mergulhar diretamente em qualquer uma das análises profundas dos modos de contagem: [Contagem Livre (Modo de Auditoria)](//4-free-count-audit-mode), [Contagem por Importação de CSV](//5-csv-import-counting) ou [Sessões Colaborativas em Equipe](//6-team-collaborative-sessions).
