Contagem Livre (Modo de Auditoria) é o principal fluxo de contagem de estoque do Countifly — um sistema de auditoria guiado por código de barras, com capacidade offline, que permite aos usuários escanear itens em tempo real, acumular contagens entre o salão da loja e o estoque, e opcionalmente capturar preços unitários para avaliação de ativos. Diferente da [Contagem por Importação de CSV](https://zread.ai/5-csv-import-counting), que começa a partir de uma planilha, o Modo de Auditoria começa como uma tela em branco: cada entrada se origina de um escaneamento físico ou entrada manual, tornando-o ideal para auditorias em campo onde nenhum catálogo de produtos prévio está disponível.

## https://zread.ai/will-aam/Countifly/4-free-count-audit-mode#server-side-gate-and-access-controlPortão no Lado do Servidor e Controle de Acesso
A página de auditoria impõe um modelo de acesso estrito de duas camadas no nível do servidor Next.js antes de qualquer JavaScript do cliente ser executado. O componente de servidor em app/(main)/audit/page.tsx realiza a autenticação via getAuthPayload(), então consulta a tabela de usuários pela flag modulo_livre. Apenas usuários com tipo === "ADMIN" ou que possuam a permissão modulo_livre === true têm o acesso concedido; todos os outros recebem um redirecionamento imediato para o painel. Esse padrão evita a manipulação de URL e garante que a capacidade de auditoria seja governada pelo sistema descrito em outro lugar neste catálogo.

```
app/(main)/audit/page.tsx
```


```
getAuthPayload()
```


```
Usuario
```


```
modulo_livre
```


```
tipo === "ADMIN"
```


```
modulo_livre === true
```

[Controle de Acesso Baseado em Módulos](https://zread.ai/13-module-based-access-control)
Fontes: [page.tsx](https://zread.ai/will-aam/Countifly/app/(main)/audit/page.tsx#L11-L53)

## https://zread.ai/will-aam/Countifly/4-free-count-audit-mode#inventory-hook-orchestrationOrquestração do Hook de Estoque
Todo o fluxo de auditoria é conduzido por um único hook orquestrador — useInventory — inicializado com mode: "audit". Este hook "maestro" compõe quatro sub-hooks especializados e expõe uma superfície de API unificada para a interface de usuário (UI). O parâmetro mode é o mecanismo de isolamento crítico: ele filtra contagens carregadas do IndexedDB, controla a sincronização com o servidor (apenas o modo auditoria sincroniza) e previne a contaminação cruzada entre dados de contagem livre e contagem importada.

```
useInventory
```


```
mode: "audit"
```


```
audit
```


```
useCatalog
```


```
products[]
```


```
barCodes[]
```


```
useScanner
```


```
currentProduct
```


```
scanInput
```


```
handleScan
```


```
useCounts
```


```
productCounts[]
```


```
handleAddCount
```


```
countingMode
```


```
useHistory
```


```
handleSaveCount
```


```
isSaving
```


```
showSaveModal
```

O orquestrador também gerencia preocupações transversais: computação de itens ausentes (produtos no catálogo com contagem zero), criação manual de itens e estados de visibilidade de modais para diálogos de limpar/salvar/itens ausentes.
Fontes: [useInventory.ts](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L20-L95)

## https://zread.ai/will-aam/Countifly/4-free-count-audit-mode#counting-session-and-snapshot-hydrationSessão de Contagem e Hidratação de Snapshot
Quando a página de auditoria é carregada em modo online, o useCounts aciona uma sequência de inicialização que chama GET /api/single/session. Este endpoint — alimentado por ensureSinglePlayerSession() — garante que exista uma sessão dedicada para o usuário autenticado e retorna um snapshot (instantâneo) de todas as movimentações previamente registradas, agrupadas por código de barras e tipo_local (LOJA ou ESTOQUE). O cliente então resolve cada entrada do snapshot contra o catálogo local (IndexedDB ou em memória) para produzir objetos ProductCount totalmente hidratados, contendo descrições, categorias e preços dos produtos. Esse padrão de hidratação assegura que, se o servidor mantiver contagens de uma sessão parcial anterior, o usuário veja seu trabalho acumulado imediatamente — não uma tela em branco.

```
useCounts
```


```
GET /api/single/session
```


```
ensureSinglePlayerSession()
```


```
tipo_local
```


```
ProductCount
```

A dimensão tipo_local é embutida diretamente na consulta groupBy do Prisma para que as contagens do salão da loja e do estoque sejam rastreadas de forma independente e possam ser reconsolidadas no cliente sem perda de dados.

```
tipo_local
```


```
groupBy
```

Fontes: [useCounts.ts](https://zread.ai/will-aam/Countifly/hooks/inventory/useCounts.ts#L62-L100), [route.ts](https://zread.ai/will-aam/Countifly/app/api/single/session/route.ts#L24-L50)

## https://zread.ai/will-aam/Countifly/4-free-count-audit-mode#dual-location-counting-loja--estoqueContagem de Local Duplo (Loja / Estoque)
Uma característica que distingue o Modo de Auditoria é o seu modelo de contagem de local duplo. Os usuários alternam entre loja e estoque por meio de um controle de abas segmentado na visualização de Conferência. Cada quantidade escaneada é marcada com o local ativo e acumulada em campos separados — quant_loja e quant_estoque — dentro do mesmo registro ProductCount. Isso permite que os auditores contem o mesmo SKU em ambos os locais durante uma única sessão sem criar entradas duplicadas. A alternância de local aparece tanto nos emblemas (badges) do cartão de contagem quanto na pré-visualização de exportação, fornecendo rastreabilidade total de onde cada unidade foi observada.

```
loja
```


```
estoque
```


```
quant_loja
```


```
quant_estoque
```


```
ProductCount
```

Fontes: [AuditConferenceTab.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/AuditConferenceTab.tsx#L384-L404), [useCounts.ts](https://zread.ai/will-aam/Countifly/hooks/inventory/useCounts.ts#L45-L46)

## https://zread.ai/will-aam/Countifly/4-free-count-audit-mode#scan-count-and-accumulate-workflowFluxo de Escanear, Contar e Acumular
O pipeline de escaneamento segue um fluxo determinístico: entrada de código de barras (teclado manual ou câmera) → resolução de catálogo via useScanner → exibição do produto com campo de quantidade autofocado → entrada da quantidade (com suporte para expressões matemáticas) → handleAddCount → atualização do estado local + persistência no IndexedDB + inserção na fila de sincronização. Quando um código de barras não é encontrado no catálogo, um produto temporário é criado em memória com um prefixo TEMP-, permitindo que a auditoria prossiga sem interrupções. O utilitário calculateExpression aceita expressões matemáticas como 5+3*2 diretamente no campo de quantidade, calculadas antes do envio — um atalho prático para a contagem em nível de caixa.

```
useScanner
```


```
handleAddCount
```


```
TEMP-
```


```
calculateExpression
```


```
5+3*2
```

Cada adição de contagem também empurra um registro de movimentação para a fila de sincronização (addToSyncQueue) contendo o código de barras, a quantidade, o timestamp (carimbo de data/hora) e o tipo_local. Essa fila é persistida no IndexedDB e descarregada de forma oportuna quando a conectividade está disponível, formando a espinha dorsal do [Mecanismo de Fila de Sincronização](https://zread.ai/9-sync-queue-mechanism).

```
addToSyncQueue
```


```
tipo_local
```

Fontes: [AuditConferenceTab.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/AuditConferenceTab.tsx#L315-L328), [useInventory.ts](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L69-L78), [useCounts.ts](https://zread.ai/will-aam/Countifly/hooks/inventory/useCounts.ts#L153-L180)

## https://zread.ai/will-aam/Countifly/4-free-count-audit-mode#manual-item-entryEntrada Manual de Itens
Nem todo item físico possui um código de barras. O componente ManualItemSheet fornece um painel deslizante para o registro ad-hoc de itens, aceitando uma descrição em texto livre, quantidade (com suporte para expressões de calculadora) e preço unitário opcional. Itens manuais recebem um código de barras SEM-COD-{timestamp} na fila de sincronização e um prefixo MANUAL-ENTRY no estado de contagem, tornando-os distinguíveis de itens resolvidos pelo catálogo. O painel inclui a navegação entre os campos usando a tecla Enter (descrição → quantidade → preço → salvar) para entrada rápida de dados, e a inserção do preço utiliza uma máscara monetária de Real Brasileiro com inputMode="numeric".

```
ManualItemSheet
```


```
SEM-COD-{timestamp}
```


```
MANUAL-ENTRY
```


```
inputMode="numeric"
```

Fontes: [ManualItemSheet.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/ManualItemSheet.tsx#L32-L72), [AuditPageClient.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/AuditPageClient.tsx#L105-L111)

## https://zread.ai/will-aam/Countifly/4-free-count-audit-mode#configuration-and-offline-modeConfiguração e Modo Offline
A aba de Configurações (Settings) expõe duas alternâncias (toggles) que alteram o comportamento da auditoria. "Ativar Base Offline" aciona o useCatalog para baixar o catálogo completo de produtos para o IndexedDB via saveCatalogOffline(), permitindo a resolução de códigos de barras sem acesso à rede. Quando o modo offline está ativo, um selo (badge) com um ícone WifiOff confirma a prontidão. "Solicitar Preço" renderiza condicionalmente um campo de entrada de preço unitário na aba de Conferência e adiciona colunas de preço à pré-visualização de exportação, permitindo auditorias de avaliação de ativos. Ambas as configurações são persistidas em localStorage sob a chave audit-settings-v1 e restauradas ao recarregar a página.

```
useCatalog
```


```
saveCatalogOffline()
```


```
WifiOff
```


```
localStorage
```


```
audit-settings-v1
```

Fontes: [AuditSettingsTab.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/AuditSettingsTab.tsx#L15-L89), [AuditPageClient.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/AuditPageClient.tsx#L57-L73)

## https://zread.ai/will-aam/Countifly/4-free-count-audit-mode#export-and-data-persistenceExportação e Persistência de Dados
A aba Exportar fornece um painel de resumo de três cartões (itens únicos, unidades totais, valor total quando a coleta de preços está ativa), botões de ação para download local de CSV e salvamento no servidor, e uma tabela de pré-visualização de dados com rolagem. A exportação CSV usa Papa.unparse com delimitadores de ponto-e-vírgula e codificação BOM para compatibilidade com o Excel Brasileiro. A tabela de pré-visualização exibe todos os campos de contagem — código de barras, descrição, categoria, contagem na loja, contagem no estoque, total e, opcionalmente, preço unitário e total da linha — em uma única exibição. A ação de salvar no servidor delega para useHistory.handleSaveCount, que gera o payload (carga de dados) do relatório e o envia via POST para a API de inventário, anexando depois um registro ao endpoint histórico na [Estrutura de Rotas da API](https://zread.ai/11-api-route-structure).

```
Papa.unparse
```


```
useHistory.handleSaveCount
```

Fontes: [[AuditExportTab.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/AuditExportTab.tsx#L186-L214)](https://zread.ai/will-aam/Countifly/components/inventory/Audit/AuditExportTab.tsx#L35-L72), AuditExportTab.tsx

## https://zread.ai/will-aam/Countifly/4-free-count-audit-mode#component-architecture-summaryResumo da Arquitetura de Componentes
Os cinco componentes de cliente do Modo de Auditoria formam uma hierarquia em camadas onde o AuditPageClient detém todo o estado (via useInventory) e o distribui por meio de props para os filhos em nível de abas. Este padrão de perfuração de props (prop-drilling) — em vez de um provedor de contexto — foi escolhido intencionalmente para fins de rastreabilidade: todos os dados fluem através de uma única interface visível em AuditPageClient, tornando o fluxo de dados fácil de raciocinar durante a depuração.

```
AuditPageClient
```


```
useInventory
```


```
AuditPageClient
```


```
AuditPageClient
```

[AuditPageClient.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/AuditPageClient.tsx#L26-L246)

```
AuditConferenceTab
```

[AuditConferenceTab.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/AuditConferenceTab.tsx#L209-L657)

```
AuditSettingsTab
```

[AuditSettingsTab.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/AuditSettingsTab.tsx#L27-L89)

```
AuditExportTab
```

[AuditExportTab.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/AuditExportTab.tsx#L35-L306)

```
ManualItemSheet
```

[ManualItemSheet.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Audit/ManualItemSheet.tsx#L32-L235)

## https://zread.ai/will-aam/Countifly/4-free-count-audit-mode#progressionProgressão
Para entender o motor de escaneamento que impulsiona a resolução de código de barras, continue lendo sobre o [Motor do Scanner de Código de Barras](https://zread.ai/7-barcode-scanner-engine). Para saber como os dados de auditoria persistem localmente durante interrupções de rede, veja [Camada IndexedDB Offline-First](https://zread.ai/8-offline-first-indexeddb-layer). Para o fluxo de contagem complementar que começa a partir de uma planilha em vez de escaneamento físico, veja [Contagem por Importação de CSV](https://zread.ai/5-csv-import-counting).
