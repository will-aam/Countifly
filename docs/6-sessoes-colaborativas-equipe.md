As Sessões Colaborativas de Equipe transformam a contagem de inventário de um fluxo de trabalho de usuário único em uma experiência multijogador em tempo real. Este sistema permite que um gerente crie uma sala de contagem, importe um catálogo de produtos e convide vários participantes para escanear e contar itens simultaneamente — tudo com resiliência offline, sincronização sem conflitos e um pipeline de relatórios finais integrado.

## Visão Geral da Arquitetura
O sistema colaborativo segue uma arquitetura hub-and-spoke (centro e raio): o navegador do gerente atua como o centro de controle (hub), enquanto o dispositivo de cada participante opera como uma unidade de contagem independente (spoke). Todos os spokes sincronizam seus movimentos através de uma camada de API compartilhada apoiada pelo PostgreSQL, com uma fila offline baseada no IndexedDB fornecendo resiliência contra interrupções de rede.
Fontes: [schema.prisma](https://zread.ai/will-aam/Countifly/prisma/schema.prisma#L56-L130), [TeamManagerView.tsx](https://zread.ai/will-aam/Countifly/components/inventory/team/TeamManagerView.tsx#L37-L411), [useParticipantInventory.ts](https://zread.ai/will-aam/Countifly/hooks/useParticipantInventory.ts#L34-L44)

## Modelo de Dados
Quatro modelos Prisma formam a espinha dorsal das sessões colaborativas. O design isola os produtos restritos à sessão (ProdutoSessao) do catálogo de produtos pessoais do usuário (Produto), garantindo que cada sala de contagem tenha um universo de produtos autônomo.

```
ProdutoSessao
```


```
Produto
```

Três decisões principais de design merecem atenção. Primeiro, Movimento.id_movimento_cliente é um UUID gerado do lado do cliente — esta é a âncora de resolução de conflitos que permite a sincronização idempotente mesmo quando os participantes operam totalmente offline. Segundo, ProdutoSessao usa uma restrição única composta em (sessao_id, codigo_produto) para evitar entradas duplicadas de catálogo dentro de uma sessão. Terceiro, o enum StatusSessao (ABERTA → ENCERRANDO → FINALIZADA) impõe uma máquina de estado que controla todas as operações de gravação na camada da API.

```
Movimento.id_movimento_cliente
```


```
ProdutoSessao
```


```
(sessao_id, codigo_produto)
```


```
StatusSessao
```


```
ABERTA
```


```
ENCERRANDO
```


```
FINALIZADA
```

Fontes: [schema.prisma](https://zread.ai/will-aam/Countifly/prisma/schema.prisma#L56-L130), [sync/route.ts](https://zread.ai/will-aam/Countifly/app/api/session/%5BsessionId%5D/sync/route.ts#L26-L54)

## Ciclo de Vida da Sessão
Uma sessão colaborativa segue um rigoroso ciclo de vida de cinco fases. Cada transição é protegida tanto pelo estado da UI no cliente quanto por verificações de status na API, evitando condições de corrida entre o painel de controle do gerente e os dispositivos de escaneamento dos participantes.

### Fase 1 — Criação da Sessão
O gerente cria uma sessão por meio do componente TeamManagerView, que envia um POST para /api/sessions. O servidor gera um código de acesso de 6 caracteres criptograficamente aleatório usando caracteres de ABCDEFGHJKMNPQRSTUVWXYZ23456789 — observe a exclusão deliberada de caracteres visualmente ambíguos (I, L, O, 0, 1). A geração do código usa um loop de repetição (até 5 tentativas) para lidar com o evento improvável de uma colisão de restrição única P2002. A limitação de taxa restringe cada usuário a 3 sessões ativas simultâneas e 10 sessões por janela contínua de 24 horas.

```
TeamManagerView
```


```
/api/sessions
```


```
ABCDEFGHJKMNPQRSTUVWXYZ23456789
```


```
P2002
```

Fontes: [sessions/route.ts](https://zread.ai/will-aam/Countifly/app/api/sessions/route.ts#L17-L108)

### Fase 2 — Importação de Catálogo
Com uma sessão ativa, o gerente muda para a aba Importar, onde o TeamImportTab delega para o componente compartilhado ImportUploadSection. A diferença crítica em relação às importações no modo individual é o endpoint da API de destino: customApiUrl é definido como /api/sessions/${sessionId}/import, que persiste produtos na tabela ProdutoSessao em vez da tabela pessoal Produto do usuário. A API de importação aceita arquivos CSV de até 5 MB e 20.000 linhas, com formatação de números do Brasil (1.234,56 → 1234.56). Um endpoint DELETE permite limpar o catálogo apenas se nenhum movimento tiver sido registrado — uma medida de segurança imposta tanto no diálogo de confirmação da UI quanto na API.

```
TeamImportTab
```


```
ImportUploadSection
```


```
customApiUrl
```


```
/api/sessions/${sessionId}/import
```


```
ProdutoSessao
```


```
Produto
```


```
1.234,56
```


```
1234.56
```

Fontes: [TeamImportTab.tsx](https://zread.ai/will-aam/Countifly/components/inventory/team/TeamImportTab.tsx#L90-L189), [import/route.ts](https://zread.ai/will-aam/Countifly/app/api/sessions/%5BsessionId%5D/import/route.ts#L24-L60), [TeamManagerView.tsx](https://zread.ai/will-aam/Countifly/components/inventory/team/TeamManagerView.tsx#L355-L375)

### Fase 3 — Entrada do Participante e Contagem
Os participantes acessam o sistema via um portal dedicado em /participant. Eles inserem o código da sessão de 6 caracteres, que é validado via /api/session/join. O endpoint de junção emprega várias medidas de segurança: validação de esquema Zod, um atraso para reduzir ataques (tarpit) de 2 segundos em falhas de validação (para desacelerar ataques de força bruta), um máximo de 10 participantes por sessão e limitação de taxa via withRateLimit. Após ingressar com sucesso, o participante recebe um ID e os dados da sua sessão são armazenados em sessionStorage.

```
/participant
```


```
/api/session/join
```


```
withRateLimit
```


```
sessionStorage
```

Após ingressar, a ParticipantView de cada participante é alimentada pelo hook useParticipantInventory, que orquestra o carregamento do catálogo, o registro de movimentos e a sincronização offline. O hook se integra com useSyncQueue e IndexedDB para colocar os movimentos em buffer localmente quando a conexão falha e, em seguida, processá-los em lote quando a rede retorna. Os movimentos carregam um UUID gerado pelo cliente (id_movimento_cliente), o código de barras, a quantidade e o local de contagem (LOJA ou ESTOQUE).

```
ParticipantView
```


```
useParticipantInventory
```


```
useSyncQueue
```


```
id_movimento_cliente
```


```
LOJA
```


```
ESTOQUE
```

Fontes: [join/route.ts](https://zread.ai/will-aam/Countifly/app/api/session/join/route.ts#L22-L53), [participant/page.tsx](https://zread.ai/will-aam/Countifly/app/participant/page.tsx#L12-L67), [useParticipantInventory.ts](https://zread.ai/will-aam/Countifly/hooks/useParticipantInventory.ts#L34-L44), [sync/route.ts](https://zread.ai/will-aam/Countifly/app/api/session/%5BsessionId%5D/sync/route.ts#L26-L54)

## Coordenação de Estado em Tempo Real
O sistema não usa WebSockets ou Server-Sent Events. Em vez disso, depende da coordenação de estado baseada em polling (consultas periódicas) com intervalos diferentes para as duas funções:

```
GET /api/sessions
```


```
GET /api/sessions/:id/status
```

Quando a consulta de status de um participante detecta FINALIZADA ou ENCERRANDO, um aviso de contagem regressiva de 3 segundos é exibido. Em seguida, sessionStorage e localStorage são limpos, e o participante é redirecionado para /login com uma mensagem explicando que a sessão foi encerrada. Essa abordagem troca a resposta imediata em tempo real pela simplicidade operacional — perfeitamente apropriada para uma ferramenta de inventário focada em dispositivos móveis, onde a eficiência da bateria importa mais que a latência de frações de segundo.

```
FINALIZADA
```


```
ENCERRANDO
```


```
sessionStorage
```


```
localStorage
```


```
/login
```

Fontes: [TeamManagerView.tsx](https://zread.ai/will-aam/Countifly/components/inventory/team/TeamManagerView.tsx#L92-L96), [ParticipantView.tsx](https://zread.ai/will-aam/Countifly/components/inventory/team/ParticipantView.tsx#L145-L202)

## Interface de Contagem do Participante
O componente ParticipantView apresenta um layout responsivo de duas colunas: a coluna esquerda contém o leitor de código de barras (tanto pela câmera quanto entrada manual) com a entrada de quantidade, enquanto a coluna direita exibe uma lista rolável dos itens contados. Vários detalhes de design merecem ser examinados.

```
ParticipantView
```

A entrada de quantidade suporta expressões aritméticas através da biblioteca mathjs — um participante pode digitar 5+5 ou 10*3 e o sistema avalia isso antes do envio, com tamanho máximo de expressão de 50 caracteres. O leitor de código de barras possui envio automático quando um código de barras de 13 dígitos é totalmente inserido (simulando o comportamento de um leitor físico), usando um debounce de 100ms para evitar submissões duplicadas. O alternador do modo de contagem (LOJA/ESTOQUE) registra o campo tipo_local em cada movimento, possibilitando a reconciliação sensível ao local no relatório final.

```
mathjs
```


```
5+5
```


```
10*3
```


```
LOJA
```


```
ESTOQUE
```


```
tipo_local
```

Cada item na lista de itens contados possui duas ações destrutivas: um botão de diminuição (ícone Trash2, remove uma unidade) e um botão de redefinição (ícone XCircle, zera o item com um diálogo de confirmação). A lista é filtrada em tempo real para exibir apenas os itens com um saldo positivo contado, a menos que haja uma consulta de pesquisa ativa.
Fontes: [ParticipantView.tsx](https://zread.ai/will-aam/Countifly/components/inventory/team/ParticipantView.tsx#L68-L280)

## Painel de Controle do Gerente
O ManagerSessionDashboard atua como centro de comando, fornecendo três funções principais: criação de sessão com nome opcional, exibição do código de acesso grande para copiar e encerramento da sessão com validação pré-fechamento.

```
ManagerSessionDashboard
```

Antes de permitir o encerramento da sessão, o gerente precisa passar por um portão de verificação de sincronização. Quando o botão "Encerrar Sessão" é clicado, onCheckPending aciona uma chamada para GET /api/sessions/:id/pending, que consulta o banco de dados por movimentos que ainda não foram totalmente reconciliados. O diálogo de confirmação de encerramento da sessão mostra um dos três estados:

```
onCheckPending
```


```
GET /api/sessions/:id/pending
```

1. Carregando — um spinner indica que a verificação pendente está em andamento
2. Aviso — texto amarelo (amber) avisa sobre dados não sincronizados, e o botão confirmar é desabilitado
3. Pronto — um selo de confirmação verde aparece e o botão confirmar fica ativo
Apenas quando pendingCheck.canClose for verdadeiro e pendingCheck.loading for falso o gerente pode prosseguir. Este controle evita a perda de dados por fechamento prematuro da sessão.

```
pendingCheck.canClose
```


```
true
```


```
pendingCheck.loading
```


```
false
```

Fontes: [ManagerSessionDashboard.tsx](https://zread.ai/will-aam/Countifly/components/inventory/team/ManagerSessionDashboard.tsx#L86-L473), [pending/route.ts](https://zread.ai/will-aam/Countifly/app/api/sessions/%5BsessionId%5D/pending/route.ts#L16-L171)

## Finalização de Sessão e Relatórios
Quando o gerente confirma o término de uma sessão, POST /api/sessions/:id/end executa um processo de finalização de várias etapas. O status da sessão muda para FINALIZADA, finalizado_em recebe um registro de data e hora e o servidor gera um RelatorioFinal abrangente contendo o total de produtos, total de itens contados, total de itens faltantes, discrepâncias por produto (sistema vs. contado), número de participantes, duração e timestamp. Este relatório é exibido em uma caixa de diálogo modal na tela do gerente e persistido no histórico da aplicação.

```
POST /api/sessions/:id/end
```


```
FINALIZADA
```


```
finalizado_em
```


```
RelatorioFinal
```

O campo tipo_local (LOJA/ESTOQUE) da tabela Movimento permite reconciliação por localidade — o relatório final pode diferenciar itens contados no salão de vendas e no estoque, oferecendo informações práticas para a correção de inventário.

```
Movimento
```


```
tipo_local
```


```
LOJA
```


```
ESTOQUE
```

Fontes: [end/route.ts](https://zread.ai/will-aam/Countifly/app/api/sessions/%5BsessionId%5D/end/route.ts#L28-L186), [ManagerSessionDashboard.tsx](https://zread.ai/will-aam/Countifly/components/inventory/team/ManagerSessionDashboard.tsx#L70-L84), [schema.prisma](https://zread.ai/will-aam/Countifly/prisma/schema.prisma#L97-L115)

## Arquitetura de Componentes
O módulo colaborativo está organizado em quatro componentes rigidamente coordenados em components/inventory/team/:

```
components/inventory/team/
```


```
TeamManagerView
```


```
userId
```


```
ManagerSessionDashboard
```


```
activeSession
```


```
onCreateSession
```


```
onEndSession
```


```
pendingCheck
```


```
TeamImportTab
```


```
ImportUploadSection
```


```
sessionId
```


```
products
```


```
onImportSuccess
```

Um padrão de arquitetura crítico é que a ParticipantView é reaproveitada tanto para participantes externos quanto para o gerente agindo como um contador. Quando o gerente clica em "Contar Agora", handleJoinAsParticipant chama internamente /api/session/join com o próprio código de acesso da sessão, armazena os dados resultantes do participante no estado e renderiza a mesma ParticipantView — demonstrando que a interface de contagem do participante é agnóstica de função por concepção.

```
ParticipantView
```


```
handleJoinAsParticipant
```


```
/api/session/join
```


```
ParticipantView
```

Fontes: [TeamManagerView.tsx](https://zread.ai/will-aam/Countifly/components/inventory/team/TeamManagerView.tsx#L158-L180)

## Mapa de Rotas de API
O sistema de sessão colaborativa abrange dois grupos de rotas com modelos de autenticação distintos:
O modelo de autenticação dual é significativo: rotas do gerente usam getAuthPayload() baseado em JWT (como no resto do aplicativo), enquanto as rotas de participante extraem credenciais de cabeçalhos personalizados. Essa separação permite que dispositivos não autenticados ingressem em sessões de contagem sem exigir uma conta de usuário completa.

```
getAuthPayload()
```

Fontes: [sessions/route.ts](https://zread.ai/will-aam/Countifly/app/api/sessions/route.ts#L33-L37), [sync/route.ts](https://zread.ai/will-aam/Countifly/app/api/session/%5BsessionId%5D/sync/route.ts#L62-L66), [leave/route.ts](https://zread.ai/will-aam/Countifly/app/api/session/%5BsessionId%5D/participant/%5BparticipantId%5D/leave/route.ts#L11-L14)

## Segurança e Limitação de Taxa
O sistema colaborativo introduz vários controles de segurança além da camada básica de autenticação. O endpoint de ingresso (join) utiliza validação do Zod com listagem estrita de caracteres (somente [A-Z0-9]+ permitidos em códigos de sessão), um atraso forçado (tarpit delay) de 2 segundos para falhas a fim de retardar ataques de enumeração, e um limite fixo de 10 participantes por sessão. O endpoint de sincronização valida todos os movimentos através do MovementSchema, impondo formato UUID nos IDs gerados pelo cliente, validação regex em códigos de barras e restrições de número inteiro para quantidades. Ambas as rotas de join e sync estão integradas ao middleware withRateLimit() para proteção adicional contra ataques DDoS.

```
[A-Z0-9]+
```


```
MovementSchema
```


```
withRateLimit()
```

Fontes: [join/route.ts](https://zread.ai/will-aam/Countifly/app/api/session/join/route.ts#L22-L53), [sync/route.ts](https://zread.ai/will-aam/Countifly/app/api/session/%5BsessionId%5D/sync/route.ts#L26-L54)

## Onde Ir a Seguir
Tendo compreendido a arquitetura de sessões colaborativas, você pode explorar os sistemas de apoio que as tornam possíveis:
- [Mecanismo de Fila de Sincronização](https://zread.ai/9-sync-queue-mechanism) — Mergulho profundo na fila offline que impulsiona a sincronização dos movimentos dos participantes
- [Mecanismo de Leitura de Código de Barras](https://zread.ai/7-barcode-scanner-engine) — O componente de leitura por câmera usado por todas as visualizações dos participantes
- [Autenticação e Segurança](https://zread.ai/12-authentication-and-security) — O modelo de autenticação duplo via JWT/token e a infraestrutura de limitação de taxa
- [Hooks Personalizados do React](https://zread.ai/18-custom-react-hooks) — Incluindo useParticipantInventory e useSyncQueue, que orquestram a experiência de contagem
- [Design do Esquema do Banco de Dados](https://zread.ai/10-database-schema-design) — Referência completa do esquema, abrangendo os modelos de sessão e participante
[Mecanismo de Fila de Sincronização](https://zread.ai/9-sync-queue-mechanism)
[Mecanismo de Leitura de Código de Barras](https://zread.ai/7-barcode-scanner-engine)
[Autenticação e Segurança](https://zread.ai/12-authentication-and-security)
[Hooks Personalizados do React](https://zread.ai/18-custom-react-hooks)

```
useParticipantInventory
```


```
useSyncQueue
```

[Design do Esquema do Banco de Dados](https://zread.ai/10-database-schema-design)

```
onClearImport
```


```
ParticipantView
```


```
sessionData
```


```
onLogout
```
