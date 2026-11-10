# Planejamento Financeiro (Cristian & Pedro)

Central de gestão financeira e planejamento futuro do casal (HTML + CSS + JavaScript puro, sem etapa de build): fatura do cartão Itaú, despesas e receitas fora do cartão, rateio inteligente, metas, reserva de emergência, investimentos, FGTS e simulador de cenários. Funciona como **PWA** (instalável no celular e desktop, com modo claro/escuro) e roda no **GitHub Pages**, com sincronização em nuvem via **Supabase** protegida por login e Row Level Security (RLS).

---

## Arquitetura

| Arquivo | Descrição |
|---|---|
| `index.html`, `style.css`, `app.js` | Interface responsiva (claro/escuro), motor de projeção e toda a lógica (sem framework) |
| `lib/` | Chart.js, SheetJS (`xlsx`) e `supabase-js` empacotados localmente |
| `config.js` | URL do Supabase e chave `publishable` / `anon` (pública, protegida por RLS) |
| `supabase.sql` | Criação da tabela `household` (`id = 1`) e policies de RLS para os dois e-mails |
| `sw.js`, `manifest.webmanifest` | PWA e cache offline (`fin-v4`, estratégia network-first com atualização imediata) |
| `data.js` | Seed local opcional com dados pessoais. **Está no `.gitignore`; nunca versionar** |

Os dados ficam em uma única linha (`household`, `id = 1`, coluna `data` em JSONB). O navegador mantém cópia em `localStorage`, sincroniza automaticamente com o Supabase (com detecção de conflitos de edição simultânea) e guarda até **5 pontos de restauração locais** antes de operações críticas.

---

## Configuração Inicial

1. Crie um projeto no **Supabase**.
2. Em **SQL Editor**, execute `supabase.sql` substituindo os e-mails de exemplo pelos e-mails do Cristian e do Pedro.
3. Em **Authentication**, crie as duas contas, mantenha **Confirm email** ativado e desative **Allow new users to sign up**.
4. Preencha `config.js` com `SUPABASE_URL` e `SUPABASE_ANON_KEY` (`publishable`). Nunca utilize a chave `service_role`.
5. Publique no **GitHub Pages** (branch `main`, diretório raiz `/`).

Para atualizar o cache no navegador após um deploy, use `Ctrl + F5` (Windows/Linux) ou `Cmd + Shift + R` (Mac).

---

## Organização das Abas (3 Clusters)

A navegação é dividida em três grupos visuais para facilitar o uso diário:

### 1. Panorama
- **Visão geral:** projeção mês a mês, resumo anual, gráficos de evolução (renda × despesas e saldo acumulado), KPIs com indicadores semânticos e exportação para `.xlsx`.
- **Visão mensal:** detalhamento de qualquer mês (`◀ ▶`), com resumo de acerto entre Cristian e Pedro, botão **"Copiar resumo do acerto"** (formatado para WhatsApp), rateio do Conjunto, categorias do cartão e contas fora do cartão.
- **Fluxo de caixa:** renda individual, cartão, despesas fora do cartão, investimentos planejados, sobra mensal, saldo em conta acumulado, FGTS individual (com rendimento de 3% a.a. + depósitos + saques) e patrimônio total.
- **Histórico:** comparativo de faturas fechadas empilhado por pessoa e detalhamento por categoria.

### 2. Cartão & Contas
- **Importar / Revisar:**
  1. Upload ou *drag-and-drop* da planilha `.xlsx` da fatura do Itaú.
  2. Leitura automática do **Nome do portador** e **Final do cartão** para atribuir a `Cristian` ou `Pedro`.
  3. Detecção de lançamentos duplicados na mesma fatura, permitindo **Mesclar apenas novos** (fatura parcial/aberta) ou **Substituir fatura inteira**.
  4. Revisão individual (`✓`), em lote (barra de seleção múltipla) ou total (**Confirmar todos**).
  5. **Gerenciador de Regras Memorizadas**: limpa prefixos de maquininhas/apps (`IFD*`, `UBER*`, `MP*`, `PAG*`, `PG*`, `GOOGLE*`, `APPLE.COM/BILL`) e permite editar ou excluir regras aprendidas.
- **Cartão:** orçamento comprometido (parcelas, fixas, assinaturas) e estimativa de gastos variáveis (com botão para calcular a **Média dos últimos 3 meses** ou **Usar fatura atual**).
- **Lançamentos:** tabela completa de transações das faturas com busca, filtros por pessoa/fatura/tipo/pendência, primeira coluna fixa (`sticky`) e **ações em lote** (alterar Quem, Tipo, Categoria ou excluir múltiplos itens de uma só vez).
- **Fora do cartão:** rendas e despesas fixas/anuais por categoria (`Moradia`, `Transporte`, `Impostos`, `Saúde`, `Educação`, `Seguros`, `Lazer`, `Outros`). Inclui:
  - Checkbox **"Pago"** por mês de referência (`S.paid[ym]`) e card de progresso de contas quitadas;
  - Campo **Vencimento (dia 1–31)** com ordenação automática por dia;
  - Frequência (`Mensal` / `Anual`), início, fim, nº de parcelas e reajuste `% a.a.`.

### 3. Futuro & Config
- **Metas & Reserva:**
  - *Metas mensais por categoria* (cartão + fora do cartão) com barra de uso e alertas em 80% e 100%;
  - *Reserva de Emergência* com cobertura em meses de custo fixo ou despesa total e progresso visual.
- **Investimentos & FGTS:** aportes mensais programados com juros compostos (`% a.m.`), saques planejados do FGTS (para caixa ou investimento), compras futuras parceladas e gráfico de evolução do patrimônio (Conta + FGTS + Investimentos).
- **Simulador (Cenários):** simula variações de renda (`%`), reajuste de moradia (`%`), redução de variáveis (`%`), despesa extra temporária e quitação antecipada de parcelamento/item sem alterar os dados oficiais.
- **Premissas:** mês base da fatura atual, horizonte de projeção do cartão, guia de atalhos de teclado, exportação/importação de backup `.json` e **Pontos de Restauração Automáticos** (últimos 5 snapshots).

---

## Horizonte de Projeção Dinâmico

- Por padrão, **Fluxo de Caixa**, **Visão Geral** e **Visão Mensal** projetam sempre do **mês base** até **dezembro do ano seguinte ao mês base** (`nextYearDec()`, ex.: se a base está em `2026`, projeta até `dez/27`; quando a base avançar para `2027`, projeta até `dez/28`).
- No topo dessas abas, o seletor **"Projetar até"** permite alternar rapidamente o horizonte para `+12 meses`, `fim do ano atual` ou anos posteriores (`dez/28`, `dez/29`).

---

## Regras de Cálculo e Rateio

- **Validação:** somente entram nos cálculos lançamentos ativos (`ativo = true`), validados (`rev = false`) e com tipo diferente de `ignorar`.
- **Projeção do Cartão:**
  - Mês `0` (`base`): usa os valores reais da fatura atual.
  - Meses `k > 0`:
    - `parcelada`: projeta enquanto $k \le \text{total} - \text{atual}$;
    - `fixa` e `assinatura_mensal`: projeta todos os meses até o mês `fim` (se definido);
    - `assinatura_anual`: projeta a cada 12 meses a partir do mês em que ocorreu na fatura, até `fim`;
    - `variavel`: usa a estimativa mensal configurada por pessoa na aba **Cartão**.
- **Rateio do Conjunto:** itens marcados como `Conjunto` são divididos conforme o percentual configurado (`pctCristian`). É possível alternar com 1 clique entre **50 / 50** e **Proporcional à renda** (calculado automaticamente a partir das receitas ativas de Cristian e Pedro no mês).

---

## Usabilidade, Tema Escuro e Atalhos

- **Botão Flutuante (`+`)**: no canto inferior direito (mobile e desktop) para lançar rapidamente uma despesa de Cartão ou Fora do Cartão em poucos segundos.
- **Modo Escuro (`🌙 Escuro` / `☀️ Claro`)**: alternância imediata no cabeçalho, com persistência em `localStorage` (`fin_theme`).
- **Atalhos de Teclado**:
  - `Alt + N`: abrir modal de novo lançamento rápido;
  - `Alt + T`: alternar entre modo claro e modo escuro;
  - `Esc`: fechar modal rápido ou limpar seleção em lote nas tabelas.

---

## Segurança e Confiabilidade

- **Segurança:** repositório sem dados sensíveis (`data.js` ignorado no Git); autenticação via Supabase Auth e políticas RLS restritas aos dois e-mails autorizados (sem política de `DELETE`).
- **Prevenção de Conflitos:** antes de salvar na nuvem (`push()`), o app verifica o `updated_at` remoto. Caso outro dispositivo tenha salvo alterações mais recentes, avisa o usuário, cria um ponto de restauração automático da versão local e permite escolher entre manter a edição atual ou recarregar a versão da nuvem.
