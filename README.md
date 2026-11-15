# Planejamento Financeiro (Cristian & Pedro)

Central de gestão financeira e planejamento futuro do casal (HTML + CSS + JavaScript puro, sem etapa de build): fatura do cartão Itaú, extrato bancário/Pix, despesas e receitas fora do cartão, rateio inteligente, central de contas a vencer, projetos de vida, simuladores e dossiê anual de IRPF. Funciona como **PWA** (instalável no celular e desktop, com modo claro/escuro e navegação dedicada para mobile) e roda no **GitHub Pages**, com sincronização em nuvem via **Supabase** protegida por login e Row Level Security (RLS).

> **Novo no portal (ou enviando para o Pedro)?** Consulte o **[Guia Rápido de Uso (`GUIA_DE_USO.md`)](GUIA_DE_USO.md)** — manual em linguagem simples com passo a passo para celular, regra de divisão, rotina mensal, mapa de abas e perguntas frequentes — ou clique diretamente em **`❓ Guia`** dentro do próprio aplicativo.

---

## Arquitetura e Organização do Projeto

| Arquivo / Pasta | Descrição |
|---|---|
| `index.html`, `style.css`, `app.js` | Interface responsiva (desktop + mobile bottom-nav, claro/escuro), motor de projeção e toda a lógica (sem framework) |
| `GUIA_DE_USO.md` | Manual prático de usabilidade para usuários finais (focado em uso diário e onboarding do Pedro) |
| `lib/` | Chart.js, SheetJS (`xlsx`) e `supabase-js` empacotados localmente (zero dependências CDN em runtime) |
| `config.js` | URL do Supabase e chave `publishable` / `anon` (pública, protegida por RLS) |
| `supabase.sql` | Criação da tabela `household` (`id = 1`) e policies de RLS para os dois e-mails |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | PWA e cache offline (`fin-v13`, estratégia network-first com atualização imediata) |
| `data.js` | Seed local opcional com dados pessoais. **Está no `.gitignore`; nunca versionar** |

### Estrutura do Documento em Nuvem (`household.data` JSONB)

Os dados ficam em uma única linha (`household`, `id = 1`, coluna `data` em JSONB). O navegador mantém cópia em `localStorage` (`pf_v1`), sincroniza automaticamente com o Supabase (com detecção de conflitos de edição simultânea) e guarda até **5 pontos de restauração locais** antes de operações críticas:

- `tx[]` — Lançamentos de cartão e extrato importados/manuais (`id`, `data`, `desc`, `valor`, `tipo`, `cat`, `quem`, `fatura`, `cur`, `tot`, `fim`, `ativo`, `rev`);
- `off[]` — Receitas e contas fora do cartão (`nome`, `quem`, `kind`, `valor`, `venc`, `inicio`, `fim`, `freq`, `reaj`, `np`, `cat`);
- `settings` — Mês base (`base`), horizonte (`horizon`, `flowEnd`), saldo inicial, FGTS, reserva de emergência, investimentos, saques FGTS e estimativas futuras opcionais (`varItems`, `includeVar`);
- `rules` — Regras memorizadas por estabelecimento (`key(desc)` → `quem`, `tipo`, `cat`, `fim`);
- `paid` — Status mensal de contas pagas, fatura e registro de acerto (`paid[ym][id|fatura|acerto]`);
- `extras` — Módulos estendidos: `metas`, `projetos`, `cen` (fluxo), `amort`, `fire`, `closedMonths` (fechamentos oficiais congelados `🔒`), `pixSettlements` (comprovantes/E2E para IRPF), `pixConfig`, `irpf` (classificação Reembolso vs Doação e saldos 31/12) e `auditLog` (últimos 300 eventos);
- `meta` — Metadados de última importação e última atualização (`updatedAt`, `updatedBy`).

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
- **Visão geral:** projeção mês a mês, resumo anual, gráficos de evolução (renda × despesas e saldo acumulado), KPIs separando claramente **Despesas Individuais (Cristian / Pedro)** e **Despesas Conjuntas (sempre 50/50)**, **Central de Contas a Vencer** (alerta automático de contas vencidas ou vencendo em até 5 dias), e exportação para `.xlsx`.
- **Visão mensal:** detalhamento de qualquer mês (`◀ ▶`), com separação explícita entre **Despesas Individuais (100% da pessoa)** e **Despesas Conjuntas (divididas 50/50)**, resumo de pagamento por pessoa (Cartão + Fora do Cartão), **Fechamento Oficial ("Encerrar Mês / Congelar DRE")** que preserva uma cópia imutável dos números fechados no histórico e no Dossiê IRPF, **Card de Acerto Mensal para WhatsApp & Pix Copia e Cola** (mensagem formatada com detalhamento, cópia da chave Pix e geração do BR Code EMV no valor exato), **registro de liquidação Pix do acerto** (data, valor transferido e código E2E/comprovante ao marcar `Acerto ok ✓`), **Ritmo de Gastos Diário (Burn-rate no Mês)** com barra de consumo vs dias decorridos e limite diário disponível para Casal/Cristian/Pedro, categorias do cartão e checklist de contas fora do cartão com alertas de vencimento.
- **Fluxo de caixa:** renda individual, cartão (Individual + 50% Conjunto), despesas fora do cartão (Individual + 50% Conjunto), investimentos planejados, sobra mensal, saldo em conta acumulado, FGTS individual (com rendimento de 3% a.a. + depósitos + saques) e patrimônio total.

### 2. Cartão & Contas
- **Importar / Revisar:**
  1. **Fatura do Cartão Itaú (.xlsx):** upload ou *drag-and-drop* com leitura automática do **Nome do portador** e **Final do cartão**, detecção de duplicados (`Mesclar apenas novos` ou `Substituir fatura`), revisão individual (`✓`) ou em lote, e **Gerenciador de Regras Memorizadas** (`IFD*`, `UBER*`, `MP*`, `PAG*`).
  2. **Extrato Bancário / Pix (.ofx ou .csv — Itaú / Nubank / Inter):** importação direta de gastos no Pix, débito e boletos com detecção automática de duplicados e desmarcação de linhas de "Pagamento de fatura" para evitar dupla contagem.
- **Cartão:** orçamento comprometido (parcelas, fixas, assinaturas) e seção **Estimativas de gastos futuros (lançadas manualmente)** para cadastrar estimativas opcionais como *Gasolina*, *Alimentação fora*, *Mercado*, etc., escolhendo se cada estimativa é individual (`Cristian` ou `Pedro`) ou `Conjunto (50/50)`.
- **Lançamentos:** tabela completa de transações das faturas com cards de soma separando **Individuais Cristian**, **Individuais Pedro**, **Conjuntas (100%)** e **Total pago por cada um (Indiv. + 50% Conj.)**, busca, filtros, primeira coluna fixa (`sticky`) e **ações em lote**.
- **Fora do cartão:** rendas e despesas fixas/anuais separando claramente contas **Individuais (100%)** e contas **Conjuntas (50/50, como Aluguel e Carro)**. Inclui:
  - **Central de Contas a Vencer & Linha do Tempo Semanal** com alerta visual para contas vencidas ou que vencem nos próximos 5 dias, organização semanal (*Esta semana*, *Próxima semana*, *Mais adiante no mês*) e botão rápido **"✓ Marcar pago"**;
  - Checkbox **"Pago"** por mês de referência (`S.paid[ym]`) e card de progresso de contas quitadas;
  - Campo **Vencimento (dia 1–31)** com ordenação automática por dia;
  - Frequência (`Mensal` / `Anual`), início, fim, nº de parcelas e reajuste `% a.a.`.
- **Histórico:** três sub-visões integradas:
  - **Faturas & Categorias:** comparativo de faturas fechadas separando gastos individuais de Cristian, individuais de Pedro, Conjuntas (100%) e 50% Conjunto de cada um (respeitando meses oficialmente encerrados `🔒`);
  - **Inflação Pessoal & Comparativo Anual:** variação em `%` e `R$/mês` por categoria entre dois anos selecionados + **custo médio por dia** do casal e gráfico agrupado;
  - **Auditoria & Linha do Tempo:** histórico transparente das ações do casal (importações, validações, fechamentos oficiais, pagamentos e registros de Pix), com busca e filtro por usuário.

### 3. Futuro & Config
- **Projetos de Vida:** cards para grandes conquistas do casal (**🏠 Compra de Imóvel com FGTS conjunto**, **🚗 Carro / Veículo**, **✈️ Viagens / Férias** e outros), com barra de progresso, previsão de mês de conclusão (ETA), referência estimada de financiamento do saldo restante e integração opcional nas projeções globais (`Visão geral`, `Fluxo de caixa` e `Patrimônio`).
- **Metas & Reserva:**
  - *Metas mensais por categoria* (cartão + fora do cartão) com barra de uso e alertas em 80% e 100%;
  - *Reserva de Emergência* com cobertura em meses de custo fixo ou despesa total e progresso visual.
- **Investimentos & FGTS:** aportes mensais programados com juros compostos (`% a.m.`), saques planejados do FGTS (para caixa ou investimento), compras futuras parceladas e gráfico de evolução do patrimônio (Conta + FGTS + Investimentos + Projetos).
- **Simuladores (Cenários):** três ferramentas estratégicas sem alterar dados reais:
  - **Cenários de Fluxo:** variações de renda (`%`), moradia (`%`), variáveis (`%`), despesa extra e encerramento antecipado de conta;
  - **Quitação & Amortização:** simula usar aporte extra ou FGTS para reduzir prazo ou parcela de contratos/financiamentos, mostrando juros economizados, meses antecipados e curva do saldo devedor;
  - **Independência Financeira (FIRE):** calcula patrimônio-alvo pela taxa de retirada segura (Regra dos 4%), % atingido hoje, renda passiva atual e previsão de ano/idade da liberdade financeira.
- **Dossiê IRPF:** módulo de conciliação fiscal anual (Decred / e-Financeira) com seletor de ano-calendário, tabela mensal comparando despesas no CPF de Cristian vs parte de Pedro vs Pix transferidos, classificação fiscal (**Reembolso/Rateio** vs **Doação** com alerta de teto estadual de ITCMD), texto pronto para copiar e colar no programa da Receita Federal, deduções de Saúde e Educação separadas por CPF (distinguindo farmácia não dedutível), **saldos em 31/12 (contas, FGTS e investimentos)** com preenchimento assistido pelo fluxo, lista de **bens e parcelamentos no ano**, impressão/PDF e exportação em `.xlsx`.
- **Premissas:** mês base da fatura atual, horizonte de projeção do cartão, guia de atalhos de teclado, exportação/importação de backup `.json` e **Pontos de Restauração Automáticos** (últimos 5 snapshots).

---

## Horizonte de Projeção Dinâmico

- Por padrão, **Fluxo de Caixa**, **Visão Geral** e **Visão Mensal** projetam sempre do **mês base** até **dezembro do ano seguinte ao mês base** (`nextYearDec()`, ex.: se a base está em `2026`, projeta até `dez/27`; quando a base avançar para `2027`, projeta até `dez/28`).
- No topo dessas abas, o seletor **"Projetar até"** permite alternar rapidamente o horizonte para `+12 meses`, `fim do ano atual` ou anos posteriores (`dez/28`, `dez/29`).

---

## Regras de Cálculo e Rateio

- **Validação:** somente entram nos cálculos lançamentos ativos (`ativo = true`), validados (`rev = false`) e com tipo diferente de `ignorar`.
- **QuintoAndar na fatura do cartão:** mantido normalmente na fatura do cartão como despesa individual de **Pedro** (`quem = 'Pedro'`, `tipo = 'fixa'`, `cat = 'Moradia'`).
- **Separação Individual vs Conjunto (50/50 fixo):**
  - **Despesas Individuais (`Cristian` ou `Pedro`):** 100% atribuídas ao respectivo titular (tanto na fatura do cartão quanto fora do cartão).
  - **Despesas Conjuntas (`Conjunto`, como Aluguel e Carro):** **todas** as despesas conjuntas são divididas **50% Cristian / 50% Pedro** (meio a meio), sem exceção.
- **Sem simulação automática de variáveis:**
  - **Mês atual (`ym <= base`):** mostra exatamente os lançamentos reais da fatura atual (parcelas, fixas, assinaturas e variáveis já lançadas no mês) + contas fora do cartão.
  - **Meses futuros (`ym > base`):** projeta apenas despesas já programadas (`parcelada`, `fixa`, `assinatura_mensal`, `assinatura_anual` e `fora do cartão`). Não há simulação automática de gastos variáveis.
- **Estimativas de gastos futuros (opcionais e manuais):**
  - Caso queira incluir estimativas em meses futuros (ex.: *Gasolina*, *Alimentação fora*, *Mercado*, etc.), basta lançá-las na aba **Cartão** (ou pelo botão rápido `+ Lançamento` → **Estimativa futura**), escolhendo se o item é `Cristian` (Individual 100%), `Pedro` (Individual 100%) ou `Conjunto` (50/50), o valor mensal, o mês de início e o mês final opcional.

---

## Usabilidade, Mobile, Onboarding e Atalhos

- **Onboarding & Guia Integrado (`❓ Guia`):**
  - Banner de boas-vindas na primeira visita (`pf-onboard-seen`), barra contextual de 1 linha (`💡`) explicando o propósito de cada aba e botão **`❓ Guia`** no cabeçalho, barra mobile e aba *Premissas* abrindo o **Guia Rápido Interativo** (Regra de Ouro 100% × 50/50, rotina em 4 passos, mapa clicável das abas e instruções de instalação no iPhone/Android).
  - Para usuários finais (especialmente o Pedro), consulte também [`GUIA_DE_USO.md`](GUIA_DE_USO.md).
- **Navegação sem deslize (Desktop & Mobile):**
  - Cabeçalho compacto de **1 única linha** (~50px), liberando área útil vertical sem empilhar abas nem exigir rolagem horizontal;
  - No desktop (`>= 1024px`), barra lateral esquerda com as 14 seções agrupadas e botão `☰` para recolher/expandir quando desejar largura máxima nas tabelas;
  - No mobile/tablet (`< 1024px`), gaveta lateral deslizante (`☰` no topo ou `Menu` no rodapé) + barra inferior fixa (`#mob-nav`: *Geral*, *Mês/Pix*, *Contas*, *Projetos* e *Menu*) + barra de resumo rápido (`Mês base`, `Fatura atual`, `Sobra mês` e `Parte Pedro ▸` clicável);
  - Layout fluido sem overflow horizontal em telas de `375px`, campos com `font-size: 16px` (evita zoom automático no iOS Safari) e respeito às áreas seguras (`env(safe-area-inset-bottom)`).
- **Botão Flutuante (`+ Lançamento`)**: no canto inferior direito (mobile e desktop) para lançar rapidamente uma despesa de **Cartão**, **Fora do Cartão** ou **Estimativa futura** em poucos segundos.
- **Modo Escuro (`🌙 Escuro` / `☀️ Claro`)**: alternância imediata no cabeçalho (sincronizando `<meta name="theme-color">`), com persistência em `localStorage` (`pf-theme`).
- **Atalhos de Teclado**:
  - `Alt + N`: abrir modal de novo lançamento rápido;
  - `Alt + T`: alternar entre modo claro e modo escuro;
  - `Esc`: fechar modal rápido/guia ou limpar seleção em lote nas tabelas.

---

## Segurança e Confiabilidade

- **Segurança:** repositório sem dados sensíveis (`data.js` ignorado no Git); autenticação via Supabase Auth e políticas RLS restritas aos dois e-mails autorizados (sem política de `DELETE`).
- **Prevenção de Conflitos:** antes de salvar na nuvem (`push()`), o app verifica o `updated_at` remoto. Caso outro dispositivo tenha salvo alterações mais recentes, avisa o usuário, cria um ponto de restauração automático da versão local e permite escolher entre manter a edição atual ou recarregar a versão da nuvem.
