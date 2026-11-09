# Planejamento financeiro (casal)

App web estático (HTML + JavaScript puro, sem build) para projetar e gerenciar as finanças de um casal: fatura do cartão, despesas fora do cartão, rendas e FGTS até dez/2028. Funciona como PWA e roda no GitHub Pages. Os dados ficam no Supabase, protegidos por login e RLS.

## Arquitetura

| Parte | Descrição |
|---|---|
| `index.html`, `style.css`, `app.js` | Interface e toda a lógica (sem framework) |
| `lib/` | Chart.js, SheetJS (xlsx) e supabase-js, locais |
| `config.js` | URL do Supabase e chave `publishable` (pode ser pública) |
| `supabase.sql` | Tabela `household` e policies de RLS |
| `sw.js`, `manifest.webmanifest` | PWA e cache (service worker network-first) |
| `data.js` | Seed local com dados pessoais. **Está no `.gitignore`; nunca versionar** |

Os dados ficam em uma única linha (`household`, `id=1`, coluna `data` em JSON). O navegador guarda uma cópia em `localStorage` e sincroniza com o Supabase.

## Configuração

1. Crie um projeto no Supabase.
2. Em **SQL Editor**, rode `supabase.sql` trocando os e-mails de exemplo pelos do casal.
3. Em **Authentication**, crie as duas contas, deixe **Confirm email** ligado e desative **Allow new users to sign up**.
4. Preencha `config.js` com a URL do projeto e a chave `publishable`. Nunca use a chave `secret` ou `service_role`.
5. Publique no GitHub Pages (branch `main`, raiz).

Teste local: abra `index.html` no navegador. Depois de publicar, atualize com Cmd+Shift+R.

## Abas

**Principais**
- **Visão geral:** série nov/26–dez/28, resumo anual, tabela mensal, KPIs e exportação para xlsx.
- **Visão mensal:** mês a mês (◀ ▶), com itens, divisão por pessoa, categorias e itens fora do cartão. Mostra o rateio %.
- **Fluxo de caixa:** renda de cada um, cartão, fora do cartão, sobra, saldo em conta, FGTS por pessoa e patrimônio.
- **Cartão:** orçamento comprometido (parcelas, fixas, assinaturas) e variáveis estimadas.
- **Lançamentos:** itens da fatura, com categoria e responsável.
- **Importar:** upload da fatura Itaú (xlsx "fatura aberta").
- **Histórico:** faturas anteriores.
- **Fora do cartão:** rendas e despesas por categoria (Moradia, Transporte, Impostos, Saúde, Educação, Seguros, Lazer, Outros). Cada item tem frequência (mensal/anual), início, fim, nº de parcelas e reajuste % a.a.
- **Premissas:** mês base, horizonte e backup/reset.

**Extras (separados; não alteram as abas principais)**
- **Metas:** limite mensal por categoria, com barra de uso e alerta.
- **Planos:** reserva de emergência, investimentos, saques do FGTS e compras planejadas, com gráfico de patrimônio.
- **Cenários:** simula renda, reajuste de moradia, variáveis, despesa extra e quitação de item. Compara com a base sem alterar os dados.

## Fluxo mensal

1. Baixe a fatura no app do Itaú e use **Importar**.
2. Os lançamentos entram **pendentes**: não contam nos cálculos até serem validados.
3. Revise categoria e responsável (Cristian, Pedro ou Conjunto). Confirme com ✓ ou "Confirmar todos".
4. As regras de categorização são aprendidas e aplicadas às próximas faturas, que continuam pendentes até a validação.
5. A data da última atualização e da última importação aparece no cabeçalho.

## Regras de cálculo

- Só entram nos cálculos itens ativos, validados e com tipo diferente de `ignorar`.
- Tipos: parcelada, fixa, assinatura mensal, assinatura anual, variável, ignorar.
- Mês 0 é a fatura real do mês base. Nos meses seguintes: parcelas enquanto k ≤ total − atual, fixas até o `fim`, anuais a cada 12 meses (a partir de qualquer fatura em que apareceram, até o `fim`) e variáveis pela estimativa.
- Itens "Conjunto" são divididos pelo rateio %. O padrão é 50/50.
- Itens fora do cartão anuais cobram só no mês de início de cada ano. O reajuste é aplicado a cada 12 meses.

## Segurança

- O repositório público contém só código. Os dados ficam no Supabase.
- RLS ativo, com policies de leitura, inserção e atualização limitadas aos dois e-mails. Não há policy de DELETE.
- Cadastro público desativado e confirmação de e-mail ligada.
- Recomendado: 2FA no GitHub e no Supabase, backups periódicos em Premissas e logout em aparelhos compartilhados.

## Pendências e premissas em aberto

- Saldo inicial, saldo e depósito do FGTS, IPVA e valores de metas ainda precisam ser preenchidos.
- Parcelas do carro (R$ 2.378,59 a partir de jan/27) estão sem data de fim. Preencha "Parcelas".
- A estimativa de variáveis usa os totais de outubro.
