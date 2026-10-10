import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o início
        </Link>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Política de Privacidade</h1>
          <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Coleta de Dados Pessoais e Cadastrais</h2>
            <p>
              O Countifly leva a sua privacidade a sério. Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), nós coletamos e processamos apenas as informações que são estritamente necessárias para a prestação do serviço contratado. Isso inclui:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4 text-zinc-700 dark:text-zinc-300">
              <li><strong>Dados de Conta:</strong> E-mail de cadastro, senha (armazenada de forma irreversível com criptografia de ponta) e nome de exibição.</li>
              <li><strong>Dados Corporativos:</strong> Nome fantasia, razão social, CNPJ e configurações operacionais, fundamentais para geração dos relatórios de auditoria e validação da empresa.</li>
              <li><strong>Dados de Uso e Sessão:</strong> Nomes dos participantes em sessões de contagem (para fins de multiplayer e histórico de colaboração), logs de movimentação de produtos e leitura de códigos de barras nas lojas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Dados de Estoque e Integração com ERP</h2>
            <p>
              As suas informações relativas a produtos de catálogo fechado, saldos em estoque, movimentações financeiras e histórico de contagens não são comercializadas de nenhuma maneira.
            </p>
            <p className="mt-2">
              Com as integrações com serviços de <strong>ERP</strong>, seus dados operacionais poderão fluir de forma automatizada entre o Countifly e o seu ERP, sob sua solicitação e configuração prévia. Atuamos unicamente como uma via processadora, garantindo total sigilo de suas transações comerciais durante o trânsito dos dados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Compartilhamento de Informações com Terceiros</h2>
            <p>
              Não vendemos, trocamos ou alugamos suas informações corporativas, dados de produtos ou informações de clientes. O compartilhamento ocorre apenas com prestadores de serviços essenciais de infraestrutura tecnológica (como provedores de hospedagem em nuvem e bancos de dados) que são estritamente necessários para manter o sistema Countifly no ar e operante, sob rígidos acordos de confidencialidade (NDA).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Segurança dos Dados</h2>
            <p>
              Implementamos práticas de segurança rigorosas no mercado. Utilizamos tecnologias de proteção e autenticação para garantir que suas sessões de auditoria (Sessões Individuais ou Multiplayer) sejam criptografadas e isoladas no banco de dados. Os resultados e o acesso a um inventário em andamento só podem ser visualizados por usuários e colaboradores que possuam o código de convite ou acesso logado na plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Seus Direitos enquanto Titular (LGPD)</h2>
            <p>
              Conforme a LGPD, garantimos a você o pleno controle sobre suas informações. Você tem o direito de:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4 text-zinc-700 dark:text-zinc-300">
              <li>Solicitar o acesso, correção e portabilidade dos seus dados de conta e exportar os CSVs e backups de contagens;</li>
              <li>Solicitar a exclusão definitiva da sua empresa e do seu cadastro pessoal, o que resultará na deleção irrecuperável de relatórios de contagem, integrações ERP configuradas e históricos da sua conta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Consentimento</h2>
            <p>
              Ao realizar o seu login, registrar uma conta de Gestor/Colaborador ou acessar nossos serviços, você declara estar ciente e concorda explicitamente com esta Política de Privacidade e com o processamento dos dados descritos acima para a viabilização da ferramenta de auditoria Countifly.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
