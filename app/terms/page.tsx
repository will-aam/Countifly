import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o início
        </Link>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Termos e Condições de Uso</h1>
          <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar a plataforma Countifly, você concorda em cumprir e ficar vinculado a estes Termos e Condições. Caso não concorde com qualquer parte destes termos, você não deverá utilizar nossos serviços. O acesso à plataforma constitui a aceitação explícita das regras estabelecidas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Descrição do Serviço</h2>
            <p>
              O Countifly é um sistema B2B e B2C de auditoria e contagem de estoque que permite aos usuários gerenciar empresas, sessões de contagem (individuais ou em tempo real/multiplayer), produtos, códigos de barras e sincronizar o progresso de estoque da sua loja física. Futuramente, nossa plataforma oferecerá suporte para integração e sincronização direta com sistemas ERP de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Contas de Usuários e Empresas</h2>
            <p>
              Para utilizar o sistema, é necessário criar uma conta informando dados válidos, como e-mail, nome e dados da empresa (incluindo Razão Social e CNPJ, quando aplicável). O usuário é o único responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrerem sob sua conta. Contas inativas podem ser suspensas ou encerradas conforme política de retenção.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Integração com Sistemas ERP</h2>
            <p>
              O Countifly é preparado para conectar-se de forma inteligente a sistemas ERP. Ao ativar essa funcionalidade futuramente, o usuário autoriza o Countifly a ler, importar e exportar dados de produtos, saldos de estoque e relatórios de contagens entre a nossa plataforma e seu ERP. Atuaremos exclusivamente como um processador de dados para viabilizar a auditoria do seu estoque.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Base Global de Produtos e Propriedade</h2>
            <p>
              Nosso serviço utiliza uma "Base Global" de produtos com EAN (códigos de barras) para acelerar a leitura e o preenchimento automático das suas contagens. As informações cadastrais e públicas dos produtos nessa base são comunitárias e não pertencem aos usuários individuais.
            </p>
            <p className="mt-2">
              No entanto, as <strong>movimentações financeiras, relatórios de auditoria, saldos em estoque, CNPJs e dados comerciais</strong> da sua empresa são estritamente confidenciais e de sua exclusiva propriedade intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Limitação de Responsabilidade</h2>
            <p>
              O Countifly envida seus melhores esforços para garantir a precisão e estabilidade do sistema. Entretanto, não nos responsabilizamos por perdas financeiras diretas ou indiretas decorrentes de falhas de sincronização na sua rede, erros operacionais na hora de realizar a contagem no estoque físico, ou inconsistências nos dados enviados pelo usuário ou por integrações de ERPs de terceiros.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
