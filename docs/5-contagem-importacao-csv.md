O modo de Contagem por Importação de CSV transforma o Countifly de um auditor de código de barras de formato livre em um sistema de inventário orientado a catálogo. Em vez de escanear o que você encontra e contar do zero, este modo permite que as equipes pré-carreguem todo o catálogo de produtos de um arquivo CSV e, em seguida, contem sistematicamente escaneando contra os níveis de estoque esperados e conhecidos. A arquitetura espelha a estrutura de abas do modo de Contagem Livre, mas introduz um ciclo de vida de dados fundamentalmente diferente: catálogo primeiro, contagem depois — com importação em streaming no lado do servidor, feedback de progresso em tempo real e rastreamento de alterações baseado em snapshots que destaca visualmente o que mudou após cada upload.

## Seleção de Modo e Controle de Acesso no Lado do Servidor
Antes de qualquer arquivo CSV ser analisado, o sistema aplica um portão de duas camadas no limite do servidor. O ponto de entrada da página em `app/(main)/count-import/page.tsx` é um componente de servidor (`force-dynamic`) que verifica a sessão do usuário via `getAuthPayload()` e então consulta o banco de dados para verificar as permissões em nível de módulo — especificamente se o usuário é um `ADMIN` ou tem `modulo_importacao` ativado ([page.tsx#L17-L45](https://zread.ai/will-aam/Countifly/app/(main)/count-import/page.tsx#L17-L45)). Usuários não autorizados são redirecionados silenciosamente para o dashboard, impedindo o bypass baseado em URL.

Uma vez autenticado, o servidor renderiza o `CountImportPageClient` com o `userId` resolvido e uma `initialTab` derivada do parâmetro de pesquisa `?tab=` ([page.tsx#L48-L51](https://zread.ai/will-aam/Countifly/app/(main)/count-import/page.tsx#L48-L51)). Este padrão — autenticação no lado do servidor + hidratação no lado do cliente — é o mesmo limite de segurança usado em todos os modos de contagem, mas o caminho de importação adiciona a verificação de permissão do módulo, tornando a importação de CSV um privilégio e não uma capacidade padrão.

Fontes: [page.tsx](https://zread.ai/will-aam/Countifly/app/(main)/count-import/page.tsx#L17-L51)

## Visão Geral da Arquitetura: O Pipeline de Dados de Importação
O sistema de importação de CSV é construído em torno de um pipeline de processamento de streaming no lado do servidor com orquestração de estado no lado do cliente. Entender o fluxo de dados completo é essencial antes de examinar os componentes individuais.
O pipeline começa quando o usuário seleciona um arquivo CSV, flui através do processamento de streaming no lado do servidor e conclui com uma recarga de catálogo e um diff visual. Cada estágio é isolado — o componente de upload não conhece o banco de dados e o hook de detecção de alterações não conhece a rede.

Fontes: [CountImportPageClient.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Import/CountImportPageClient.tsx#L61-L64), [ImportTab.tsx](https://zread.ai/will-aam/Countifly/components/inventory/ImportTab.tsx#L94-L122), [ImportUploadSection.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L145-L247)

## O Hook Maestro: useInventory com mode: "import"
Todo o estado da página de importação é governado por uma única chamada para `useInventory({ userId, mode: "import" })` ([CountImportPageClient.tsx#L61-L64](https://zread.ai/will-aam/Countifly/components/inventory/Import/CountImportPageClient.tsx#L61-L64)). Este é o mesmo hook que alimenta o modo de Contagem Livre, mas o parâmetro `mode` cria um caminho de execução divergente que afeta três comportamentos críticos.

Primeiro, o cálculo de itens ausentes filtra produtos `FIXO` quando no modo de importação — essas são entradas do catálogo mestre semeadas pelo administrador que não devem aparecer como "não contadas" durante a sessão baseada em importação de um usuário ([useInventory.ts#L137-L143](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L137-L143)). Segundo, o sub-hook de contagens (`useCounts`) recebe o modo e o usa para isolar o estado entre as sessões de auditoria e importação, impedindo que as leituras de código de barras em um modo vazem para o outro ([useInventory.ts#L48-L52](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L48-L52)). Terceiro, o hook de histórico registra as contagens com a tag do modo de importação, permitindo consultas históricas por modo.

O hook também fornece `downloadTemplateCSV()`, que usa `papaparse` para gerar um modelo delimitado por ponto-e-vírgula com um prefixo BOM (`\uFEFF`) para garantir a compatibilidade com o Excel ([useInventory.ts#L219-L237](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L219-L237)), e duas funções de limpeza distintas: `handleClearAllData` (exclui tudo via `?scope=all`) e `handleClearImportOnly` (remove apenas o catálogo via `?scope=catalog`, preservando as contagens de scan) ([useInventory.ts#L169-L217](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L169-L217)).

Fontes: [useInventory.ts](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L25-L262)

## Especificação do Formato CSV
O sistema de importação espera um arquivo CSV estritamente estruturado. Qualquer desvio aciona erros de validação em nível de linha relatados através do pipeline de streaming.
As colunas esperadas são `codigo_de_barras`, `codigo_produto`, `descricao` e `saldo_estoque`.
Requisitos de arquivo incluem delimitador `;`, prefixo `\uFEFF` e extensão `.csv`.

A função de geração de modelo no `useInventory` produz um arquivo de exemplo formatado corretamente ([useInventory.ts#L219-L237](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L219-L237)), e o componente de upload também incorpora um gerador de modelo de fallback usando um `Blob` simples se a versão do hook estiver indisponível ([ImportUploadSection.tsx#L129-L142](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L129-L142)).

Fontes: [useInventory.ts](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L219-L237), [ImportUploadSection.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L129-L142)

## Fluxo de Upload: Eventos Enviados pelo Servidor (SSE)
A função `processUpload` dentro do `ImportUploadSection` é o coração da experiência do usuário (UX) de importação. Ela não usa um ciclo simples de requisição-resposta — em vez disso, comunica-se com o servidor via Eventos Enviados pelo Servidor (SSE) sobre uma resposta de streaming do `fetch` ([ImportUploadSection.tsx#L145-L247](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L145-L247)).

O fluxo de upload segue um ciclo de vida claro. Antes que a requisição de rede comece, `onImportStart()` é disparado, o que aciona `captureSnapshot()` na aba pai `ImportTab` — salvando os níveis de estoque do catálogo atual em um `Map` armazenado via `useRef` ([useImportState.ts#L23-L34](https://zread.ai/will-aam/Countifly/components/inventory/Import/useImportState.ts#L23-L34)). O arquivo é então enviado como `FormData` via `POST` para `/api/inventory/import` ([ImportUploadSection.tsx#L156-L165](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L156-L165)).

A stream de resposta é consumida usando `TextDecoderStream` canalizada em um leitor manual de buffer de linha ([ImportUploadSection.tsx#L176-L179](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L176-L179)). Cada linha `data:` é analisada como JSON, e o tipo de evento determina a resposta da interface do usuário (UI):

- `fatal` — aborta imediatamente e exibe um erro irrecuperável ([ImportUploadSection.tsx#L193-L201](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L193-L201))
- `row_error` — adiciona um erro de validação com o número da linha e os motivos ([ImportUploadSection.tsx#L202-L210](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L202-L210))
- `row_conflict` — adiciona um aviso para códigos de barras duplicados ([ImportUploadSection.tsx#L212-L220](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L212-L220))
- `start` — inicializa a barra de progresso com a contagem total de linhas ([ImportUploadSection.tsx#L222-L228](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L222-L228))
- `progress` — atualiza o contador contínuo de linhas importadas/com erro ([ImportUploadSection.tsx#L230-L232](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L230-L232))
- `complete` — aciona `onImportSuccess()` que recarrega o catálogo e executa a detecção de alterações ([ImportUploadSection.tsx#L233-L236](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L233-L236))

Fontes: [ImportUploadSection.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L145-L247)

## Confirmação de Re-importação e Semântica de Mesclagem
Quando um usuário faz upload de um novo CSV enquanto já existem produtos no catálogo, o sistema entra em um fluxo de confirmação em vez de prosseguir silenciosamente. A função `handleCsvUploadWithConfirmation` verifica `hasImportedItems` (derivada do comprimento do array de produtos filtrados) e, se verdadeira, armazena o arquivo no estado `pendingFile` e abre um `AlertDialog` ([ImportUploadSection.tsx#L249-L262](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L249-L262)).

A caixa de diálogo de confirmação comunica explicitamente a semântica de mesclagem: novos itens são anexados e itens existentes (correspondidos por código de barras) têm suas quantidades de estoque somadas ([ImportUploadSection.tsx#L281-L291](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L281-L291)). Para realizar uma substituição completa do catálogo, os usuários devem primeiro clicar em "Limpar" (limpar importação), o que aciona `handleClearImportOnly` e recarrega a página.

Esse design evita a perda acidental de dados e suporta fluxos de trabalho iterativos onde as equipes fazem upload de CSVs parciais de diferentes zonas do armazém e deixam o sistema mesclá-los em um catálogo unificado.

Fontes: [ImportUploadSection.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L249-L308)

## Detecção de Alterações Baseada em Snapshots com useImportState
Após a conclusão do upload e o recarregamento do catálogo, o sistema precisa comunicar visualmente o que mudou. Isso é tratado pelo hook `useImportState`, que implementa um padrão de duas fases snapshot/compare ([useImportState.ts#L14-L72](https://zread.ai/will-aam/Countifly/components/inventory/Import/useImportState.ts#L14-L72)).

Fase 1 — Snapshot (antes do upload): `captureSnapshot()` itera sobre a lista de produtos atual, ignorando as entradas do tipo `FIXO`, e armazena o mapeamento `codigo_produto → saldo_estoque` de cada produto em um `useRef<Map>` ([useImportState.ts#L23-L34](https://zread.ai/will-aam/Countifly/components/inventory/Import/useImportState.ts#L23-L34)). Isso é chamado pelo `ImportTab` através do callback `onImportStart` antes que a requisição de rede comece ([ImportTab.tsx#L106-L108](https://zread.ai/will-aam/Countifly/components/inventory/ImportTab.tsx#L106-L108)).

Fase 2 — Detectar (após o upload): `detectChanges()` itera sobre a lista de produtos recém-carregada e compara o estoque de cada item com o snapshot. Produtos que não existiam antes (novas adições) ou que têm um valor de estoque diferente (atualizados) são adicionados a um conjunto (`Set`) `modifiedProductCodes` ([useImportState.ts#L37-L60](https://zread.ai/will-aam/Countifly/components/inventory/Import/useImportState.ts#L37-L60)). Após a comparação, o snapshot é limpo para liberar memória.

O conjunto `modifiedProductCodes` é então consumido pelo componente `ProductTableRow` no `ImportTab`, que renderiza um ponto azul pulsante animado ao lado de cada produto alterado ([ImportTab.tsx#L72-L84](https://zread.ai/will-aam/Countifly/components/inventory/ImportTab.tsx#L72-L84)). Isso dá aos usuários feedback visual imediato sobre quais linhas foram afetadas pela importação mais recente sem exigir uma visão completa das diferenças (diff view).

Fontes: [useImportState.ts](https://zread.ai/will-aam/Countifly/components/inventory/Import/useImportState.ts#L14-L72), [ImportTab.tsx](https://zread.ai/will-aam/Countifly/components/inventory/ImportTab.tsx#L93-L122)

## Tratamento de Erros e Interface do Usuário (UI)
O sistema de importação distingue três categorias de problemas, cada uma com tratamento visual distinto e orientação ao usuário.

Erros fatais (`type: "fatal"`) são problemas irrecuperáveis no lado do servidor (falha de análise de arquivo, expiração de autenticação) que interrompem imediatamente a importação e exibem um alerta proeminente ([ImportUploadSection.tsx#L193-L201](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L193-L201)).

Erros de validação no nível da linha (`type: "row_error"`) representam linhas malformadas — campos obrigatórios ausentes, tipos de dados inválidos ou violações de restrição. Estes são coletados em uma lista de erros rolável com limite de `MAX_RENDERED_ERRORS = 15` itens visíveis para evitar a sobrecarga do DOM ([ImportUploadSection.tsx#L50](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L50)). Cada erro exibe o número da linha em um crachá monoespaçado ao lado dos motivos específicos da validação.

Conflitos no nível da linha (`type: "row_conflict"`) indicam códigos de barras duplicados dentro do mesmo arquivo. Estes são tratados como avisos e não como falhas graves — as linhas duplicadas são ignoradas, mas a importação continua ([ImportUploadSection.tsx#L212-L220](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L212-L220)).

Para relatórios de erros mais complexos, o componente separado `ImportErrorList` ([ImportErrorList.tsx](https://zread.ai/will-aam/Countifly/components/inventory/ImportErrorList.tsx)) fornece uma visualização baseada em cartões que categoriza erros versus conflitos com estilos visuais distintos — bordas vermelhas para erros de validação, bordas âmbar para conflitos — e inclui um botão opcional "Baixar Relatório de Erros (CSV)" para análise offline ([ImportErrorList.tsx#L95-L105](https://zread.ai/will-aam/Countifly/components/inventory/ImportErrorList.tsx#L95-L105)).

Fontes: [ImportUploadSection.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L43-L50), [ImportErrorList.tsx](https://zread.ai/will-aam/Countifly/components/inventory/ImportErrorList.tsx#L23-L45)

## Filtragem de Produtos: Catálogo Importado vs. Fixo
Uma distinção arquitetônica fundamental no modo de importação é a separação entre produtos importados pelo usuário e produtos do catálogo fixo semeados pelo administrador. Todo produto carrega um campo `tipo_cadastro` — seja `"IMPORTADO"` (do upload de CSV) ou `"FIXO"` (do endpoint de importação do administrador).

O `ImportTab` filtra a lista de produtos exibida para mostrar apenas itens não-`FIXO` via `useMemo`:

```typescript
const displayedProducts = useMemo(() => { 
  return props.products.filter((p) => p.tipo_cadastro !== "FIXO"); 
}, [props.products]);
```
([ImportTab.tsx#L100-L102](https://zread.ai/will-aam/Countifly/components/inventory/ImportTab.tsx#L100-L102))

Este mesmo filtro é aplicado no cálculo de itens ausentes dentro de `useInventory` ([useInventory.ts#L138-L140](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L138-L140)) e no hook de detecção de alterações ([useImportState.ts#L27](https://zread.ai/will-aam/Countifly/components/inventory/Import/useImportState.ts#L27), [useImportState.ts#L42](https://zread.ai/will-aam/Countifly/components/inventory/Import/useImportState.ts#L42)). O endpoint de importação do catálogo de administrador em `/api/admin/import-catalog/route.ts` define explicitamente `tipo_cadastro: "FIXO"` em todos os produtos atualizados/inseridos via `upsert` ([route.ts#L42](https://zread.ai/will-aam/Countifly/app/api/admin/import-catalog/route.ts#L42), [route.ts#L53](https://zread.ai/will-aam/Countifly/app/api/admin/import-catalog/route.ts#L53)), usando o código de barras como chave primária para lidar com re-importações de forma idempotente.

Este design de catálogo duplo permite que as organizações mantenham um banco de dados mestre de produtos (semeado pelo administrador, visível em todos os modos) enquanto as sessões de contagem individuais importam seus próprios subconjuntos de produtos específicos da sessão sem colisão.

Fontes: [ImportTab.tsx](https://zread.ai/will-aam/Countifly/components/inventory/ImportTab.tsx#L100-L102), [route.ts](https://zread.ai/will-aam/Countifly/app/api/admin/import-catalog/route.ts#L29-L55), [useInventory.ts](https://zread.ai/will-aam/Countifly/hooks/useInventory.ts#L137-L143)

## UX Mobile-First: Cartões Educativos e Compartilhamento de Links
A `ImportUploadSection` renderiza visualizações diferentes com base no tamanho da tela. No celular (abaixo do breakpoint `sm`), ele exibe um cartão educacional com instruções passo a passo para configurar a importação em um computador desktop e, em seguida, acessá-la pelo celular ([ImportUploadSection.tsx#L311-L355](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L311-L355)).

O cartão móvel inclui dois mecanismos de distribuição: um botão de Compartilhar usando a Web Share API (`navigator.share`) para compartilhamento de sistema operacional nativo via WhatsApp/email e um botão de Copiar Link que copia a URL da página atual para a área de transferência ([ImportUploadSection.tsx#L101-L128](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L101-L128)). Um botão proeminente "Explorar Modo de Demonstração" também está disponível quando `onStartDemo` é fornecido, acionando o modo de demonstração e alternando automaticamente para a guia de digitalização ([ImportUploadSection.tsx#L332-L337](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L332-L337)).

No desktop, a seção de upload apresenta um cartão limpo com a referência do formato CSV (com um botão de copiar para a área de transferência), a entrada do arquivo com estilo de destino para arrastar (`border-dashed`), um botão de limpar, uma barra de progresso durante a importação e a lista de erros ([ImportUploadSection.tsx#L358-L524](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L358-L524)).

Fontes: [ImportUploadSection.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Import/ImportUploadSection.tsx#L311-L355)

## Estrutura de Abas e Hierarquia de Componentes
A página do modo de importação organiza sua funcionalidade em quatro abas, cada uma apoiada por um componente dedicado:
- `scan` -> `ConferenceTab`
- `import` -> `ImportTab`
- `export` -> `ExportTab`
- `config` -> `ConfigTab`

O estado da guia é sincronizado com o parâmetro de consulta de URL (`?tab=import`) via `useSearchParams` e `router.push`, permitindo deep-linking e navegação de retorno do navegador ([CountImportPageClient.tsx#L47-L58](https://zread.ai/will-aam/Countifly/components/inventory/Import/CountImportPageClient.tsx#L47-L58)). O desktop renderiza uma `TabsList` horizontal com gatilhos rotulados por ícones, enquanto o mobile usa um sistema de navegação inferior separado (manipulado por `MobileBottomNav` no layout pai).

Fontes: [CountImportPageClient.tsx](https://zread.ai/will-aam/Countifly/components/inventory/Import/CountImportPageClient.tsx#L73-L163)

## Mapa de Dependência de Componentes e Sistemas Transversais
O Modo de Importação de CSV não opera isoladamente — ele toca vários sistemas transversais documentados em outras partes:

- **Camada IndexedDB Offline-First**: Após cada carga de catálogo bem-sucedida, `useCatalog` persiste produtos e códigos de barras no IndexedDB via `saveCatalogOffline`. Quando o servidor está inacessível, ele faz o fallback para `getCatalogOffline` e exibe uma notificação toast. Veja a [Camada IndexedDB Offline-First](https://zread.ai/8-offline-first-indexeddb-layer) para a arquitetura de cache completa.
- **Mecanismo de Fila de Sincronização**: As contagens de varredura realizadas no modo de importação são salvas localmente e enfileiradas para sincronização do servidor via `addToSyncQueue`. O comportamento de sincronização respeita o parâmetro de `mode` atual, garantindo que as contagens no modo de importação não interfiram nos dados do modo de auditoria. Veja [Mecanismo de Fila de Sincronização](https://zread.ai/9-sync-queue-mechanism) para detalhes de processamento da fila.
- **Motor do Leitor de Código de Barras**: A aba de digitalização (`ConferenceTab`) dentro do modo de importação usa a mesma infraestrutura de scanner da Contagem Livre, mas as pesquisas são limitadas ao catálogo importado em vez de qualquer código de barras. Veja [Motor do Leitor de Código de Barras](https://zread.ai/7-barcode-scanner-engine) para tratamento de entrada e câmera.
- **Controle de Acesso Baseado em Módulo**: O campo de permissão `modulo_importacao` no modelo `Usuario` governa se usuários não-administradores podem acessar a página de importação.
- **Autenticação e Segurança**: Validação de sessão do lado do servidor via `getAuthPayload()` protege todos os endpoints da API, incluindo o endpoint de importação de streaming.
- **Design de Esquema de Banco de Dados**: O campo `tipo_cadastro` no modelo `Produto` e a restrição exclusiva composta `codigo_produto_usuario_id` habilitam a arquitetura de catálogo duplo.
