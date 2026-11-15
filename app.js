'use strict';
const KEY='planejamento-financeiro-v1',SNAP_KEY='planejamento-financeiro-snaps-v1';
const TIPOS={parcelada:'Parcelada',fixa:'Fixa',assinatura_mensal:'Assinatura mensal',assinatura_anual:'Assinatura anual',variavel:'Variável',ignorar:'Ignorar'};
const GROUP={parcelada:'parcelas',fixa:'fixas',assinatura_mensal:'assinaturas',assinatura_anual:'assinaturas',variavel:'variaveis'};
const GLAB={parcelas:'Parcelas',fixas:'Despesas fixas',assinaturas:'Assinaturas',variaveis:'Variáveis / Opcionais'};
const GCOL={parcelas:'#0e6b7c',fixas:'#f08c00',assinaturas:'#9775fa',variaveis:'#ced4da'};
const PEOPLE=['Cristian','Pedro','Conjunto'];
const MN=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DEFAULT_VAR_ITEMS=[
  {id:1,ativo:false,nome:'Gasolina / Combustível',quem:'Conjunto',cat:'Transporte',valor:0,fim:null},
  {id:2,ativo:false,nome:'Jantar fora / Restaurantes',quem:'Conjunto',cat:'Alimentação',valor:0,fim:null},
  {id:3,ativo:false,nome:'Mercado / Feira',quem:'Conjunto',cat:'Mercado',valor:0,fim:null},
  {id:4,ativo:false,nome:'Delivery / iFood',quem:'Conjunto',cat:'Alimentação',valor:0,fim:null},
  {id:5,ativo:false,nome:'Farmácia / Saúde',quem:'Conjunto',cat:'Saúde',valor:0,fim:null},
  {id:6,ativo:false,nome:'Lazer / Passeios',quem:'Conjunto',cat:'Lazer',valor:0,fim:null}
];

const EMPTY={tx:[],off:[],settings:{pctCristian:50,horizon:14,base:new Date().toISOString().slice(0,7),includeVar:true,varAmt:{Cristian:0,Pedro:0,Conjunto:0},varItems:[],saldoIni:{Cristian:0,Pedro:0},faturaOficial:0}};
const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const key=d=>{
  const b=norm(d).replace(/parcela\s*\d+\s*de\s*\d+/g,'').trim();
  const s=b.replace(/^(?:ifd|ifood|uber(?:\s*\*?\s*(?:trip|eats))?|mp|mercadopago|pag|pagseguro|picpay|ebw|ec|htm|dl|paypal|stone|sumup|zp|bck)\s*[\*\-\.\s]+/,'').replace(/[^a-z0-9]/g,'').slice(0,22);
  return s||b.replace(/[^a-z0-9]/g,'').slice(0,22);
};
function splitCasa(d){const o=d.off||[],i=o.findIndex(x=>x.nome==='Aluguel+taxas+IPTU+seguro (casa nova)');if(i<0)return;const b=o[i];let id=Math.max(0,...o.map(x=>x.id))+1;
 const p=(nome,valor)=>({...b,id:id++,nome:nome+' (casa nova)',valor});
 o.splice(i,1,p('Aluguel',2158.18),p('Taxa de serviço',55.90),p('IPTU',161.77),p('Seguro incêndio',28.73))}
function mig(d){
  splitCasa(d);d.rules=d.rules||{};d.meta=d.meta||{};d.paid=d.paid||{};
  {const e=d.extras=d.extras||{};e.metas=e.metas||{};e.reserva=e.reserva||{meta:0,saldo:0,aporte:0,rend:0.8};e.inv=e.inv||[];e.saques=e.saques||[];e.compras=e.compras||[];e.cen=e.cen||{moradiaPct:0,rendaPct:0,varPct:0,extra:0,extraDe:'',quitarId:'',quitarMes:''};
    e.acertoPix=e.acertoPix||{};
    e.irpf=Object.assign({cristianNome:'Cristian',cristianCpf:'',pedroNome:'Pedro',pedroCpf:'',modo:'reembolso',uf:'SP',itcmdTeto:'',includeOffInCristian:true,useCalcIfNoPix:true,includeProjHealth:false,saldosAno:{}},e.irpf||{});
    e.irpf.saldosAno=e.irpf.saldosAno||{};
    e.irpfBenef=e.irpfBenef||{};
    e.closedMonths=e.closedMonths||{};
    e.pixConfig=Object.assign({chave:'',titular:'Cristian',cidade:'SAO PAULO'},e.pixConfig||{});
    e.projetos=Array.isArray(e.projetos)?e.projetos:[];
    e.auditLog=Array.isArray(e.auditLog)?e.auditLog:[];
    e.amort=Object.assign({offId:'',nome:'Financiamento / Dívida',saldo:120000,pmt:2400,meses:72,jurosMes:0.85,aporteExtra:15000,modo:'prazo'},e.amort||{});
    e.fire=Object.assign({gastoMensal:0,aporteMensal:0,patrimonioAtual:'',incluirFgts:true,rendRealAnual:5.5,swr:4.0,idadeAtual:32},e.fire||{});
  }
  const st=d.settings;
  st.pctCristian=50;
  st.fgts=st.fgts||{Cristian:{ini:0,dep:0},Pedro:{ini:0,dep:0}};
  if(st.fgtsRate==null)st.fgtsRate=0.25;
  if(!Array.isArray(st.varItems))st.varItems=[];
  else st.varItems=st.varItems.filter(v=>v&&v.nome);
  d.off.forEach(o=>{if(!o.freq)o.freq='mensal'});
  d.tx.forEach(x=>{
    if(!x.fatura)x.fatura=d.settings.base;
    if(/quintoandar/i.test(x.desc)){
      x.quem='Pedro';
      x.ativo=true;
      if(x.tipo==='ignorar')x.tipo=x.tot?'parcelada':'fixa';
      if(!x.cat||x.cat==='Sem categoria')x.cat='Moradia';
    }
  });
  if(d.rulesV!==6){
    st.pctCristian=50;
    st.varAmt={Cristian:0,Pedro:0,Conjunto:0};
    st.includeVar=true;
    st.varItems=(st.varItems||[]).filter(v=>v.valor>0);
    d.off.forEach(o=>{
      if(o.kind==='receita')return;
      if(/quintoandar/i.test(o.nome))o.quem='Pedro';
      else if(/aluguel|casa nova|iptu|taxa de serv|seguro inc|condom|carro|ipva|seguro auto|financiamento/i.test(o.nome))o.quem='Conjunto';
    });
    d.rules={};d.rulesV=6;learn(d,d.tx);
  }
  Object.entries(d.rules).forEach(([k,r])=>{
    if(k.includes('quintoandar')||/quintoandar/i.test(r.exemplo||'')){
      r.quem='Pedro';
      if(r.tipo==='ignorar')r.tipo='fixa';
      if(!r.cat||r.cat==='Sem categoria')r.cat='Moradia';
    }
  });
  return d;
}
const EST_PRESETS=[
  {nome:'Gasolina',cat:'Transporte',quem:'Conjunto'},
  {nome:'Alimentação fora',cat:'Alimentação',quem:'Conjunto'},
  {nome:'Mercado',cat:'Mercado',quem:'Conjunto'},
  {nome:'Delivery / iFood',cat:'Alimentação',quem:'Conjunto'},
  {nome:'Farmácia',cat:'Saúde',quem:'Conjunto'},
  {nome:'Lazer',cat:'Lazer',quem:'Conjunto'}
];
const ITCMD_UFS={
  SP:{nome:'São Paulo (SP)',teto:96050,aliq:'4%',regra:'2.500 UFESPs/ano civil (UFESP 2026 = R$ 38,42)'},
  RJ:{nome:'Rio de Janeiro (RJ)',teto:55804.5,aliq:'4% a 8%',regra:'11.250 UFIR-RJ/ano em dinheiro (UFIR 2026 = R$ 4,9604)'},
  MG:{nome:'Minas Gerais (MG)',teto:57899,aliq:'5%',regra:'10.000 UFEMGs em 3 anos civis (UFEMG 2026 = R$ 5,7899)'},
  RS:{nome:'Rio Grande do Sul (RS)',teto:0,aliq:'3% a 4%',regra:'Sem isenção geral para doações em dinheiro'},
  PR:{nome:'Paraná (PR)',teto:0,aliq:'4%',regra:'Sem isenção geral por valor para doações em dinheiro'},
  SC:{nome:'Santa Catarina (SC)',teto:2000,aliq:'1% a 8%',regra:'Isenção restrita (~R$ 2.000 por doação/12 meses; consulte Sefaz-SC)'},
  DF:{nome:'Distrito Federal (DF)',teto:115000,aliq:'4% a 6%',regra:'Referência aproximada de isenção anual; consulte Sefaz-DF'},
  BA:{nome:'Bahia (BA)',teto:0,aliq:'3,5%',regra:'Sem isenção geral por valor para doações em dinheiro'},
  OTHER:{nome:'Outro Estado (UF)',teto:0,aliq:'variável',regra:'Informe abaixo o teto de isenção vigente no seu estado'}
};
let S=load(),view='casal',tab='geral',MS=null,charts=[],IMP=null,IMP_BANK=null,rulesOpen=false,currentUser=null,SEL=new Set();
let geralMode='linhas',showPastMatrix=false,openVarQ=new Set(),openMesDet=new Set(),irpfYear='',waPreviewOpen=false,pixCfgOpen=false;
let histMode='faturas',cenMode='cen',inflBaseYr='',inflCompYr='',auditFilter='',auditWho='',bankDefQuem='';
const F={quem:'',tipo:'',txt:'',fat:null,rev:false,hf:null,rtxt:''};
const cur=x=>x.fatura===S.settings.base;
const live=x=>x.ativo&&!x.rev&&x.tipo!=='ignorar';
const isPaid=(ym,k)=>!!(S.paid?.[ym]?.[k]);
const setPaid=(ym,k,v)=>{S.paid=S.paid||{};S.paid[ym]=S.paid[ym]||{};if(v)S.paid[ym][k]=true;else delete S.paid[ym][k]};
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const todayYM=()=>todayISO().slice(0,7);
const fmtDateBR=iso=>{const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:(iso||'–')};
const daysInMonth=ym=>new Date(+ym.slice(0,4),+ym.slice(5),0).getDate();

function load(){try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&j.tx)return mig(j)}catch(e){}return mig(structuredClone(window.SEED||EMPTY))}
function save(){S.meta.updatedAt=new Date().toISOString();if(currentUser)S.meta.updatedBy=currentUser;localStorage.setItem(KEY,JSON.stringify(S));push()}
function loadSnaps(){try{return JSON.parse(localStorage.getItem(SNAP_KEY))||[]}catch(e){return[]}}
function saveSnap(motivo){
  try{
    const list=loadSnaps();
    list.unshift({id:Date.now(),at:new Date().toISOString(),motivo,by:currentUser||S.meta?.updatedBy||'Local',txCount:S.tx.length,offCount:S.off.length,data:structuredClone(S)});
    localStorage.setItem(SNAP_KEY,JSON.stringify(list.slice(0,5)));
  }catch(e){}
}
function restoreSnap(id){
  const list=loadSnaps(),sn=list.find(x=>x.id===id);
  if(!sn||!confirm(`Restaurar o ponto "${sn.motivo}" de ${new Date(sn.at).toLocaleString('pt-BR')}?`))return false;
  saveSnap('Antes de restaurar ponto anterior');
  S=mig(sn.data);return true;
}
function delSnap(id){
  localStorage.setItem(SNAP_KEY,JSON.stringify(loadSnaps().filter(x=>x.id!==id)));
}
function logAudit(acao,detalhe=''){
  S.extras=S.extras||{};
  const list=Array.isArray(S.extras.auditLog)?S.extras.auditLog:(S.extras.auditLog=[]);
  list.unshift({id:Date.now()+Math.floor(Math.random()*1000),at:new Date().toISOString(),by:currentUser||S.meta?.updatedBy||'Local',acao,detalhe:String(detalhe||'').slice(0,180)});
  if(list.length>120)list.length=120;
}
const addM=(ym,k)=>{let[y,m]=ym.split('-').map(Number);m+=k;y+=Math.floor((m-1)/12);m=((m-1)%12+12)%12+1;return y+'-'+String(m).padStart(2,'0')};
const diffM=(a,b)=>(+b.slice(0,4)-+a.slice(0,4))*12+(+b.slice(5)-+a.slice(5));
const lab=ym=>MN[+ym.slice(5)-1]+'/'+ym.slice(2,4);
const brl=v=>(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num=v=>(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const cellN=v=>v?num(v):'<span class="z">–</span>';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cls=v=>v<0?'neg':'';
const months=(n=S.settings.horizon)=>Array.from({length:n+1},(_,k)=>addM(S.settings.base,k));

function weight(q){
  switch(view){
    case 'casal':return 1;
    case 'cristian':return q==='Cristian'?1:q==='Pedro'?0:0.5;
    case 'pedro':return q==='Pedro'?1:q==='Cristian'?0:0.5;
    default:return q==='Conjunto'?1:0;
  }
}
function split(fat=S.settings.base){
  const s={Cristian:0,Pedro:0,Conjunto:0};
  S.tx.forEach(x=>{if(x.fatura===fat&&live(x))s[x.quem]=(s[x.quem]||0)+x.valor});
  const m=s.Conjunto*0.5;
  return {...s,total:s.Cristian+s.Pedro+s.Conjunto,payC:s.Cristian+m,payP:s.Pedro+m};
}
function txAmount(x,k){
  if(!live(x)||x.tipo==='variavel')return 0;
  const ym=addM(S.settings.base,k);
  if(x.tipo==='assinatura_anual'){
    if(x.fatura>S.settings.base||(x.fim&&ym>x.fim))return 0;
    const d=diffM(x.fatura,ym);
    if(d<0||d%12!==0)return 0;
    if(d>0&&S.tx.some(y=>y!==x&&live(y)&&y.tipo==='assinatura_anual'&&y.fatura<=S.settings.base&&y.fatura>x.fatura&&key(y.desc)===key(x.desc)))return 0;
    return x.valor;
  }
  if(!cur(x))return 0;
  if(k===0)return x.valor;
  switch(x.tipo){
    case 'parcelada':return x.tot&&k<=x.tot-x.cur?x.valor:0;
    case 'fixa':case 'assinatura_mensal':return !x.fim||ym<=x.fim?x.valor:0;
  }
  return 0;
}
function txValAt(x,ym){
  if(!live(x))return 0;
  const base=S.settings.base;
  if(ym<base)return x.fatura===ym?x.valor:0;
  const k=diffM(base,ym);
  if(x.tipo==='variavel')return k===0&&cur(x)?x.valor:0;
  return txAmount(x,k);
}
const vItemActive=(v,ym)=>v.ativo&&v.valor>0&&(!v.inicio||ym>=v.inicio)&&(!v.fim||ym<=v.fim);
function varAt(q,k){
  if(k===0)return S.tx.filter(x=>live(x)&&x.tipo==='variavel'&&x.quem===q&&cur(x)).reduce((a,x)=>a+x.valor,0);
  if(!S.settings.includeVar)return 0;
  const ym=addM(S.settings.base,k);
  return (S.settings.varItems||[]).filter(v=>v.quem===q&&vItemActive(v,ym)).reduce((a,v)=>a+v.valor,0);
}
const offV=(o,ym)=>o.valor*Math.pow(1+(o.reaj||0)/100,Math.floor(diffM(o.inicio,ym)/12));
const offActive=(o,ym)=>o.inicio<=ym&&(!o.fim||ym<=o.fim)&&(o.freq!=='anual'||o.inicio.slice(5)===ym.slice(5));
const projActive=(p,ym)=>p&&p.ativo!==false&&(p.aporteMensal||0)>0&&(!p.inicio||ym>=p.inicio)&&(!p.mesAlvo||ym<=p.mesAlvo);

function compute(n){
  let saldo=PEOPLE.reduce((a,q)=>a+(S.settings.saldoIni[q]||0)*weight(q),0);
  const incP=!!S.settings.includePlans,E=S.extras,rr=(E.reserva?.rend||0)/100;
  let res=E.reserva?.saldo||0;
  return months(n).map((ym,k)=>{
    const g={parcelas:0,fixas:0,assinaturas:0,variaveis:0},byQ={Cristian:0,Pedro:0,Conjunto:0},cardByQ={Cristian:0,Pedro:0,Conjunto:0},offByQ={Cristian:0,Pedro:0,Conjunto:0};
    S.tx.forEach(x=>{const a=txAmount(x,k);if(a){g[GROUP[x.tipo]]+=a*weight(x.quem);byQ[x.quem]+=a;cardByQ[x.quem]+=a}});
    if(incP)E.compras.forEach(c=>{const np=Math.max(1,c.np||1),d=diffM(c.mes,ym);if(d>=0&&d<np){const v=c.valor/np;g.parcelas+=v*weight(c.quem);byQ[c.quem]+=v;cardByQ[c.quem]+=v}});
    PEOPLE.forEach(q=>{const v=varAt(q,k);g.variaveis+=v*weight(q);byQ[q]+=v;cardByQ[q]+=v});
    let renda=0,fora=0;
    S.off.forEach(o=>{if(!offActive(o,ym))return;const raw=offV(o,ym),v=raw*weight(o.quem);if(o.kind==='receita')renda+=v;else{fora+=v;byQ[o.quem]+=raw;offByQ[o.quem]+=raw}});
    if(incP){
      const inRes=!(E.reserva.meta&&res>=E.reserva.meta)?(E.reserva.aporte||0):0;
      res=res*(1+rr)+inRes;fora+=inRes*weight('Conjunto');byQ.Conjunto+=inRes;offByQ.Conjunto+=inRes;
      E.inv.forEach(i=>{if(i.inicio<=ym&&(!i.fim||ym<=i.fim)){const v=i.valor||0;fora+=v*weight(i.quem);byQ[i.quem]+=v;offByQ[i.quem]+=v}});
      (E.projetos||[]).forEach(p=>{if(projActive(p,ym)){const v=+p.aporteMensal||0,q=p.quem||'Conjunto';fora+=v*weight(q);byQ[q]+=v;offByQ[q]+=v}});
      E.saques.forEach(x=>{if(x.mes===ym&&x.destino==='caixa')renda+=(x.valor||0)*weight(x.quem)});
    }
    const comprometido=g.parcelas+g.fixas+g.assinaturas,cartao=comprometido+g.variaveis;
    const total=cartao+fora,sobra=renda-total;saldo+=sobra;
    return {ym,k,g,byQ,cardByQ,offByQ,renda,fora,comprometido,cartao,total,sobra,saldo};
  });
}

const THEME_VARS={
  light:{'--bg':'#f4f6f8','--surface':'#ffffff','--line':'#e5e8ec','--text':'#16181d','--muted':'#707782','--accent':'#0e6b7c','--accent-soft':'#e3f1f3','--petrol-dark':'#0a4a57','--neg':'#d6336c','--pos':'#2b8a3e','--row-hover':'#f8fafb','--hdr-bg':'rgba(255,255,255,.94)'},
  dark:{'--bg':'#0f1216','--surface':'#181c22','--line':'#282e38','--text':'#e9edf2','--muted':'#9aa3b0','--accent':'#23a4bc','--accent-soft':'#16343d','--petrol-dark':'#66d1e6','--neg':'#ff6b96','--pos':'#51cf66','--row-hover':'#1f252e','--hdr-bg':'rgba(24,28,34,.94)'}
};
function applyTheme(t){
  const mode=t==='dark'?'dark':'light';
  document.documentElement.dataset.theme=mode;
  if(document.body)document.body.dataset.theme=mode;
  Object.entries(THEME_VARS[mode]).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
  localStorage.setItem('pf-theme',mode);
  const mc=document.querySelector('meta[name="theme-color"]');if(mc)mc.setAttribute('content',mode==='dark'?'#0f1216':'#0e6b7c');
  const btn=document.getElementById('theme-btn');if(btn)btn.innerHTML=mode==='dark'?'<span class="ico">☀️</span><span class="lbl"> Claro</span>':'<span class="ico">🌙</span><span class="lbl"> Escuro</span>';
  if(window.Chart){
    Chart.defaults.font.family='Inter,-apple-system,Segoe UI,sans-serif';
    Chart.defaults.color=mode==='dark'?'#9aa3b0':'#707782';
    Chart.defaults.borderColor=mode==='dark'?'#282e38':'#e5e8ec';
    Chart.defaults.plugins.legend.labels.usePointStyle=true;
    Chart.defaults.elements.bar.borderRadius=3;
  }
}
applyTheme(localStorage.getItem('pf-theme')||'light');
function destroyCharts(){charts.forEach(c=>c.destroy());charts=[]}
function captureFocus(m){
  const a=document.activeElement;
  if(!a||!m.contains(a))return null;
  const tr=a.closest('tr[data-id]'),trR=a.closest('tr[data-rule]'),trV=a.closest('tr[data-vid]'),pc=a.closest('.proj-card[data-proj-id]'),br=a.closest('.bank-row[data-bi]');
  const sel=tr&&a.dataset.f?`tr[data-id="${tr.dataset.id}"]${tr.dataset.list?`[data-list="${tr.dataset.list}"]`:''} [data-f="${a.dataset.f}"]`:
    trR&&a.dataset.rf?`tr[data-rule="${CSS.escape(trR.dataset.rule)}"] [data-rf="${a.dataset.rf}"]`:
    trV&&a.dataset.vf?`tr[data-vid="${trV.dataset.vid}"] [data-vf="${a.dataset.vf}"]`:
    pc&&a.dataset.pf?`.proj-card[data-proj-id="${pc.dataset.projId}"] [data-pf="${a.dataset.pf}"]`:
    br&&a.dataset.bf?`.bank-row[data-bi="${br.dataset.bi}"] [data-bf="${a.dataset.bf}"]`:
    a.id?`#${a.id}`:
    ['s','fg','meta','res','cen','amort','fire','v','si','irpf','irpfSaldo','pixcfg'].map(k=>a.dataset[k]!=null?`[data-${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}="${CSS.escape(a.dataset[k])}"]`:null).find(Boolean);
  if(!sel)return null;
  let ss=null,se=null;try{ss=a.selectionStart;se=a.selectionEnd}catch(e){}
  return {sel,ss,se};
}
function restoreFocus(m,fc){
  if(!fc)return;
  const el=m.querySelector(fc.sel);
  if(!el)return;
  el.focus({preventScroll:true});
  if(fc.ss!=null){try{el.setSelectionRange(fc.ss,fc.se)}catch(e){}}
}
function updateMobBar(){
  const mb=document.getElementById('mob-bar');if(!mb)return;
  const base=S.settings.base,k0=compute(1)[0],sp=split(base);
  const offP=S.off.filter(o=>offActive(o,base)&&o.kind!=='receita').reduce((a,o)=>a+offV(o,base)*(o.quem==='Pedro'?1:o.quem==='Conjunto'?0.5:0),0);
  mb.innerHTML=`<span><small>Mês base</small><b>${lab(base)}</b></span>
    <span><small>Fatura atual</small><b>${brl(k0.cartao)}</b></span>
    <span><small>Sobra mês</small><b class="${cls(k0.sobra)}">${brl(k0.sobra)}</b></span>
    <span style="cursor:pointer" data-jump-mob="mes" title="Abrir Visão mensal"><small>Parte Pedro ▸</small><b>${brl(sp.payP+offP)}</b></span>`;
  mb.querySelector('[data-jump-mob]')?.addEventListener('click',()=>{tab='mes';render()});
}
const TAB_HINTS={
  geral:['Visão Geral','Evolução de receitas, despesas e saldo projetado. Clique em qualquer mês para abrir o acerto detalhado.'],
  mes:['Visão Mensal & Acerto','Resumo de quanto cada um paga no mês, envio de WhatsApp/Pix, ritmo diário e fechamento oficial.'],
  fluxo:['Fluxo de Caixa & FGTS','Caixa mensal acumulado, saldo em conta e evolução do FGTS de Cristian e Pedro.'],
  cartao:['Cartão de Crédito','Parcelas, fixas e assinaturas programadas + estimativas futuras opcionais.'],
  lanc:['Lançamentos da Fatura','Filtre, edite ou altere em lote quem pagou cada compra (Cristian 100%, Pedro 100% ou Conjunto 50/50).'],
  imp:['Importar & Revisar','Envie a fatura Itaú (.xlsx) ou extrato/Pix (.ofx/.csv) e valide itens pendentes antes de somarem.'],
  fora:['Contas Fora do Cartão','Rendas, aluguel, carro e boletos com alerta de 5 dias antes do vencimento.'],
  hist:['Histórico & Auditoria','Faturas fechadas 🔒, inflação pessoal ano a ano e trilha de alterações do casal.'],
  metas:['Metas por Categoria','Limites mensais (cartão + fora do cartão) com alertas em 80% e 100%.'],
  projetos:['Projetos de Vida','Metas de Imóvel (c/ FGTS conjunto), Carro e Viagens com previsão de conclusão.'],
  planos:['Planos & Reserva','Reserva de emergência, aportes em investimentos, saques do FGTS e compras planejadas.'],
  cen:['Simuladores','Teste cenários de fluxo, amortização de dívidas com FGTS e Independência Financeira (FIRE).'],
  irpf:['Dossiê IRPF & Conciliação Fiscal','Comprovação anual das transferências (Decred / e-Financeira), deduções por CPF e saldos em 31/12.'],
  prem:['Premissas & Backups','Mês base, guia de uso, exportação JSON e pontos de restauração automáticos.']
};
const tabHint=t=>TAB_HINTS[t]?`<div class="tab-hint no-print"><div><span class="tab-title">${TAB_HINTS[t][0]}</span><span>${TAB_HINTS[t][1]}</span></div><button class="b g" type="button" data-act="open-guide" style="padding:4px 10px;font-size:12px;white-space:nowrap">❓ Como usar</button></div>`:'';
function welcomeBanner(){
  if(localStorage.getItem('pf-onboard-seen')==='1')return '';
  return `<div class="welcome-banner no-print" id="welcome-banner">
    <div style="flex:1;min-width:220px">
      <b style="font-size:14.5px;color:var(--petrol-dark)">👋 Bem-vindo ao Portal Financeiro (Cristian & Pedro)</b>
      <div class="note" style="margin:3px 0 0">Novo por aqui? Em 1 minuto você entende a regra de divisão (Individual vs Conjunto 50/50), onde ver o Pix do mês e o mapa completo das abas.</div>
    </div>
    <div class="bar" style="margin:0">
      <button class="b" type="button" data-act="open-guide">📖 Abrir Guia Rápido</button>
      <button class="b g" type="button" data-act="dismiss-welcome">Entendi, ocultar</button>
    </div>
  </div>`;
}
function openGuideModal(){
  const qm=document.getElementById('qmodal');if(!qm)return;
  const mapItems=[
    ['geral','📊 Visão geral','Gráficos anuais, saldo futuro e todos os itens mês a mês.'],
    ['mes','💸 Visão mensal','Valor exato do acerto, Pix Copia e Cola, WhatsApp e Burn-rate diário.'],
    ['fora','🧾 Fora do cartão','Salários, aluguel, carro, alertas de 5 dias e check de contas pagas.'],
    ['imp','📥 Importar / Revisar','Subir fatura do Itaú (.xlsx) ou extrato bancário/Pix (.ofx / .csv).'],
    ['cartao','💳 Cartão','Parcelas e assinaturas futuras + estimativas opcionais de gastos.'],
    ['lanc','🔎 Lançamentos','Editar ou filtrar compras individuais da fatura (com ações em lote).'],
    ['projetos','🎯 Projetos de Vida','Metas de Imóvel (com FGTS conjunto), Carro e Viagens com ETA.'],
    ['cen','🧪 Cenários & FIRE','Simular quitação/amortização de dívida, cenários de fluxo e FIRE.'],
    ['hist','📈 Histórico & Auditoria','Faturas fechadas, termômetro de inflação pessoal e linha do tempo.'],
    ['irpf','🧾 Dossiê IRPF','Conciliação fiscal anual, texto pronto p/ Receita e deduções por CPF.'],
    ['planos','🏦 Planos & Reserva','Reserva de emergência, aportes em investimentos e saques de FGTS.'],
    ['prem','⚙️ Premissas & Backups','Mês base, atalhos, backup JSON e 5 pontos de restauração.']
  ];
  qm.hidden=false;
  qm.innerHTML=`<div class="qbox qbox-wide">
    <div class="bar" style="justify-content:space-between;margin-bottom:10px">
      <h2 style="margin:0">📖 Guia Rápido do Portal — Cristian & Pedro</h2>
      <button class="b g" type="button" id="guide-close" style="padding:4px 10px">✕ Fechar</button>
    </div>
    <div class="guide-sec">
      <h3>1. A Regra de Ouro (Como as contas são divididas)</h3>
      <div class="guide-grid">
        <div class="guide-card" style="border-top:3px solid #0e6b7c"><b>🔵 Individual Cristian (100%)</b>Tudo marcado como <i>Cristian</i> entra 100% na conta do Cristian.</div>
        <div class="guide-card" style="border-top:3px solid #d9480f"><b>🟠 Individual Pedro (100%)</b>Tudo marcado como <i>Pedro</i> (incl. QuintoAndar na fatura) entra 100% na conta do Pedro.</div>
        <div class="guide-card" style="border-top:3px solid #2b8a3e"><b>🟢 Conjunto (Sempre 50% / 50%)</b>Aluguel, carro, mercado e contas <i>Conjunto</i> são divididos exatamente meio a meio.</div>
      </div>
    </div>
    <div class="guide-sec">
      <h3>2. Rotina do Mês em 4 Passos Simples</h3>
      <div class="guide-steps">
        <div class="guide-step"><span class="guide-num">1</span><div><b>No dia a dia:</b> toque em <b>+ Lançamento</b> (canto inferior) para registrar um gasto avulso ou importe o extrato em <i>Importar / Revisar</i>.</div></div>
        <div class="guide-step"><span class="guide-num">2</span><div><b>Contas a vencer:</b> confira o painel amarelo de vencimentos (próximos 5 dias) na <i>Visão geral</i> ou <i>Fora do cartão</i> e marque <b>✓ Pago</b>.</div></div>
        <div class="guide-step"><span class="guide-num">3</span><div><b>Dia do acerto:</b> abra <i>Visão mensal</i>, copie a mensagem de <b>WhatsApp</b> ou o <b>Pix Copia e Cola</b> e marque <b>Acerto ok ✓</b> (salva no IRPF).</div></div>
        <div class="guide-step"><span class="guide-num">4</span><div><b>Fim do mês:</b> clique em <b>🔒 Encerrar Mês</b> na <i>Visão mensal</i> para congelar uma cópia definitiva daquele mês.</div></div>
      </div>
    </div>
    <div class="guide-sec">
      <h3>3. Onde está cada coisa (clique para abrir a aba)</h3>
      <div class="guide-map">
        ${mapItems.map(([t,tit,desc])=>`<button type="button" class="guide-map-btn" data-guide-tab="${t}"><b>${tit}</b><span>${desc}</span></button>`).join('')}
      </div>
    </div>
    <div class="guide-sec" style="margin-bottom:8px">
      <h3>4. Instalar no Celular (PWA) & Dicas Rápidas</h3>
      <div class="guide-card">
        • <b>iPhone (Safari):</b> toque em <i>Compartilhar</i> (quadrado com seta) → <b>Adicionar à Tela de Início</b>.<br>
        • <b>Android (Chrome):</b> menu <i>⋮</i> → <b>Instalar aplicativo</b> / <b>Adicionar à tela inicial</b>.<br>
        • <b>Sincronização & Segurança:</b> ambos usam a mesma nuvem (Supabase). Se editar errado, vá em <i>Premissas → Pontos de Restauração</i> ou confira tudo em <i>Histórico → Auditoria</i>.<br>
        • <b>Atalhos (PC):</b> <code>Alt+N</code> (novo lançamento) · <code>Alt+T</code> (tema escuro/claro) · <code>Esc</code> (fechar modal).
      </div>
    </div>
    <div class="bar" style="justify-content:flex-end;margin:0">
      <button class="b" type="button" id="guide-done">Entendi, começar a usar ✓</button>
    </div>
  </div>`;
  const close=()=>{localStorage.setItem('pf-onboard-seen','1');qm.hidden=true;render()};
  qm.querySelector('#guide-close').onclick=close;
  qm.querySelector('#guide-done').onclick=close;
  qm.onclick=e=>{if(e.target===qm)close()};
  qm.querySelectorAll('[data-guide-tab]').forEach(b=>b.addEventListener('click',()=>{
    localStorage.setItem('pf-onboard-seen','1');
    tab=b.dataset.guideTab;
    qm.hidden=true;
    render();
  }));
}
function render(){
  destroyCharts();
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  document.querySelectorAll('#mob-nav button[data-mtab]').forEach(b=>b.classList.toggle('on',b.dataset.mtab===tab));
  const m=document.getElementById('main');
  const fc=captureFocus(m),scrolls=[...m.querySelectorAll('.tw')].map(el=>[el.scrollTop,el.scrollLeft]);
  const nr=S.tx.filter(x=>x.rev).length;
  const mt=S.meta||{},fd=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  document.getElementById('meta').textContent=(mt.lastImport?`Última importação: fatura ${lab(mt.lastImport.fatura)} em ${fd(mt.lastImport.at)}`:'Nenhuma importação ainda')+(mt.updatedAt?` · Atualizado em ${fd(mt.updatedAt)}${mt.updatedBy?` por ${mt.updatedBy}`:''}`:'');
  document.querySelector('[data-tab=imp]').textContent='📥 Importar / Revisar'+(nr?` (${nr})`:'');
  updateMobBar();
  const bodyHtml={metas:rMetas,projetos:rProjetos,planos:rPlanos,cen:rCen,fluxo:rFluxo,geral:rGeral,mes:rMes,cartao:rCartao,lanc:rLanc,fora:rFora,irpf:rIrpf,prem:rPrem,imp:rImp,hist:rHist}[tab]();
  m.innerHTML=(tab==='geral'?welcomeBanner():'')+tabHint(tab)+bodyHtml;
  if(tab==='geral')drawGeral();
  if(tab==='fluxo')drawFluxo();
  if(tab==='planos')drawPlanos();
  if(tab==='cen')drawCen();
  if(tab==='hist')drawHist();
  bind(m);
  m.querySelectorAll('.tw').forEach((el,i)=>{if(scrolls[i]){el.scrollTop=scrolls[i][0];el.scrollLeft=scrolls[i][1]}});
  restoreFocus(m,fc);
  try{document.querySelector('#tabs button.on')?.scrollIntoView({inline:'nearest',block:'nearest'})}catch(e){}
}

function dueStatus(o,ym){
  if(!o.venc||o.kind==='receita')return null;
  if(isPaid(ym,o.id))return {effDay:Math.min(o.venc,daysInMonth(ym)),diff:null,cls:'due-ok',label:'Pago ✓',urgent:false,paid:true};
  const effDay=Math.min(+o.venc||1,daysInMonth(ym)),curYm=todayYM();
  if(ym<curYm)return {effDay,diff:-1,cls:'due-over',label:`Vencida (${effDay}/${ym.slice(5)})`,urgent:true,over:true};
  if(ym>curYm)return {effDay,diff:null,cls:'due-later',label:`Dia ${effDay}`,urgent:false};
  const diff=effDay-new Date().getDate();
  if(diff<0)return {effDay,diff,cls:'due-over',label:`Vencida há ${-diff}d`,urgent:true,over:true};
  if(diff===0)return {effDay,diff,cls:'due-over',label:'Vence hoje!',urgent:true,soon:true};
  if(diff<=5)return {effDay,diff,cls:'due-soon',label:`Vence em ${diff}d`,urgent:true,soon:true};
  return {effDay,diff,cls:'due-later',label:`Dia ${effDay} (em ${diff}d)`,urgent:false};
}
function dueAlertsPanel(ym,alwaysShow=false){
  const list=S.off.filter(o=>o.kind!=='receita'&&offActive(o,ym)&&weight(o.quem)>0);
  if(!list.length)return '';
  const unpaidWithVenc=list.filter(o=>!isPaid(ym,o.id)&&o.venc).map(o=>({o,st:dueStatus(o,ym),val:offV(o,ym)})).sort((a,b)=>(a.st.effDay)-(b.st.effDay));
  const urgent=unpaidWithVenc.filter(x=>x.st.urgent);
  const later=unpaidWithVenc.filter(x=>!x.st.urgent);
  const noVenc=list.filter(o=>!isPaid(ym,o.id)&&!o.venc);
  const nOver=urgent.filter(x=>x.st.over).length,nSoon=urgent.length-nOver;
  if(!alwaysShow&&!urgent.length)return '';
  const totUrg=urgent.reduce((a,x)=>a+x.val,0),totLater=later.reduce((a,x)=>a+x.val,0);
  const paidCount=list.filter(o=>isPaid(ym,o.id)).length;
  const panelCls=nOver?'due-panel has-over':(urgent.length?'due-panel':'due-panel all-ok');
  const itemHtml=({o,st,val})=>`<div class="due-item ${st.over?'over':st.soon?'soon':''}">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span class="due-badge ${st.cls}">${st.label}</span>
      <b>${esc(o.nome)}</b>
      <span class="tag t-${o.quem}">${o.quem}${o.quem==='Conjunto'?' (50/50)':''}</span>
      <small class="note">Venc. ${String(st.effDay).padStart(2,'0')}/${ym.slice(5)} · ${esc(o.cat||'Outros')}</small>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <b>${brl(val)}</b>
      <button class="b g" data-act="quick-pay" data-id="${o.id}" data-ym="${ym}" style="padding:4px 10px;font-size:12px">✓ Marcar pago</button>
    </div>
  </div>`;
  const curYm=todayYM(),dim=daysInMonth(ym);
  let weekBuckets=[];
  if(ym===curYm){
    const now=new Date(),today=now.getDate(),dow=(now.getDay()+6)%7;
    const endThis=Math.min(dim,today+(6-dow)),endNext=Math.min(dim,endThis+7);
    const wThis=later.filter(x=>x.st.effDay<=endThis);
    const wNext=later.filter(x=>x.st.effDay>endThis&&x.st.effDay<=endNext);
    const wRest=later.filter(x=>x.st.effDay>endNext);
    weekBuckets=[
      {title:`📅 Ainda esta semana (até dia ${endThis})`,items:wThis},
      {title:`📆 Próxima semana (dias ${Math.min(dim,endThis+1)}–${endNext})`,items:wNext},
      {title:`🗓️ Mais adiante no mês (após dia ${endNext})`,items:wRest}
    ].filter(b=>b.items.length);
  }else{
    weekBuckets=[
      {title:'📅 1ª semana (dias 1–7)',items:later.filter(x=>x.st.effDay<=7)},
      {title:'📆 2ª semana (dias 8–14)',items:later.filter(x=>x.st.effDay>=8&&x.st.effDay<=14)},
      {title:'🗓️ 3ª semana (dias 15–21)',items:later.filter(x=>x.st.effDay>=15&&x.st.effDay<=21)},
      {title:`🗓️ 4ª/5ª semana (dias 22–${dim})`,items:later.filter(x=>x.st.effDay>=22)}
    ].filter(b=>b.items.length);
  }
  const sumVals=arr=>arr.reduce((a,x)=>a+x.val,0);
  const timelineHtml=weekBuckets.length?weekBuckets.map(b=>`<div class="due-week-hdr"><span>${b.title}</span><span>${b.items.length} conta(s) · ${brl(sumVals(b.items))}</span></div><div class="due-list" style="margin-top:4px">${b.items.map(itemHtml).join('')}</div>`).join(''):'';
  let weekSummaryPills='';
  if(alwaysShow&&unpaidWithVenc.length){
    if(ym===curYm){
      const now=new Date(),today=now.getDate(),dow=(now.getDay()+6)%7;
      const endThis=Math.min(dim,today+(6-dow)),endNext=Math.min(dim,endThis+7);
      const sOver=sumVals(unpaidWithVenc.filter(x=>x.st.over));
      const sThis=sumVals(unpaidWithVenc.filter(x=>!x.st.over&&x.st.effDay<=endThis));
      const sNext=sumVals(unpaidWithVenc.filter(x=>!x.st.over&&x.st.effDay>endThis&&x.st.effDay<=endNext));
      const sLater=sumVals(unpaidWithVenc.filter(x=>!x.st.over&&x.st.effDay>endNext));
      weekSummaryPills=`<div class="due-pills">
        ${sOver?`<span class="due-badge due-over">Atrasadas: ${brl(sOver)}</span>`:''}
        <span class="due-badge ${sThis?'due-soon':'due-later'}">Esta semana: ${brl(sThis)}</span>
        <span class="due-badge due-later">Próxima semana: ${brl(sNext)}</span>
        <span class="due-badge due-later">Restante do mês: ${brl(sLater)}</span>
      </div>`;
    }else{
      weekSummaryPills=`<div class="due-pills">${weekBuckets.map(b=>`<span class="due-badge due-later">${b.title.replace(/^[^\s]+\s/,'')}: ${brl(sumVals(b.items))}</span>`).join('')}</div>`;
    }
  }
  return `<div class="panel ${panelCls}">
    <div class="bar" style="justify-content:space-between;margin-bottom:${urgent.length||later.length?'6':'0'}px">
      <h2 style="margin:0">⏰ Central de Contas a Vencer — ${lab(ym)}</h2>
      <div class="bar" style="margin:0">
        ${nOver?`<span class="due-badge due-over">${nOver} vencida(s)</span>`:''}
        ${nSoon?`<span class="due-badge due-soon">${nSoon} vence(m) em até 5 dias (${brl(totUrg)})</span>`:''}
        ${!urgent.length?`<span class="due-badge due-ok">Nenhuma conta vencendo nos próximos 5 dias ✓</span>`:''}
        <span class="note">${paidCount}/${list.length} pagas no mês</span>
      </div>
    </div>
    ${weekSummaryPills}
    ${urgent.length?`<div class="due-list">${urgent.map(itemHtml).join('')}</div>`:''}
    ${later.length?(alwaysShow?`<div style="margin-top:8px">${timelineHtml}</div>`:`<details style="margin-top:8px"><summary class="note" style="cursor:pointer;font-weight:600">Linha do tempo semanal: ver +${later.length} conta(s) a vencer no mês (${brl(totLater)})</summary>${timelineHtml}</details>`):''}
    ${noVenc.length&&alwaysShow?`<div class="note" style="margin-top:6px">💡 ${noVenc.length} conta(s) sem dia de vencimento preenchido (preencha a coluna <b>Venc.</b> abaixo para receber alertas de 5 dias e posicionar na linha do tempo).</div>`:''}
  </div>`;
}
function openPixModal(ym,calcTotal,calcCard=0,calcOff=0){
  const qm=document.getElementById('qmodal');if(!qm)return;
  const ex=(S.extras.acertoPix&&S.extras.acertoPix[ym])||null;
  const defVal=ex?ex.valor:+((calcTotal||0).toFixed(2));
  const defData=(ex&&ex.data)||todayISO();
  const defCod=(ex&&ex.codigo)||'';
  const defObs=(ex&&ex.obs)||'';
  qm.hidden=false;
  qm.innerHTML=`<div class="qbox" style="max-width:460px">
    <h2>💸 Registrar Pix de Acerto — ${lab(ym)}</h2>
    <div class="note" style="margin-bottom:10px">
      Parte calculada do Pedro neste mês: <b>${brl(calcTotal)}</b>
      ${(calcCard||calcOff)?` <br><small>(Cartão: ${brl(calcCard)} + Fora do cartão: ${brl(calcOff)})</small>`:''}
    </div>
    <div class="qgrid" style="grid-template-columns:135px 1fr">
      <label>Data do Pix</label><input id="px-data" type="date" value="${esc(defData)}">
      <label>Valor transferido (R$)</label><input id="px-val" type="number" step="0.01" value="${defVal}">
      <label>Cód. Pix / E2E (opc.)</label><input id="px-cod" placeholder="Ex.: E0000000020260408..." value="${esc(defCod)}">
      <label>Observação (opc.)</label><input id="px-obs" placeholder="Ex.: Comprovante Nubank / Itaú" value="${esc(defObs)}">
    </div>
    <div class="note" style="margin-bottom:12px">Este registro alimenta automaticamente o <b>Dossiê IRPF & Conciliação Fiscal</b>.</div>
    <div class="bar" style="justify-content:space-between;margin:0">
      ${ex?`<button class="b r" id="px-del" style="padding:6px 10px;font-size:12px">Limpar registro</button>`:'<span></span>'}
      <div class="bar" style="margin:0">
        <button class="b g" id="px-cancel">Cancelar</button>
        <button class="b" id="px-save">Salvar Pix & Marcar ✓</button>
      </div>
    </div>
  </div>`;
  qm.querySelector('#px-val')?.focus();
  const close=()=>{qm.hidden=true;render()};
  qm.querySelector('#px-cancel').onclick=close;
  qm.onclick=e=>{if(e.target===qm)close()};
  if(ex){
    qm.querySelector('#px-del').onclick=()=>{
      if(!confirm(`Remover o registro de Pix de ${lab(ym)}?`))return;
      delete S.extras.acertoPix[ym];
      setPaid(ym,'acerto',false);
      if(S.extras.closedMonths?.[ym]){S.extras.closedMonths[ym].pix=null;S.extras.closedMonths[ym].acertoOk=false}
      logAudit('Acerto Pix removido',`${lab(ym)}`);
      qm.hidden=true;save();render();
    };
  }
  qm.querySelector('#px-save').onclick=()=>{
    const data=qm.querySelector('#px-data').value||todayISO();
    const valor=+qm.querySelector('#px-val').value||0;
    const codigo=qm.querySelector('#px-cod').value.trim();
    const obs=qm.querySelector('#px-obs').value.trim();
    if(valor<=0)return alert('Informe o valor transferido pelo Pix.');
    S.extras.acertoPix=S.extras.acertoPix||{};
    const rec={data,valor:+valor.toFixed(2),codigo,obs,updatedAt:new Date().toISOString()};
    S.extras.acertoPix[ym]=rec;
    setPaid(ym,'acerto',true);
    if(S.extras.closedMonths?.[ym]){S.extras.closedMonths[ym].pix=structuredClone(rec);S.extras.closedMonths[ym].acertoOk=true}
    logAudit('Acerto Pix registrado',`${lab(ym)}: ${brl(rec.valor)} em ${fmtDateBR(rec.data)}${rec.codigo?' · '+rec.codigo:''}`);
    qm.hidden=true;save();render();
  };
}

function crc16CCITT(str){
  let crc=0xFFFF;
  for(let i=0;i<str.length;i++){
    crc^=str.charCodeAt(i)<<8;
    for(let j=0;j<8;j++)crc=(crc&0x8000)?((crc<<1)^0x1021):(crc<<1);
    crc&=0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4,'0');
}
const pixField=(id,val)=>id+String(val.length).padStart(2,'0')+val;
const pixCleanText=(s,max)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 \-_.]/g,'').trim().toUpperCase().slice(0,max);
function buildPixPayload({chave,titular,cidade,valor,txid}){
  const k=String(chave||'').trim();
  if(!k)return '';
  const gui=pixField('00','br.gov.bcb.pix')+pixField('01',k);
  const name=pixCleanText(titular||'CRISTIAN',25)||'CRISTIAN';
  const city=pixCleanText(cidade||'SAO PAULO',15)||'SAO PAULO';
  const tid=String(txid||'ACERTO').replace(/[^A-Za-z0-9]/g,'').slice(0,25)||'***';
  const amt=(+valor||0)>0?pixField('54',(+valor).toFixed(2)):'';
  const base=pixField('00','01')+pixField('26',gui)+pixField('52','0000')+pixField('53','986')+amt+pixField('58','BR')+pixField('59',name)+pixField('60',city)+pixField('62',pixField('05',tid))+'6304';
  return base+crc16CCITT(base);
}
function monthLiveTotals(ym){
  const rawItems=monthItems(ym);
  const sp={Cristian:0,Pedro:0,Conjunto:0};
  const g={parcelas:0,fixas:0,assinaturas:0,variaveis:0};
  rawItems.forEach(i=>{sp[i.quem]=(sp[i.quem]||0)+i.valor;const grp=GROUP[i.tipo];if(grp)g[grp]+=i.valor});
  const payC=sp.Cristian+sp.Conjunto*0.5,payP=sp.Pedro+sp.Conjunto*0.5;
  const offAll=S.off.filter(o=>offActive(o,ym)),offDespAll=offAll.filter(o=>o.kind!=='receita'),offRecAll=offAll.filter(o=>o.kind==='receita');
  const recByQ={Cristian:0,Pedro:0,Conjunto:0};
  offRecAll.forEach(o=>{recByQ[o.quem]=(recByQ[o.quem]||0)+offV(o,ym)});
  const recC=recByQ.Cristian+recByQ.Conjunto*0.5,recP=recByQ.Pedro+recByQ.Conjunto*0.5;
  const offIndC=offDespAll.filter(o=>o.quem==='Cristian').reduce((a,o)=>a+offV(o,ym),0);
  const offIndP=offDespAll.filter(o=>o.quem==='Pedro').reduce((a,o)=>a+offV(o,ym),0);
  const offConj=offDespAll.filter(o=>o.quem==='Conjunto').reduce((a,o)=>a+offV(o,ym),0);
  const offsC=offIndC+offConj*0.5,offsP=offIndP+offConj*0.5;
  const totIndC=sp.Cristian+offIndC,totIndP=sp.Pedro+offIndP,totConj=sp.Conjunto+offConj,meioConj=totConj*0.5;
  const totC=payC+offsC,totP=payP+offsP;
  return {rawItems,sp,g,payC,payP,offAll,offDespAll,offRecAll,recByQ,recC,recP,offIndC,offIndP,offConj,offsC,offsP,totIndC,totIndP,totConj,meioConj,totC,totP};
}
function freezeMonth(ym){
  const t=monthLiveTotals(ym);
  saveSnap(`Antes de encerrar mês ${lab(ym)}`);
  S.extras.closedMonths=S.extras.closedMonths||{};
  const pix=S.extras.acertoPix?.[ym]||null;
  S.extras.closedMonths[ym]={
    ym,
    closedAt:new Date().toISOString(),
    closedBy:currentUser||'Local',
    recByQ:t.recByQ,
    recC:t.recC,recP:t.recP,rendaTotal:t.recC+t.recP,
    g:t.g,
    card:{Cristian:t.sp.Cristian,Pedro:t.sp.Pedro,Conjunto:t.sp.Conjunto,total:t.sp.Cristian+t.sp.Pedro+t.sp.Conjunto,payC:t.payC,payP:t.payP},
    off:{Cristian:t.offIndC,Pedro:t.offIndP,Conjunto:t.offConj,total:t.offIndC+t.offIndP+t.offConj,offsC:t.offsC,offsP:t.offsP},
    totIndC:t.totIndC,totIndP:t.totIndP,totConj:t.totConj,meioConj:t.meioConj,
    totC:t.totC,totP:t.totP,totalGeral:t.totC+t.totP,
    sobraC:t.recC-t.totC,sobraP:t.recP-t.totP,sobraCasal:(t.recC+t.recP)-(t.totC+t.totP),
    acertoOk:isPaid(ym,'acerto'),
    pix:pix?structuredClone(pix):null,
    items:{
      card:t.rawItems.map(i=>({desc:i.desc,quem:i.quem,tipo:i.tipo,cat:i.cat||'Outros',valor:+i.valor.toFixed(2),sub:i.sub||''})),
      off:t.offAll.map(o=>({id:o.id,nome:o.nome,quem:o.quem,kind:o.kind,valor:+offV(o,ym).toFixed(2),venc:o.venc||null,cat:o.cat||'Outros',origem:o.origem||''}))
    }
  };
  logAudit('Fechamento oficial',`Encerrou o mês ${lab(ym)} (DRE congelada · Acerto Pedro ${brl(t.totP)})`);
}
function unfreezeMonth(ym){
  if(!S.extras.closedMonths?.[ym])return false;
  if(!confirm(`Reabrir o mês ${lab(ym)}? Os valores passarão a ser recalculados dinamicamente a partir das faturas e contas atuais.`))return false;
  saveSnap(`Antes de reabrir mês ${lab(ym)}`);
  delete S.extras.closedMonths[ym];
  logAudit('Reabertura de mês',`Reabriu o mês ${lab(ym)} para recálculo dinâmico`);
  return true;
}
function buildWhatsAppAcerto(ym,ctx){
  const cfg=S.extras.pixConfig||{},pix=ctx.pix||S.extras.acertoPix?.[ym]||null;
  const pedroCard=ctx.cardItems.filter(i=>i.quem==='Pedro'||i.quem==='Conjunto').map(i=>({
    nome:i.desc,part:i.quem==='Conjunto'?i.valor*0.5:i.valor,tag:i.quem==='Conjunto'?`50% de ${brl(i.valor)}`:'100% Pedro'
  }));
  const pedroOff=ctx.offDesp.filter(o=>o.quem==='Pedro'||o.quem==='Conjunto').map(o=>({
    nome:o.nome,part:o.quem==='Conjunto'?o.valor*0.5:o.valor,tag:o.quem==='Conjunto'?`50% de ${brl(o.valor)}`:'100% Pedro'
  }));
  const allP=[...pedroOff,...pedroCard].sort((a,b)=>b.part-a.part);
  const top=allP.slice(0,12),rest=allP.slice(12);
  const restSum=rest.reduce((a,x)=>a+x.part,0);
  const lines=[
    `💸 *Acerto Financeiro — ${lab(ym)}*${ctx.frozen?' (Fechamento Oficial 🔒)':''}`,
    ``,
    `*Total a transferir (Pedro → ${cfg.titular||'Cristian'}): ${brl(ctx.totP)}*`,
    `• Cartão (Indiv. Pedro + 50% Conj.): ${brl(ctx.payP)}`,
    `• Fora do cartão (Aluguel/Carro/etc.): ${brl(ctx.offsP)}`,
    ``
  ];
  if(top.length){
    lines.push(`📋 *Detalhamento dos principais itens:*`);
    top.forEach(x=>lines.push(`- ${x.nome} (${x.tag}): ${brl(x.part)}`));
    if(rest.length)lines.push(`- +${rest.length} outros itens: ${brl(restSum)}`);
    lines.push(``);
  }
  if(cfg.chave)lines.push(`🔑 *Chave Pix (${cfg.titular||'Cristian'}):* ${cfg.chave}`);
  if(pix)lines.push(`✅ _Acerto registrado: ${brl(pix.valor)} em ${fmtDateBR(pix.data)}${pix.codigo?' (Ref: '+pix.codigo+')':''}_`);
  return lines.join('\n').trim();
}


const nextYearDec=()=>`${+S.settings.base.slice(0,4)+1}-12`;
const endMonth=()=>{const e=S.settings.flowEnd;return e&&e>S.settings.base?e:nextYearDec()};
const firstFat=()=>S.tx.map(x=>x.fatura).sort()[0]||S.settings.base;
const allMonths=()=>{const mx=endMonth()>'2028-12'?endMonth():'2028-12';return Array.from({length:diffM(firstFat(),mx)+1},(_,i)=>addM(firstFat(),i))};
const horizonCtrl=()=>{
  const def=nextYearDec(),curEnd=endMonth(),by=+S.settings.base.slice(0,4);
  const optsList=[[ '',`${lab(def)} (dez do ano seguinte – padrão)`],[addM(S.settings.base,12),`${lab(addM(S.settings.base,12))} (+12 meses)`],[`${by}-12`,`${lab(by+'-12')} (fim deste ano)`],[`${by+2}-12`,`${lab((by+2)+'-12')} (dez/${String(by+2).slice(2)})`],[`${by+3}-12`,`${lab((by+3)+'-12')} (dez/${String(by+3)+'-12'.slice(2)})`]].filter(([v])=>!v||v>S.settings.base);
  const raw=S.settings.flowEnd||'';
  return `<label class="note" style="display:inline-flex;align-items:center;gap:6px">Projetar até: <select data-s="flowEnd">${optsList.map(([v,l])=>`<option value="${v}" ${raw===v?'selected':''}>${l}</option>`).join('')}</select> <span class="note">(${diffM(S.settings.base,curEnd)} meses à frente)</span></label>`;
};
function series(){
  const base=S.settings.base,proj=compute(Math.max(1,diffM(base,endMonth())));
  const hist=allMonths().filter(m=>m<base).map(ym=>{
    const fr=S.extras.closedMonths?.[ym];
    if(fr){
      const g={parcelas:0,fixas:0,assinaturas:0,variaveis:0};
      (fr.items?.card||[]).forEach(x=>{if(GROUP[x.tipo])g[GROUP[x.tipo]]+=x.valor*weight(x.quem)});
      const cardByQ={Cristian:fr.card.Cristian||0,Pedro:fr.card.Pedro||0,Conjunto:fr.card.Conjunto||0};
      const offByQ={Cristian:fr.off.Cristian||0,Pedro:fr.off.Pedro||0,Conjunto:fr.off.Conjunto||0};
      const byQ={Cristian:cardByQ.Cristian+offByQ.Cristian,Pedro:cardByQ.Pedro+offByQ.Pedro,Conjunto:cardByQ.Conjunto+offByQ.Conjunto};
      const renda=PEOPLE.reduce((a,q)=>a+(fr.recByQ?.[q]||0)*weight(q),0)||((fr.recC||0)+(fr.recP||0))*(view==='casal'?1:0.5);
      const cartao=PEOPLE.reduce((a,q)=>a+cardByQ[q]*weight(q),0),fora=PEOPLE.reduce((a,q)=>a+offByQ[q]*weight(q),0);
      const comprometido=g.parcelas+g.fixas+g.assinaturas,total=cartao+fora;
      return {ym,k:-1,g,byQ,cardByQ,offByQ,renda,fora,comprometido,cartao,total,sobra:renda-total,saldo:null,frozen:true};
    }
    const g={parcelas:0,fixas:0,assinaturas:0,variaveis:0},byQ={Cristian:0,Pedro:0,Conjunto:0},cardByQ={Cristian:0,Pedro:0,Conjunto:0},offByQ={Cristian:0,Pedro:0,Conjunto:0};
    S.tx.forEach(x=>{if(x.fatura===ym&&live(x)){g[GROUP[x.tipo]]+=x.valor*weight(x.quem);byQ[x.quem]+=x.valor;cardByQ[x.quem]+=x.valor}});
    let renda=0,fora=0;S.off.forEach(o=>{if(!offActive(o,ym))return;const raw=offV(o,ym),v=raw*weight(o.quem);if(o.kind==='receita')renda+=v;else{fora+=v;byQ[o.quem]+=raw;offByQ[o.quem]+=raw}});
    const comprometido=g.parcelas+g.fixas+g.assinaturas,cartao=comprometido+g.variaveis,total=cartao+fora;
    return {ym,k:-1,g,byQ,cardByQ,offByQ,renda,fora,comprometido,cartao,total,sobra:renda-total,saldo:null};
  });
  return [...hist,...proj];
}

function buildItemMatrix(RRows){
  const Ms=RRows.map(r=>r.ym),base=S.settings.base,incP=!!S.settings.includePlans,E=S.extras;
  const sumArr=arr=>arr.reduce((a,b)=>a+b,0);
  // 1. Receitas
  const incItems=[];
  S.off.filter(o=>o.kind==='receita').forEach(o=>{
    const vals=Ms.map(ym=>offActive(o,ym)?offV(o,ym):0);
    if(sumArr(vals)>0)incItems.push({nome:o.nome,quem:o.quem,orig:'Receita mensal',vals,tot:sumArr(vals)});
  });
  if(incP){
    E.saques.filter(x=>x.destino==='caixa').forEach(x=>{
      const vals=Ms.map(ym=>ym>=base&&x.mes===ym?(x.valor||0):0);
      if(sumArr(vals)>0)incItems.push({nome:`Saque FGTS: ${x.nome||'Caixa'}`,quem:x.quem,orig:'Saque FGTS (Plano)',vals,tot:sumArr(vals)});
    });
  }
  // 2. Despesas por grupo (Cristian, Pedro, Conjunto)
  let res=E.reserva?.saldo||0;const rr=(E.reserva?.rend||0)/100;
  const resByM={};
  if(incP){
    months(Math.max(1,diffM(base,endMonth()))).forEach(ym=>{
      const inRes=!(E.reserva.meta&&res>=E.reserva.meta)?(E.reserva.aporte||0):0;
      res=res*(1+rr)+inRes;resByM[ym]=inRes;
    });
  }
  const groups={Cristian:[],Pedro:[],Conjunto:[]};
  const varSub={Cristian:[],Pedro:[],Conjunto:[]};
  const varTotByQ={Cristian:Ms.map(()=>0),Pedro:Ms.map(()=>0),Conjunto:Ms.map(()=>0)};
  PEOPLE.forEach(q=>{
    // A. Fora do cartão
    S.off.filter(o=>o.kind!=='receita'&&o.quem===q).sort((a,b)=>b.valor-a.valor).forEach(o=>{
      const vals=Ms.map(ym=>offActive(o,ym)?offV(o,ym):0);
      if(sumArr(vals)>0)groups[q].push({nome:o.nome,cat:o.cat||'Fora do cartão',orig:`Fora do cartão${o.freq==='anual'?' · Anual':''}`,vals,tot:sumArr(vals)});
    });
    // B. Cartão (Fixas, Assinaturas, Parceladas)
    S.tx.filter(x=>live(x)&&x.quem===q&&x.tipo!=='variavel').forEach(x=>{
      const vals=Ms.map(ym=>txValAt(x,ym));
      if(sumArr(vals)>0){
        const endParc=x.tipo==='parcelada'&&x.tot?lab(addM(x.fatura,x.tot-x.cur)):'';
        const orig=x.tipo==='parcelada'?`Cartão · Parc. ${x.cur}/${x.tot}${endParc?` (até ${endParc})`:''}`:
          x.tipo==='fixa'?`Cartão · Fixa${x.fim?` (até ${lab(x.fim)})`:''}`:
          x.tipo==='assinatura_mensal'?`Cartão · Assinatura${x.fim?` (até ${lab(x.fim)})`:''}`:'Cartão · Anual';
        groups[q].push({nome:x.desc,cat:x.cat||'',orig,vals,tot:sumArr(vals),prio:x.tipo==='fixa'?1:x.tipo==='parcelada'?2:3});
      }
    });
    // C. Estimativas futuras lançadas manualmente
    if(S.settings.includeVar){
      (S.settings.varItems||[]).filter(v=>v.quem===q&&v.ativo&&v.valor>0).forEach(v=>{
        const vals=Ms.map(ym=>ym>base&&vItemActive(v,ym)?v.valor:0);
        if(sumArr(vals)>0)groups[q].push({nome:`📌 ${v.nome}`,cat:v.cat||'Estimativa',orig:`Estimativa futura${v.fim?` (até ${lab(v.fim)})`:''}`,vals,tot:sumArr(vals),prio:4});
      });
    }
    // D. Planos (compras e investimentos) e Projetos de Vida
    if(incP){
      E.compras.filter(c=>c.quem===q).forEach(c=>{
        const np=Math.max(1,c.np||1);
        const vals=Ms.map(ym=>{if(ym<base)return 0;const d=diffM(c.mes,ym);return d>=0&&d<np?c.valor/np:0});
        if(sumArr(vals)>0)groups[q].push({nome:`📋 ${c.nome}`,cat:'Plano',orig:`Compra planejada (${np}x)`,vals,tot:sumArr(vals),prio:5});
      });
      E.inv.filter(i=>i.quem===q).forEach(i=>{
        const vals=Ms.map(ym=>ym>=base&&i.inicio<=ym&&(!i.fim||ym<=i.fim)?(i.valor||0):0);
        if(sumArr(vals)>0)groups[q].push({nome:`📈 ${i.nome}`,cat:'Investimento',orig:'Aporte planejado',vals,tot:sumArr(vals),prio:5});
      });
      (E.projetos||[]).filter(p=>(p.quem||'Conjunto')===q).forEach(p=>{
        const vals=Ms.map(ym=>ym>=base&&projActive(p,ym)?(+p.aporteMensal||0):0);
        if(sumArr(vals)>0)groups[q].push({nome:`🎯 ${p.nome}`,cat:'Projeto de Vida',orig:'Projeto de Vida',vals,tot:sumArr(vals),prio:5});
      });
      if(q==='Conjunto'){
        const vals=Ms.map(ym=>resByM[ym]||0);
        if(sumArr(vals)>0)groups.Conjunto.push({nome:'🛡️ Aporte Reserva de Emergência',cat:'Reserva',orig:'Plano',vals,tot:sumArr(vals),prio:5});
      }
    }
    // E. Compras variáveis já lançadas na fatura
    S.tx.filter(x=>live(x)&&x.quem===q&&x.tipo==='variavel').sort((a,b)=>b.valor-a.valor).forEach(x=>{
      const vals=Ms.map(ym=>txValAt(x,ym));
      const t=sumArr(vals);
      if(t>0){
        vals.forEach((v,idx)=>varTotByQ[q][idx]+=v);
        varSub[q].push({nome:x.desc,cat:x.cat||'Variável',orig:`Cartão · Variável (${lab(x.fatura)})`,vals,tot:t});
      }
    });
  });
  return {Ms,incItems,groups,varSub,varTotByQ};
}

function monthDetailBox(ym){
  const fr=S.extras.closedMonths?.[ym];
  const rawCard=fr?(fr.items?.card||[]):monthItems(ym);
  const offDesp=fr?(fr.items?.off||[]).filter(o=>o.kind!=='receita'):S.off.filter(o=>offActive(o,ym)&&o.kind!=='receita').map(o=>({...o,valor:offV(o,ym)}));
  const box=(q,title,clsHdr,isConj)=>{
    const cList=rawCard.filter(i=>i.quem===q),oList=offDesp.filter(o=>o.quem===q);
    const all=[...oList.map(x=>({nome:x.nome,orig:'Fora do cartão',val:x.valor})),...cList.map(x=>({nome:x.desc,orig:`Cartão${x.sub?' · '+x.sub:''}`,val:x.valor}))].sort((a,b)=>b.val-a.val);
    const tot=all.reduce((a,x)=>a+x.val,0);
    return `<div class="det-box">
      <h4 style="color:${clsHdr}"><span>${title}</span><b>${brl(tot)}${isConj?` <small>(50%: ${brl(tot/2)})</small>`:''}</b></h4>
      ${all.length?`<ul class="det-list">${all.map(x=>`<li><span>${esc(x.nome.slice(0,36))} <small class="note">(${x.orig})</small></span><b>${brl(x.val)}</b></li>`).join('')}</ul>`:`<div class="note">Nenhum item neste mês.</div>`}
    </div>`;
  };
  return `<div class="det-grid">
    ${box('Cristian','🔵 Individuais Cristian (100%)','var(--accent)',false)}
    ${box('Pedro','🟠 Individuais Pedro (100%)','#d9480f',false)}
    ${box('Conjunto','🟢 Conjuntas (Divididas 50/50)','#2b8a3e',true)}
  </div>`;
}

function rGeral(){
  const R=series(),yrs=[...new Set(R.map(r=>r.ym.slice(0,4)))];
  const sum=(rows,f)=>rows.reduce((a,r)=>a+r[f],0);
  const nrev=S.tx.filter(x=>x.rev).length,base=S.settings.base;
  const C=compute(Math.max(1,diffM(base,endMonth()))),k0=C[0],k1=C[1],parcRest=C.slice(1).reduce((a,r)=>a+r.g.parcelas,0),fim=R[R.length-1],avg=C.slice(1).reduce((a,r)=>a+r.sobra,0)/(C.length-1),sp=split(base);
  const pctRenda=k0.renda?Math.round(k0.cartao/k0.renda*100):0;
  const optAtivas=(S.settings.varItems||[]).filter(v=>v.ativo&&v.valor>0).length;

  // Build main table according to geralMode
  let mainTable='';
  if(geralMode==='linhas'){
    const RRows=showPastMatrix?R:R.filter(r=>r.ym>=base);
    const M=buildItemMatrix(RRows),cols=M.Ms.length+3;
    const sumRow=fn=>RRows.map(fn).reduce((a,b)=>a+b,0);
    const renderGroup=(q,secCls,subCls,title,code)=>{
      const items=M.groups[q],vSub=M.varSub[q],vTot=M.varTotByQ[q],vSum=vTot.reduce((a,b)=>a+b,0),isOpen=openVarQ.has(q);
      const totVals=RRows.map(r=>r.byQ[q]),totAll=totVals.reduce((a,b)=>a+b,0);
      return `<tr class="sec-hdr ${secCls}"><td colspan="${cols}">${title}</td></tr>
      ${items.map(it=>`<tr class="item-row"><td class="l"><b>${esc(it.nome.slice(0,44))}</b></td><td class="l"><span class="pill-orig">${esc(it.orig)}</span></td>${it.vals.map(v=>`<td>${cellN(v)}</td>`).join('')}<td class="bl"><b>${num(it.tot)}</b></td></tr>`).join('')}
      ${vSum>0?`<tr class="item-row" style="cursor:pointer" data-act="tog-varq" data-q="${q}" title="Clique para expandir/recolher cada compra variável avulsa da fatura">
        <td class="l"><span style="color:var(--accent);font-weight:600">${isOpen?'▾':'▸'} Compras variáveis lançadas na fatura (${vSub.length} itens)</span> <small class="note">(clique p/ ${isOpen?'ocultar':'ver itens'})</small></td>
        <td class="l"><span class="pill-orig">Cartão · Fatura atual</span></td>
        ${vTot.map(v=>`<td>${cellN(v)}</td>`).join('')}
        <td class="bl"><b>${num(vSum)}</b></td>
      </tr>
      ${isOpen?vSub.map(sv=>`<tr class="item-sub"><td class="l">↳ ${esc(sv.nome.slice(0,42))}</td><td class="l"><small class="note">${esc(sv.cat)}</small></td>${sv.vals.map(v=>`<td>${cellN(v)}</td>`).join('')}<td class="bl">${num(sv.tot)}</td></tr>`).join(''):''}`:''}
      ${!items.length&&!vSum?`<tr class="item-row"><td class="l note" colspan="${cols}">Nenhum item lançado neste grupo.</td></tr>`:''}
      <tr class="sub-row ${subCls}"><td class="l">= SOMA ${code}</td><td class="l"><small>Subtotal das linhas acima</small></td>${totVals.map(v=>`<td>${num(v)}</td>`).join('')}<td class="bl">${num(totAll)}</td></tr>`;
    };
    const conj50Vals=RRows.map(r=>r.byQ.Conjunto*0.5),conj50All=conj50Vals.reduce((a,b)=>a+b,0);
    const payCVals=RRows.map(r=>r.byQ.Cristian+r.byQ.Conjunto*0.5),payCAll=payCVals.reduce((a,b)=>a+b,0);
    const payPVals=RRows.map(r=>r.byQ.Pedro+r.byQ.Conjunto*0.5),payPAll=payPVals.reduce((a,b)=>a+b,0);
    mainTable=`<div class="note" style="margin-bottom:10px">Cada bloco abaixo lista <b>exatamente quais itens entram na soma</b> de cada mês, seguido pela <b>linha de subtotal (<code>= SOMA</code>)</b> correspondente. Traços (<code>–</code>) indicam meses sem cobrança daquele item.</div>
    <div class="tw"><table>
      <thead><tr><th class="l col-item-hdr">Item / Linha que entra na soma</th><th class="l">Origem / Regra</th>${RRows.map(r=>`<th class="${r.ym===base?'grp-tot':''}"><a href="#" data-mes="${r.ym}">${lab(r.ym)}</a><br><small style="font-weight:400;text-transform:none">${r.k<0?'real':r.k===0?'atual':'proj.'}</small></th>`).join('')}<th class="bl">Soma Período</th></tr></thead>
      <tbody>
        <tr class="sec-hdr sec-inc"><td colspan="${cols}">💰 1. RECEITAS (ENTRADAS MENSAIS)</td></tr>
        ${M.incItems.map(it=>`<tr class="item-row"><td class="l"><b>${esc(it.nome)}</b> <span class="tag t-${it.quem}">${it.quem}</span></td><td class="l"><span class="pill-orig">${it.orig}</span></td>${it.vals.map(v=>`<td>${cellN(v)}</td>`).join('')}<td class="bl"><b>${num(it.tot)}</b></td></tr>`).join('')}
        <tr class="sub-row"><td class="l">= SOMA RECEITAS (A)</td><td class="l"><small>Total de entradas no mês</small></td>${RRows.map(r=>`<td>${num(r.renda)}</td>`).join('')}<td class="bl">${num(sumRow(r=>r.renda))}</td></tr>

        ${renderGroup('Cristian','sec-c','sub-c','🔵 2. DESPESAS INDIVIDUAIS — CRISTIAN (100% Cristian · Não divide)','INDIVIDUAL CRISTIAN (B1)')}
        ${renderGroup('Pedro','sec-p','sub-p','🟠 3. DESPESAS INDIVIDUAIS — PEDRO (100% Pedro · Inclui QuintoAndar na fatura)','INDIVIDUAL PEDRO (B2)')}
        ${renderGroup('Conjunto','sec-j','sub-j','🟢 4. DESPESAS CONJUNTAS — DIVIDIDAS 50/50 (Aluguel, Carro e itens Conjunto)','CONJUNTAS 100% (C)')}
        <tr class="sub-row sub-j50"><td class="l">↳ 50% CONJUNTO PARA CADA UM (C ÷ 2)</td><td class="l"><small>Metade p/ Cristian · Metade p/ Pedro</small></td>${conj50Vals.map(v=>`<td>${num(v)}</td>`).join('')}<td class="bl">${num(conj50All)}</td></tr>

        <tr class="sec-hdr sec-end"><td colspan="${cols}">📌 5. FECHAMENTO MENSAL (COMO AS SOMAS SE JUNTAM)</td></tr>
        <tr class="sub-row sub-c"><td class="l">= TOTAL CRISTIAN PAGA (B1 + 50% Conjunto)</td><td class="l"><small>Indiv. Cristian + 50% Conj.</small></td>${payCVals.map(v=>`<td>${num(v)}</td>`).join('')}<td class="bl">${num(payCAll)}</td></tr>
        <tr class="sub-row sub-p"><td class="l">= TOTAL PEDRO PAGA (B2 + 50% Conjunto)</td><td class="l"><small>Indiv. Pedro + 50% Conj.</small></td>${payPVals.map(v=>`<td>${num(v)}</td>`).join('')}<td class="bl">${num(payPAll)}</td></tr>
        <tr class="tot"><td class="l">= TOTAL GERAL DE DESPESAS (B1 + B2 + C)</td><td class="l"><small>Cristian paga + Pedro paga</small></td>${RRows.map(r=>`<td>${num(r.total)}</td>`).join('')}<td class="bl">${num(sumRow(r=>r.total))}</td></tr>
        <tr class="sub-row"><td class="l">= SOBRA / FALTA DO MÊS (Receitas A − Despesas)</td><td class="l"><small>Resultado líquido mensal</small></td>${RRows.map(r=>`<td class="${cls(r.sobra)}">${num(r.sobra)}</td>`).join('')}<td class="bl ${cls(sumRow(r=>r.sobra))}">${num(sumRow(r=>r.sobra))}</td></tr>
        <tr class="sub-row"><td class="l">= SALDO ACUMULADO EM CONTA</td><td class="l"><small>Caixa acumulado</small></td>${RRows.map(r=>`<td class="${cls(r.saldo)}">${r.saldo==null?'–':num(r.saldo)}</td>`).join('')}<td class="bl ${cls(RRows[RRows.length-1]?.saldo)}">${num(RRows[RRows.length-1]?.saldo||0)}</td></tr>
      </tbody>
    </table></div>`;
  }else if(geralMode==='meses'){
    mainTable=`<div class="note" style="margin-bottom:10px">As colunas estão separadas por blocos coloridos (<code>Cartão + Fora = Total do Grupo</code>). Clique em <b>▶ Itens</b> em qualquer mês para abrir os itens individuais e conjuntos daquele mês.</div>
    <div class="tw"><table>
      <thead>
        <tr>
          <th colspan="2" class="grp-hdr">Mês & Entrada</th>
          <th colspan="3" class="grp-hdr grp-c bl">🔵 Individual Cristian (100%)</th>
          <th colspan="3" class="grp-hdr grp-p bl">🟠 Individual Pedro (100%)</th>
          <th colspan="4" class="grp-hdr grp-j bl">🟢 Despesas Conjuntas (50/50)</th>
          <th colspan="2" class="grp-hdr grp-tot bl">📌 Total Pago por Pessoa</th>
          <th colspan="3" class="grp-hdr bl">💰 Fechamento do Casal</th>
        </tr>
        <tr>
          <th class="l">Mês</th><th>Renda</th>
          <th class="bl">Cartão C</th><th>+ Fora C</th><th class="col-c">= Indiv. C</th>
          <th class="bl">Cartão P</th><th>+ Fora P</th><th class="col-p">= Indiv. P</th>
          <th class="bl">Cartão Conj.</th><th>+ Fora Conj.</th><th class="col-j">= Conj. 100%</th><th class="col-j">50% cada</th>
          <th class="bl col-c">Cristian paga</th><th class="col-p">Pedro paga</th>
          <th class="bl col-sum">Total Desp.</th><th>Sobra/falta</th><th>Saldo</th>
        </tr>
      </thead>
      <tbody>
        ${R.map(r=>{
          const mConj=r.byQ.Conjunto*0.5,pC=r.byQ.Cristian+mConj,pP=r.byQ.Pedro+mConj,open=openMesDet.has(r.ym);
          return `<tr class="${r.ym===base?'tot':''}">
            <td class="l"><button class="b g" data-act="tog-mesdet" data-ym="${r.ym}" style="padding:2px 7px;font-size:11px;margin-right:6px" title="Ver itens que entram na soma deste mês">${open?'▼':'▶'} Itens</button><a href="#" data-mes="${r.ym}">${lab(r.ym)}</a> <small class="note">(${r.k<0?'real':r.k===0?'atual':'proj.'})</small></td>
            <td>${num(r.renda)}</td>
            <td class="bl">${cellN(r.cardByQ.Cristian)}</td><td>${cellN(r.offByQ.Cristian)}</td><td class="col-c">${num(r.byQ.Cristian)}</td>
            <td class="bl">${cellN(r.cardByQ.Pedro)}</td><td>${cellN(r.offByQ.Pedro)}</td><td class="col-p">${num(r.byQ.Pedro)}</td>
            <td class="bl">${cellN(r.cardByQ.Conjunto)}</td><td>${cellN(r.offByQ.Conjunto)}</td><td class="col-j">${num(r.byQ.Conjunto)}</td><td class="col-j">${num(mConj)}</td>
            <td class="bl col-c">${num(pC)}</td><td class="col-p">${num(pP)}</td>
            <td class="bl col-sum">${num(r.total)}</td><td class="${cls(r.sobra)}"><b>${num(r.sobra)}</b></td><td class="${cls(r.saldo)}">${r.saldo==null?'–':num(r.saldo)}</td>
          </tr>
          ${open?`<tr><td colspan="17" style="background:var(--bg);padding:8px 14px">${monthDetailBox(r.ym)}</td></tr>`:''}`;
        }).join('')}
      </tbody>
    </table></div>`;
  }else{
    mainTable=`<div class="note" style="margin-bottom:10px">Visão por natureza do gasto: <code>Parcelas + Fixas + Assinaturas + Variáveis/Estimativas = Total Cartão</code> + <code>Fora do Cartão</code> = <code>Total Despesas</code>.</div>
    <div class="tw"><table>
      <thead>
        <tr>
          <th colspan="2" class="grp-hdr">Mês & Entrada</th>
          <th colspan="5" class="grp-hdr grp-c bl">💳 Composição da Fatura do Cartão</th>
          <th colspan="4" class="grp-hdr grp-tot bl">💰 Total Geral e Saldo</th>
        </tr>
        <tr>
          <th class="l">Mês</th><th>Renda</th>
          <th class="bl">Parcelas</th><th>+ Fixas</th><th>+ Assinaturas</th><th>+ Var. / Estim.</th><th class="col-sum">= Total Cartão</th>
          <th class="bl">+ Fora do cartão</th><th class="col-sum">= Total Despesas</th><th>Sobra/falta</th><th>Saldo</th>
        </tr>
      </thead>
      <tbody>
        ${R.map(r=>`<tr class="${r.ym===base?'tot':''}">
          <td class="l"><a href="#" data-mes="${r.ym}">${lab(r.ym)}</a> <small class="note">(${r.k<0?'real':r.k===0?'atual':'proj.'})</small></td>
          <td>${num(r.renda)}</td>
          <td class="bl">${cellN(r.g.parcelas)}</td><td>${cellN(r.g.fixas)}</td><td>${cellN(r.g.assinaturas)}</td><td>${cellN(r.g.variaveis)}</td><td class="col-sum">${num(r.cartao)}</td>
          <td class="bl">${num(r.fora)}</td><td class="col-sum">${num(r.total)}</td><td class="${cls(r.sobra)}"><b>${num(r.sobra)}</b></td><td class="${cls(r.saldo)}">${r.saldo==null?'–':num(r.saldo)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  return `${nrev?`<div class="warn">${nrev} lançamentos aguardando validação (aba <b>Importar / Revisar</b>).</div>`:''}
  ${dueAlertsPanel(todayYM(),false)}
  <div class="bar" style="justify-content:space-between;margin-bottom:10px">
    ${horizonCtrl()}
    <span class="note">${optAtivas?`📌 <b>${optAtivas} estimativa(s)</b> ativa(s)`:'Projeção apenas de parcelas e contas programadas'}${S.settings.includePlans?' · 📋 com Planos':''}</span>
  </div>
  <div class="cards">
    <div class="card"><small>Fatura atual (${lab(k0.ym)})</small><b>${brl(k0.cartao)}</b><small class="sub">${pctRenda}% da renda · Próx. (${lab(k1.ym)}): <b>${brl(k1.cartao)}</b></small></div>
    <div class="card c-warn"><small>Parcelas futuras (${C.length-1} meses)</small><b>${brl(parcRest)}</b><small class="sub">comprometido até ${lab(fim.ym)}</small></div>
    <div class="card ${avg>=0?'c-pos':'c-neg'}"><small>Sobra média & Saldo final</small><b class="${cls(avg)}">${brl(avg)}/mês</b><small class="sub">Saldo em ${lab(fim.ym)}: <b class="${cls(fim.saldo)}">${brl(fim.saldo)}</b></small></div>
    <div class="card"><small>Divisão em ${lab(base)} (Indiv. + 50%)</small><b style="font-size:16px">C: ${brl(sp.payC)} · P: ${brl(sp.payP)}</b><small class="sub">Indiv. C ${brl(sp.Cristian)} · P ${brl(sp.Pedro)} · Conj. ${brl(sp.Conjunto)}</small></div>
  </div>
  <div class="sec-lbl">Evolução &amp; Resumo Anual</div>
  <div class="panel"><h2>Série temporal (${lab(R[0].ym)} a ${lab(R[R.length-1].ym)})</h2>
  <div class="note">Passado = real · Atual = lançada · Futuro = programado${optAtivas?' + estimativas':''}. Clique em uma barra para abrir o mês.</div>
  <canvas id="cg" height="105"></canvas></div>
  <div class="panel"><h2>Resumo por ano</h2><div class="tw"><table>
    <thead>
      <tr>
        <th colspan="2" class="grp-hdr">Ano & Renda</th>
        <th colspan="4" class="grp-hdr grp-j bl">Separação por Pessoa (Individuais 100% vs Conjuntas 50/50)</th>
        <th colspan="2" class="grp-hdr grp-tot bl">Quanto cada um paga no ano</th>
        <th colspan="4" class="grp-hdr bl">Fechamento Anual</th>
      </tr>
      <tr>
        <th class="l">Ano</th><th>Renda</th>
        <th class="bl col-c">Indiv. Cristian</th><th class="col-p">Indiv. Pedro</th><th class="col-j">Conjuntas (100%)</th><th class="col-j">50% Conj. (cada)</th>
        <th class="bl col-c">Total Cristian</th><th class="col-p">Total Pedro</th>
        <th class="bl">Cartão</th><th>Fora do cartão</th><th class="col-sum">Total Despesas</th><th>Sobra/falta</th>
      </tr>
    </thead>
    <tbody>
    ${yrs.map(y=>{const rs=R.filter(r=>r.ym.startsWith(y)),iC=rs.reduce((a,r)=>a+r.byQ.Cristian,0),iP=rs.reduce((a,r)=>a+r.byQ.Pedro,0),cj=rs.reduce((a,r)=>a+r.byQ.Conjunto,0),mCj=cj*0.5;return `<tr><td class="l"><b>${y}</b></td><td>${num(sum(rs,'renda'))}</td><td class="bl col-c">${num(iC)}</td><td class="col-p">${num(iP)}</td><td class="col-j">${num(cj)}</td><td class="col-j">${num(mCj)}</td><td class="bl col-c">${num(iC+mCj)}</td><td class="col-p">${num(iP+mCj)}</td><td class="bl">${num(sum(rs,'cartao'))}</td><td>${num(sum(rs,'fora'))}</td><td class="col-sum">${num(sum(rs,'total'))}</td><td class="${cls(sum(rs,'sobra'))}"><b>${num(sum(rs,'sobra'))}</b></td></tr>`}).join('')}
    </tbody></table></div></div>
  <div class="sec-lbl">Detalhamento Mês a Mês</div>
  <div class="panel">
    <div class="bar" style="justify-content:space-between;margin-bottom:10px">
      <h2 style="margin:0">Todos os meses (Individuais × Conjuntas 50/50)</h2>
      <div class="bar" style="margin:0">
        <div class="seg-bar">
          <button data-act="gmode" data-mode="linhas" class="${geralMode==='linhas'?'on':''}">📑 Itens × Meses</button>
          <button data-act="gmode" data-mode="meses" class="${geralMode==='meses'?'on':''}">📅 Resumo Agrupado</button>
          <button data-act="gmode" data-mode="tipos" class="${geralMode==='tipos'?'on':''}">💳 Por Tipo</button>
        </div>
        ${geralMode==='linhas'?`<label class="note" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="chk-past-m" ${showPastMatrix?'checked':''}> Incluir passadas</label>`:''}
      </div>
    </div>
    ${mainTable}
    <div class="bar" style="margin-top:12px"><button class="b g" data-act="export-xlsx">📊 Exportar planilha completa (.xlsx)</button></div>
  </div>`;
}
function drawGeral(){
  const R=series(),L=R.map(r=>lab(r.ym));
  charts.push(new Chart(document.getElementById('cg'),{data:{labels:L,datasets:[
    ...Object.keys(GLAB).map(g=>({type:'bar',stack:'s',label:GLAB[g],data:R.map(r=>r.g[g]),backgroundColor:GCOL[g]})),
    {type:'bar',stack:'s',label:'Fora do cartão',data:R.map(r=>r.fora),backgroundColor:'#b0bec5'},
    {type:'line',label:'Renda',data:R.map(r=>r.renda),borderColor:'#2e9e5b',pointRadius:0,tension:.2}]},
    options:{scales:{x:{stacked:true},y:{stacked:true}},onClick:(e,els)=>{if(els.length){MS=R[els[0].index].ym;tab='mes';render()}},plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.parsed.y)}}}}}));
}
function monthItems(ym,withPlans=S.settings.includePlans){
  const base=S.settings.base,items=[];
  if(ym<=base){
    S.tx.filter(x=>x.fatura===ym&&live(x)).forEach(x=>items.push({desc:x.desc,quem:x.quem,tipo:x.tipo,cat:x.cat,valor:x.valor,sub:x.tot?x.cur+'/'+x.tot:''}));
  }else{
    const k=diffM(base,ym);
    S.tx.forEach(x=>{const a=txAmount(x,k);if(a)items.push({desc:x.desc,quem:x.quem,tipo:x.tipo,cat:x.cat,valor:a,sub:x.tot?(x.cur+k)+'/'+x.tot:''})});
    if(S.settings.includeVar){
      (S.settings.varItems||[]).filter(v=>vItemActive(v,ym)).forEach(v=>{
        items.push({desc:`📌 ${v.nome} (estimativa)`,quem:v.quem,tipo:'variavel',cat:v.cat||'Estimativa',valor:v.valor,sub:'estimado'});
      });
    }
  }
  if(withPlans&&ym>=base){
    S.extras.compras.forEach(c=>{const np=Math.max(1,c.np||1),d=diffM(c.mes,ym);if(d>=0&&d<np)items.push({desc:`📋 ${c.nome} (Plano)`,quem:c.quem,tipo:'parcelada',cat:'Planejado',valor:c.valor/np,sub:`${d+1}/${np}`})});
  }
  return items;
}
function burnRatePanel(ym,rawItems,offDespAll,recC,recP,totC,totP,frozen){
  const dim=daysInMonth(ym),curYm=todayYM();
  const dayEl=ym<curYm?dim:(ym>curYm?0:new Date().getDate());
  const daysRem=ym<curYm?0:(ym>curYm?dim:Math.max(1,dim-dayEl+1));
  const pctTime=Math.round(dayEl/dim*100);
  const wFor=(scope,q)=>scope==='Casal'?1:(q===scope?1:(q==='Conjunto'?0.5:0));
  const scopes=[
    {id:'Casal',tit:'👥 Casal (Total)',renda:recC+recP,gasto:totC+totP,col:'var(--accent)'},
    {id:'Cristian',tit:'🔵 Cristian',renda:recC,gasto:totC,col:'#0e6b7c'},
    {id:'Pedro',tit:'🟠 Pedro',renda:recP,gasto:totP,col:'#d9480f'}
  ];
  const offVal=o=>frozen?(+o.valor||0):offV(o,ym);
  const cards=scopes.map(s=>{
    const varG=rawItems.filter(i=>i.tipo==='variavel').reduce((a,i)=>a+i.valor*wFor(s.id,i.quem),0)
      +offDespAll.filter(o=>o.origem==='extrato').reduce((a,o)=>a+offVal(o)*wFor(s.id,o.quem),0);
    const fixoG=Math.max(0,s.gasto-varG);
    const tetoVar=Math.max(0,s.renda-fixoG);
    const remVar=tetoVar-varG;
    const pctRenda=s.renda>0?Math.round(s.gasto/s.renda*100):0;
    const pctVar=tetoVar>0?Math.min(150,Math.round(varG/tetoVar*100)):(varG>0?100:0);
    const burnVarDia=dayEl>0?varG/dayEl:0;
    const burnTotDia=dayEl>0?s.gasto/dayEl:0;
    const availDia=ym<curYm?0:(remVar/Math.max(1,daysRem));
    let badge={cls:'due-ok',txt:'Dentro do ritmo ✓'};
    if(ym<curYm)badge={cls:remVar>=0?'due-ok':'due-over',txt:remVar>=0?'Fechou no azul ✓':'Passou da renda'};
    else if(ym>curYm)badge={cls:'due-later',txt:'Mês futuro'};
    else if(remVar<0)badge={cls:'due-over',txt:'Acima do orçamento'};
    else if(pctVar>pctTime+12)badge={cls:'due-soon',txt:'Ritmo acelerado'};
    const barW=Math.min(100,Math.max(0,pctRenda));
    const barCol=pctRenda>100?'var(--neg)':pctRenda>pctTime+10?'#f08c00':s.col;
    return `<div class="burn-box">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <b style="font-size:13.5px">${s.tit}</b>
        <span class="due-badge ${badge.cls}">${badge.txt}</span>
      </div>
      <div class="note" style="margin-top:4px">Consumido da renda: <b>${pctRenda}%</b> (${brl(s.gasto)} / ${brl(s.renda)}) · Mês em <b>${pctTime}%</b></div>
      <div class="burn-bar" title="Barra: % da renda consumida · Marcador vertical: % do mês decorrido">
        <div class="burn-fill" style="width:${barW}%;background:${barCol}"></div>
        ${dayEl>0&&dayEl<dim?`<div class="burn-marker" style="left:${pctTime}%" title="Dia ${dayEl}/${dim} (${pctTime}% do mês)"></div>`:''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-top:6px">
        <div><span class="note">Ritmo variáveis/dia</span><br><b>${dayEl>0?brl(burnVarDia)+'/dia':'–'}</b> <small class="note">(${brl(varG)} no mês)</small></div>
        <div><span class="note">${ym<curYm?'Saldo p/ variáveis':'Pode gastar/dia'}</span><br><b class="${remVar<0?'neg':'pos'}">${ym<curYm?brl(remVar):brl(Math.max(0,availDia))+'/dia'}</b> <small class="note">(${ym<curYm?'final':'por '+daysRem+'d'})</small></div>
      </div>
      <div class="note" style="margin-top:5px">Custo médio total: <b>${dayEl>0?brl(burnTotDia)+'/dia':brl(s.gasto/dim)+'/dia (proj.)'}</b> · Comprometido fixo: ${brl(fixoG)}</div>
    </div>`;
  }).join('');
  const metasTot=Object.values(S.extras.metas||{}).reduce((a,b)=>a+(+b||0),0);
  const metaFooter=metasTot>0?`<div class="note" style="margin-top:8px">🎯 Comparativo com <b>Metas de categorias</b> definidas (${brl(metasTot)}/mês): gasto total do casal em ${lab(ym)} representa <b>${Math.round((totC+totP)/metasTot*100)}%</b> das metas somadas.</div>`:'';
  return `<div class="panel">
    <div class="bar" style="justify-content:space-between;margin-bottom:4px">
      <h2 style="margin:0">⚡ Ritmo de Gastos Diário (Burn-rate — ${lab(ym)})</h2>
      <span class="note">${ym===curYm?`Dia <b>${dayEl}</b> de ${dim} (${pctTime}% decorrido · restam <b>${daysRem} dia(s)</b>)`:ym<curYm?`Mês encerrado (${dim} dias)`:`Previsão para ${dim} dias`}</span>
    </div>
    <div class="burn-grid">${cards}</div>
    ${metaFooter}
  </div>`;
}
function rMes(){
  const base=S.settings.base,Ms=allMonths();if(!MS||!Ms.includes(MS))MS=base;
  const ym=MS,frozen=S.extras.closedMonths?.[ym]||null;
  let rawItems,sp,payC,payP,offAll,offDespAll,recC,recP,offIndC,offIndP,offConj,offsC,offsP,totIndC,totIndP,totConj,meioConj,totC,totP;
  if(frozen){
    rawItems=frozen.items?.card||[];
    sp={Cristian:frozen.card.Cristian||0,Pedro:frozen.card.Pedro||0,Conjunto:frozen.card.Conjunto||0};
    payC=frozen.card.payC||0;payP=frozen.card.payP||0;
    offAll=frozen.items?.off||[];
    offDespAll=offAll.filter(o=>o.kind!=='receita');
    recC=frozen.recC||0;recP=frozen.recP||0;
    offIndC=frozen.off.Cristian||0;offIndP=frozen.off.Pedro||0;offConj=frozen.off.Conjunto||0;
    offsC=frozen.off.offsC||0;offsP=frozen.off.offsP||0;
    totIndC=frozen.totIndC||0;totIndP=frozen.totIndP||0;totConj=frozen.totConj||0;meioConj=frozen.meioConj||0;
    totC=frozen.totC||0;totP=frozen.totP||0;
  }else{
    const lv=monthLiveTotals(ym);
    rawItems=lv.rawItems;sp=lv.sp;payC=lv.payC;payP=lv.payP;
    offAll=lv.offAll;offDespAll=lv.offDespAll;recC=lv.recC;recP=lv.recP;
    offIndC=lv.offIndC;offIndP=lv.offIndP;offConj=lv.offConj;offsC=lv.offsC;offsP=lv.offsP;
    totIndC=lv.totIndC;totIndP=lv.totIndP;totConj=lv.totConj;meioConj=lv.meioConj;
    totC=lv.totC;totP=lv.totP;
  }
  const offAmt=o=>frozen?(+o.valor||0):offV(o,ym);
  const items=rawItems.map(i=>({...i,valor:i.valor*weight(i.quem)})).filter(i=>i.valor>0).sort((a,b)=>b.valor-a.valor);
  const off=offAll.filter(o=>weight(o.quem)>0).sort((a,b)=>(a.kind==='receita'?0:1)-(b.kind==='receita'?0:1)||(a.venc||99)-(b.venc||99));
  const offDesp=off.filter(o=>o.kind!=='receita'),nPaid=offDesp.filter(o=>isPaid(ym,o.id)).length;
  const renda=off.filter(o=>o.kind==='receita').reduce((a,o)=>a+offAmt(o)*weight(o.quem),0);
  const cat={};items.forEach(i=>cat[i.cat]=(cat[i.cat]||0)+i.valor);
  const pend=S.tx.filter(x=>x.rev&&x.fatura===ym).length,i=Ms.indexOf(ym);
  const status=frozen?'fechamento congelado 🔒':ym<base?'fatura real':ym===base?'fatura atual':'projeção';
  const vLab={casal:'casal',cristian:'Cristian',pedro:'Pedro',conjunto:'Conjunto'}[view];
  const fatOk=isPaid(ym,'fatura'),acOk=isPaid(ym,'acerto'),pix=S.extras.acertoPix?.[ym]||frozen?.pix||null;
  const pixCfg=S.extras.pixConfig||{chave:'',titular:'Cristian',cidade:'SAO PAULO'};
  const waMsg=buildWhatsAppAcerto(ym,{totP,payP,offsP,cardItems:rawItems,offDesp:offDespAll.map(o=>({...o,valor:offAmt(o)})),frozen,pix});
  const fdFull=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});

  const buildPersonPanel=(q,title,subCls,isConj)=>{
    const cList=rawItems.filter(x=>x.quem===q).sort((a,b)=>b.valor-a.valor);
    const oList=offDespAll.filter(o=>o.quem===q).sort((a,b)=>(a.venc||99)-(b.venc||99));
    const sumC=cList.reduce((a,x)=>a+x.valor,0),sumO=oList.reduce((a,o)=>a+offAmt(o),0),totG=sumC+sumO;
    return `<div class="panel" style="flex:1;min-width:300px;margin-bottom:0">
      <h2>${title}</h2>
      <div class="tw"><table>
        <thead><tr><th class="l">Item</th><th class="l">Origem</th><th>Parc.</th><th>Valor (100%)</th>${isConj?'<th>50% (cada)</th>':''}</tr></thead>
        <tbody>
          ${oList.map(o=>`<tr><td class="l"><b>${esc(o.nome)}</b></td><td class="l"><span class="pill-orig">Fora${o.venc?` · dia ${o.venc}`:''}</span></td><td>–</td><td>${num(offAmt(o))}</td>${isConj?`<td class="col-j">${num(offAmt(o)*0.5)}</td>`:''}</tr>`).join('')}
          ${cList.map(x=>`<tr><td class="l">${esc(x.desc.slice(0,40))}</td><td class="l"><span class="pill-orig">Cartão · ${TIPOS[x.tipo]}</span></td><td>${x.sub||'–'}</td><td>${num(x.valor)}</td>${isConj?`<td class="col-j">${num(x.valor*0.5)}</td>`:''}</tr>`).join('')}
          ${!oList.length&&!cList.length?`<tr><td class="l note" colspan="${isConj?5:4}">Nenhum item neste mês.</td></tr>`:''}
          <tr class="sub-row ${subCls}"><td class="l">= SOMA ${isConj?'CONJUNTAS':'INDIVIDUAL '+q.toUpperCase()}</td><td></td><td></td><td>${num(totG)}</td>${isConj?`<td>${num(totG*0.5)}</td>`:''}</tr>
        </tbody>
      </table></div>
    </div>`;
  };

  return `<div class="panel">
    <div class="bar" style="justify-content:space-between;margin-bottom:${frozen||pend?10:12}px">
      <div class="bar" style="margin:0"><button class="b g" data-mes="${Ms[Math.max(0,i-1)]}">◀</button>
      <select id="msel">${Ms.map(m=>`<option value="${m}" ${m===ym?'selected':''}>${lab(m)}${S.extras.closedMonths?.[m]?' 🔒':''}</option>`).join('')}</select>
      <button class="b g" data-mes="${Ms[Math.min(Ms.length-1,i+1)]}">▶</button><span class="pill-orig" style="margin-left:6px">${lab(ym)} · ${status}</span></div>
      <div class="bar" style="margin:0">
        ${frozen?`<button class="b g" data-act="unfreeze-month" data-ym="${ym}">🔓 Reabrir Mês</button>`:`<button class="b" data-act="freeze-month" data-ym="${ym}" title="Congelar cópia definitiva da DRE deste mês">🔒 Encerrar Mês (Congelar DRE)</button>`}
      </div>
    </div>
    ${frozen?`<div class="frozen-banner"><div><b>🔒 Mês Oficialmente Encerrado (DRE Congelada)</b><br><small>Arquivado em ${fdFull(frozen.closedAt)} por <b>${esc(frozen.closedBy||'Local')}</b>. Regras futuras ou alterações nas faturas não alteram estes números.</small></div><span class="pill-orig">Registro definitivo</span></div>`:''}
    ${pend&&!frozen?`<div class="warn">${pend} lançamentos desta fatura ainda não validados e fora dos números abaixo.</div>`:''}
    <div class="cards" style="margin-bottom:0">
      <div class="card"><small>Renda (${vLab})</small><b>${brl(renda)}</b><small class="sub">Cristian: ${brl(recC)} · Pedro: ${brl(recP)}</small></div>
      <div class="card"><small>Gastos Individuais (100%)</small><b style="font-size:17px">${brl(totIndC+totIndP)}</b><small class="sub">🔵 Cristian: ${brl(totIndC)} · 🟠 Pedro: ${brl(totIndP)}</small></div>
      <div class="card c-warn"><small>Conjuntas (Total 100% → 50/50)</small><b>${brl(totConj)}</b><small class="sub">${brl(meioConj)} p/ cada (Cartão ${brl(sp.Conjunto)} + Fora ${brl(offConj)})</small></div>
      <div class="card" style="border-top:3px solid #d9480f"><small>📌 Total Pedro (Acerto) &amp; Status</small><b>${brl(totP)}</b><small class="sub">Cristian: ${brl(totC)} · Sobra P: <b class="${cls(recP-totP)}">${brl(recP-totP)}</b></small>
        <div style="display:flex;gap:10px;margin-top:6px;flex-wrap:wrap">
          <label class="note" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" data-paid="fatura" data-ym="${ym}" ${fatOk?'checked':''}><span class="${fatOk?'pos':''}">${fatOk?'Fatura paga ✓':'Fatura aberta'}</span></label>
          <label class="note" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" data-paid="acerto" data-ym="${ym}" data-calc="${totP.toFixed(2)}" data-card="${payP.toFixed(2)}" data-off="${offsP.toFixed(2)}" ${acOk?'checked':''}><span class="${acOk?'pos':''}">${acOk?'Acerto ok ✓':'Acerto pend.'}</span></label>
        </div>
        ${pix?`<button type="button" class="pix-pill" data-act="edit-pix" data-ym="${ym}" data-calc="${totP.toFixed(2)}" data-card="${payP.toFixed(2)}" data-off="${offsP.toFixed(2)}" title="Ver ou editar comprovante Pix registrado">${acOk?'💸':'⚠️'} Pix ${brl(pix.valor)} · ${fmtDateBR(pix.data)}${pix.codigo?' · '+esc(pix.codigo.slice(0,12)):''} ✎</button>`:(acOk?`<button type="button" class="b g" data-act="edit-pix" data-ym="${ym}" data-calc="${totP.toFixed(2)}" data-card="${payP.toFixed(2)}" data-off="${offsP.toFixed(2)}" style="margin-top:6px;padding:3px 9px;font-size:11.5px">+ Registrar dados do Pix (IRPF)</button>`:'')}
      </div>
    </div>
  </div>
  ${dueAlertsPanel(ym,false)}

  <div class="sec-lbl">Acerto &amp; Ritmo do Mês</div>
  <div class="panel acerto-card">
    <div class="acerto-grid">
      <div>
        <h2 style="margin-bottom:4px">💬 Card de Acerto Mensal — WhatsApp &amp; Pix (${lab(ym)})</h2>
        <div class="note">Pedro transfere para <b>${esc(pixCfg.titular||'Cristian')}</b>: <b style="font-size:15px;color:var(--text)">${brl(totP)}</b> (Cartão: ${brl(payP)} + Fora: ${brl(offsP)}) ${acOk?'<span class="due-badge due-ok">Acerto liquidado ✓</span>':'<span class="due-badge due-soon">Aguardando Pix</span>'}</div>
        <div class="acerto-actions">
          <button class="b wa" id="btn-copy-wa" data-act="copy-wa">📲 Copiar mensagem WhatsApp</button>
          <button class="b g" data-act="tog-wa-preview">${waPreviewOpen?'Ocultar prévia':'👁 Ver prévia'}</button>
          ${pixCfg.chave?`<button class="b g" id="btn-copy-pix-key" data-act="copy-pix-key">🔑 Copiar Chave Pix</button>
          <button class="b" id="btn-copy-pix-emv" data-act="copy-pix-emv" data-ym="${ym}" data-val="${totP.toFixed(2)}">💠 Pix Copia e Cola (${brl(totP)})</button>`:''}
          <button class="b g" data-act="edit-pix" data-ym="${ym}" data-calc="${totP.toFixed(2)}" data-card="${payP.toFixed(2)}" data-off="${offsP.toFixed(2)}">${pix?'✎ Editar Pix':'💸 Registrar Pix'}</button>
          <button class="b g" data-act="tog-pix-cfg">${pixCfgOpen?'Fechar config. Pix':'⚙️ Configurar Pix'}</button>
        </div>
        ${waPreviewOpen?`<textarea id="wa-txt" class="wa-preview" readonly>${esc(waMsg)}</textarea>`:`<textarea id="wa-txt" hidden>${esc(waMsg)}</textarea>`}
      </div>
      <div>
        ${pixCfgOpen||!pixCfg.chave?`<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px">
          <b style="font-size:12.5px;display:block;margin-bottom:6px">🔑 Chave Pix para acerto (${esc(pixCfg.titular||'Cristian')})</b>
          <div style="display:grid;gap:6px">
            <input data-pixcfg="chave" value="${esc(pixCfg.chave||'')}" placeholder="CPF, e-mail, celular (+55...) ou chave aleatória" style="width:100%;text-align:left">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
              <input data-pixcfg="titular" value="${esc(pixCfg.titular||'Cristian')}" placeholder="Nome recebedor" style="width:100%;text-align:left">
              <input data-pixcfg="cidade" value="${esc(pixCfg.cidade||'SAO PAULO')}" placeholder="Cidade (sem acento)" style="width:100%;text-align:left">
            </div>
          </div>
          <div class="note" style="margin-top:6px">Com a chave salva, o botão <b>Pix Copia e Cola</b> gera o código EMV oficial já no valor exato de ${brl(totP)}.</div>
        </div>`:`<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px">
          <div class="note" style="margin-bottom:4px"><b>Chave Pix configurada (${esc(pixCfg.titular||'Cristian')}):</b></div>
          <code style="font-size:13px;word-break:break-all">${esc(pixCfg.chave)}</code>
          <div class="note" style="margin-top:6px">Cidade BR Code: ${esc(pixCfg.cidade||'SAO PAULO')} · Valor do QR/EMV: <b>${brl(totP)}</b></div>
        </div>`}
      </div>
    </div>
  </div>
  ${burnRatePanel(ym,rawItems,offDespAll,recC,recP,totC,totP,frozen)}

  <div class="sec-lbl">Fechamento &amp; Checklist de Contas</div>
  <div class="panel">
    <h2>Quadro Resumo de Fechamento em ${lab(ym)}</h2>
    <div class="tw"><table>
      <thead>
        <tr>
          <th class="l">Pessoa</th>
          <th class="bl">1. Cartão Indiv. (100%)</th><th>+ 50% Cartão Conj.</th><th class="col-sum">= Paga Fatura</th>
          <th class="bl">2. Fora Indiv. (100%)</th><th>+ 50% Fora Conj.</th><th class="col-sum">= Paga Fora</th>
          <th class="bl col-sum">TOTAL DESPESAS</th><th>Renda no Mês</th><th>Sobra / Falta</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="l"><span class="tag t-Cristian">Cristian</span></td>
          <td class="bl">${num(sp.Cristian)}</td><td>${num(sp.Conjunto*0.5)}</td><td class="col-c">${num(payC)}</td>
          <td class="bl">${num(offIndC)}</td><td>${num(offConj*0.5)}</td><td class="col-c">${num(offsC)}</td>
          <td class="bl col-c">${num(totC)}</td><td>${num(recC)}</td><td class="${cls(recC-totC)}"><b>${num(recC-totC)}</b></td>
        </tr>
        <tr>
          <td class="l"><span class="tag t-Pedro">Pedro</span></td>
          <td class="bl">${num(sp.Pedro)}</td><td>${num(sp.Conjunto*0.5)}</td><td class="col-p">${num(payP)}</td>
          <td class="bl">${num(offIndP)}</td><td>${num(offConj*0.5)}</td><td class="col-p">${num(offsP)}</td>
          <td class="bl col-p">${num(totP)}</td><td>${num(recP)}</td><td class="${cls(recP-totP)}"><b>${num(recP-totP)}</b></td>
        </tr>
        <tr class="tot">
          <td class="l">CASAL (Soma Total)</td>
          <td class="bl">${num(sp.Cristian+sp.Pedro)}</td><td>${num(sp.Conjunto)}</td><td>${num(payC+payP)}</td>
          <td class="bl">${num(offIndC+offIndP)}</td><td>${num(offConj)}</td><td>${num(offsC+offsP)}</td>
          <td class="bl">${num(totC+totP)}</td><td>${num(recC+recP)}</td><td class="${cls((recC+recP)-(totC+totP))}">${num((recC+recP)-(totC+totP))}</td>
        </tr>
      </tbody>
    </table></div>
  </div>

  <div class="panel">
    <h2>Checklist de pagamentos Fora do Cartão (${lab(ym)}) <span class="note">· ${nPaid}/${offDesp.length} pagas</span></h2>
    <div class="tw"><table><tr><th class="l">Pago</th><th class="l">Item</th><th>Venc.</th><th>Valor</th></tr>${off.map(o=>{const ok=isPaid(ym,o.id),ds=dueStatus(o,ym);return `<tr style="${ok?'opacity:.65':''}"><td class="l">${o.kind==='receita'?'<span class="pos">✓</span>':`<input type="checkbox" data-paid="${o.id}" data-ym="${ym}" ${ok?'checked':''}>`}</td><td class="l">${esc(o.nome)} <small>(${o.quem}${o.quem==='Conjunto'?' · 50/50':''})</small></td><td>${o.venc?(ds&&!ok&&ds.urgent?`<span class="due-badge ${ds.cls}">${ds.label}</span>`:'dia '+o.venc):'–'}</td><td class="${o.kind==='receita'?'pos':'neg'}">${o.kind==='receita'?'+':'-'}${num(offAmt(o)*weight(o.quem))}</td></tr>`}).join('')}</table></div>
  </div>

  <div class="sec-lbl">Detalhamento Opcional (por Pessoa &amp; Categoria)</div>
  <details class="acc">
    <summary><span>🔍 Itens que compõem o mês por Pessoa (Cristian, Pedro &amp; Conjunto 50/50)</span></summary>
    <div class="acc-body">
      <div class="row">
        ${buildPersonPanel('Cristian','🔵 1. Individuais — Cristian (100%)','sub-c',false)}
        ${buildPersonPanel('Pedro','🟠 2. Individuais — Pedro (100%)','sub-p',false)}
        ${buildPersonPanel('Conjunto','🟢 3. Conjuntos — Divididos 50/50','sub-j',true)}
      </div>
    </div>
  </details>
  <details class="acc">
    <summary><span>🏷️ Gastos do cartão por categoria (${vLab} · ${Object.keys(cat).length} categorias)</span></summary>
    <div class="acc-body">
      <div class="tw"><table>${Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<tr><td class="l">${esc(c)}</td><td>${num(v)}</td></tr>`).join('')}</table></div>
    </div>
  </details>`;
}

function flow(withPlans=S.settings.includePlans){
  const st=S.settings,base=st.base,n=Math.max(1,diffM(base,endMonth())),r=(st.fgtsRate||0)/100,E=S.extras,rr=(E.reserva?.rend||0)/100;
  let saldo=(st.saldoIni.Cristian||0)+(st.saldoIni.Pedro||0),res=E.reserva?.saldo||0;
  const inv=(E.inv||[]).map(i=>i.saldo||0),projBal=(E.projetos||[]).map(p=>+p.saldoAtual||0),fg={Cristian:st.fgts.Cristian.ini,Pedro:st.fgts.Pedro.ini};
  return months(n).map((ym,k)=>{
    const inc={Cristian:0,Pedro:0},card={Cristian:0,Pedro:0},offP={Cristian:0,Pedro:0},offc={};
    const ind={Cristian:0,Pedro:0};let conj=0;
    const sh=q=>({Cristian:{Cristian:1,Pedro:0},Pedro:{Cristian:0,Pedro:1},Conjunto:{Cristian:0.5,Pedro:0.5}}[q]);
    S.off.forEach(o=>{if(!offActive(o,ym))return;const raw=offV(o,ym),w=sh(o.quem);
      ['Cristian','Pedro'].forEach(q=>{const v=raw*w[q];o.kind==='receita'?inc[q]+=v:offP[q]+=v});
      if(o.kind!=='receita'){
        if(o.quem==='Conjunto')conj+=raw;else ind[o.quem]+=raw;
        const c=o.cat||'Outros';offc[c]=(offc[c]||0)+raw;
      }});
    monthItems(ym,withPlans).forEach(i=>{
      const w=sh(i.quem);card.Cristian+=i.valor*w.Cristian;card.Pedro+=i.valor*w.Pedro;
      if(i.quem==='Conjunto')conj+=i.valor;else ind[i.quem]+=i.valor;
    });
    ['Cristian','Pedro'].forEach(q=>fg[q]=fg[q]*(1+r)+st.fgts[q].dep);
    let invT=0,projT=0;
    if(withPlans){
      const inRes=!(E.reserva.meta&&res>=E.reserva.meta)?(E.reserva.aporte||0):0;
      res=res*(1+rr)+inRes;
      if(inRes){conj+=inRes;offP.Cristian+=inRes*0.5;offP.Pedro+=inRes*0.5;offc['Planos (aportes)']=(offc['Planos (aportes)']||0)+inRes}
      E.inv.forEach((i,j)=>{const on=i.inicio<=ym&&(!i.fim||ym<=i.fim),ap=on?(i.valor||0):0;inv[j]=inv[j]*(1+(i.rend||0)/100)+ap;
        if(ap){const w=sh(i.quem);offP.Cristian+=ap*w.Cristian;offP.Pedro+=ap*w.Pedro;if(i.quem==='Conjunto')conj+=ap;else ind[i.quem]+=ap;offc['Planos (aportes)']=(offc['Planos (aportes)']||0)+ap}});
      invT=inv.reduce((a,v)=>a+v,0);
      (E.projetos||[]).forEach((p,j)=>{const on=projActive(p,ym),ap=on?(+p.aporteMensal||0):0;projBal[j]=projBal[j]*(1+(+p.rend||0)/100)+ap;
        if(ap){const q=p.quem||'Conjunto',w=sh(q);offP.Cristian+=ap*w.Cristian;offP.Pedro+=ap*w.Pedro;if(q==='Conjunto')conj+=ap;else ind[q]+=ap;offc['Projetos de Vida']=(offc['Projetos de Vida']||0)+ap}});
      projT=projBal.reduce((a,v)=>a+v,0);
      E.saques.forEach(x=>{if(x.mes===ym){const v=Math.min(x.valor,fg[x.quem]||0);fg[x.quem]-=v;if(x.destino==='caixa')inc[x.quem]+=v}});
    }
    const conjMeio=conj*0.5,totC=ind.Cristian+conjMeio,totP=ind.Pedro+conjMeio;
    const renda=inc.Cristian+inc.Pedro,cartao=card.Cristian+card.Pedro,fora=offP.Cristian+offP.Pedro,sobra=renda-cartao-fora;saldo+=sobra;
    const fgT=fg.Cristian+fg.Pedro,patr=saldo+fgT+(withPlans?res+invT+projT:0);
    return {ym,k,inc,card,offP,ind,conj,conjMeio,totC,totP,offc,renda,cartao,fora,sobra,sobraC:inc.Cristian-totC,sobraP:inc.Pedro-totP,saldo,fg:{...fg},fgT,patr,projT};
  });
}
function rFluxo(){
  const R=flow(),cats=[...new Set(R.flatMap(r=>Object.keys(r.offc)))].sort(),f0=R[0],fl=R[R.length-1];
  const saldoIni=(S.settings.saldoIni.Cristian||0)+(S.settings.saldoIni.Pedro||0),fgIni=(S.settings.fgts.Cristian.ini||0)+(S.settings.fgts.Pedro.ini||0);
  const dSaldo=fl.saldo-saldoIni,dFg=fl.fgT-fgIni;
  return `<div class="bar" style="justify-content:space-between;margin-bottom:10px">
    ${horizonCtrl()}
    ${S.settings.includePlans?`<span class="note" style="color:var(--accent);font-weight:600">📋 Refletindo itens da aba Planos</span>`:''}
  </div>
  <div class="cards">
    <div class="card"><small>Cristian em ${lab(f0.ym)}</small><b class="${cls(f0.sobraC)}">Sobra ${brl(f0.sobraC)}</b><small class="sub">Renda ${brl(f0.inc.Cristian)} · Gasto ${brl(f0.totC)} (50% Conj. ${brl(f0.conjMeio)})</small></div>
    <div class="card"><small>Pedro em ${lab(f0.ym)}</small><b class="${cls(f0.sobraP)}">Sobra ${brl(f0.sobraP)}</b><small class="sub">Renda ${brl(f0.inc.Pedro)} · Gasto ${brl(f0.totP)} (Conj. 100%: ${brl(f0.conj)})</small></div>
    <div class="card ${fl.saldo>=0?'c-pos':'c-neg'}"><small>Saldo em conta (${lab(fl.ym)})</small><b class="${cls(fl.saldo)}">${brl(fl.saldo)}</b><small class="sub">${dSaldo>=0?'+':''}${brl(dSaldo)} no período</small></div>
    <div class="card c-pos"><small>Patrimônio líquido (${lab(fl.ym)})</small><b>${brl(fl.patr)}</b><small class="sub">FGTS: ${brl(fl.fgT)} (${dFg>=0?'+':''}${brl(dFg)}) · C ${brl(fl.fg.Cristian)} / P ${brl(fl.fg.Pedro)}</small></div>
  </div>
  <details class="acc">
    <summary><span>⚙️ Configurar Saldos Iniciais e FGTS</span><span class="note">Conta inicial: ${brl(saldoIni)} · FGTS inicial: ${brl(fgIni)} (${S.settings.fgtsRate}% a.m.)</span></summary>
    <div class="acc-body">
      <div class="bar">${['Cristian','Pedro'].map(q=>`<label class="note">Saldo inicial ${q} <input type="number" step="0.01" data-si="${q}" value="${S.settings.saldoIni[q]||0}"></label>`).join('')}</div>
      <div class="bar">${['Cristian','Pedro'].map(q=>`<label class="note">FGTS ${q}: saldo <input type="number" step="0.01" data-fg="${q}.ini" value="${S.settings.fgts[q].ini}"></label><label class="note">depósito/mês <input type="number" step="0.01" data-fg="${q}.dep" value="${S.settings.fgts[q].dep}"></label>`).join('')}
        <label class="note">rendimento <input type="number" step="0.01" data-s="fgtsRate" value="${S.settings.fgtsRate}" style="width:70px">% a.m.</label></div>
      <div class="note">FGTS = saldo atual + depósito mensal, com rendimento composto mensal.</div>
    </div>
  </details>
  <div class="sec-lbl">Gráficos &amp; Projeção Mensal</div>
  <div class="row"><div class="panel"><h2>Entradas por pessoa x saídas</h2><canvas id="cf1"></canvas></div>
  <div class="panel"><h2>Saldo em conta e FGTS acumulado</h2><canvas id="cf2"></canvas></div></div>
  <div class="panel"><h2>Fluxo mensal da família (${lab(f0.ym)} a ${lab(fl.ym)})</h2>
  <div class="tw"><table>
    <thead>
      <tr>
        <th class="grp-hdr">Mês</th>
        <th colspan="3" class="grp-hdr bl">💰 Receitas (Entradas)</th>
        <th colspan="4" class="grp-hdr grp-j bl">Despesas (Individuais 100% vs Conjuntas 50/50)</th>
        <th colspan="2" class="grp-hdr grp-tot bl">📌 Total Pago por Pessoa</th>
        <th colspan="3" class="grp-hdr bl">📊 Sobra / Falta no Mês</th>
        <th colspan="4" class="grp-hdr bl">🏦 Acumulado (Conta + FGTS)</th>
      </tr>
      <tr>
        <th class="l">Mês</th>
        <th class="bl">Cristian</th><th>Pedro</th><th class="col-sum">= Renda Total</th>
        <th class="bl col-c">Indiv. Cristian</th><th class="col-p">Indiv. Pedro</th><th class="col-j">Conjuntas (100%)</th><th class="col-j">50% Conj. (cada)</th>
        <th class="bl col-c">= Total Cristian</th><th class="col-p">= Total Pedro</th>
        <th class="bl">Sobra Cristian</th><th>Sobra Pedro</th><th class="col-sum">= Sobra Casal</th>
        <th class="bl">Saldo em conta</th><th>FGTS Cristian</th><th>FGTS Pedro</th><th class="col-sum">Patrimônio</th>
      </tr>
    </thead>
    <tbody>
      ${R.map(r=>`<tr><td class="l"><a href="#" data-mes="${r.ym}">${lab(r.ym)}</a></td><td class="bl">${num(r.inc.Cristian)}</td><td>${num(r.inc.Pedro)}</td><td class="col-sum">${num(r.renda)}</td><td class="bl col-c">${num(r.ind.Cristian)}</td><td class="col-p">${num(r.ind.Pedro)}</td><td class="col-j">${num(r.conj)}</td><td class="col-j">${num(r.conjMeio)}</td><td class="bl col-c">${num(r.totC)}</td><td class="col-p">${num(r.totP)}</td><td class="bl ${cls(r.sobraC)}">${num(r.sobraC)}</td><td class="${cls(r.sobraP)}">${num(r.sobraP)}</td><td class="col-sum ${cls(r.sobra)}">${num(r.sobra)}</td><td class="bl ${cls(r.saldo)}">${num(r.saldo)}</td><td>${num(r.fg.Cristian)}</td><td>${num(r.fg.Pedro)}</td><td class="col-sum">${num(r.patr)}</td></tr>`).join('')}
    </tbody>
  </table></div></div>
  <details class="acc">
    <summary><span>📊 Despesas fora do cartão por categoria (${cats.length} categorias)</span></summary>
    <div class="acc-body">
      <div class="tw"><table><tr><th class="l">Mês</th>${cats.map(c=>`<th>${esc(c)}</th>`).join('')}<th>Total</th></tr>
      ${R.map(r=>`<tr><td class="l">${lab(r.ym)}</td>${cats.map(c=>`<td>${r.offc[c]?num(r.offc[c]):''}</td>`).join('')}<td><b>${num(r.fora)}</b></td></tr>`).join('')}</table></div>
    </div>
  </details>`;
}
function drawFluxo(){
  const R=flow(),L=R.map(r=>lab(r.ym)),tip={plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.parsed.y)}}}};
  charts.push(new Chart(document.getElementById('cf1'),{data:{labels:L,datasets:[
    {type:'bar',stack:'i',label:'Renda Cristian',data:R.map(r=>r.inc.Cristian),backgroundColor:'#0e6b7c'},
    {type:'bar',stack:'i',label:'Renda Pedro',data:R.map(r=>r.inc.Pedro),backgroundColor:'#f08c00'},
    {type:'line',label:'Saídas (cartão + fora)',data:R.map(r=>r.cartao+r.fora),borderColor:'#d6336c',pointRadius:0,tension:.2}]},
    options:{scales:{x:{stacked:true},y:{stacked:true}},...tip}}));
  charts.push(new Chart(document.getElementById('cf2'),{type:'line',data:{labels:L,datasets:[
    {label:'Saldo em conta',data:R.map(r=>r.saldo),borderColor:'#0e6b7c',pointRadius:0,tension:.2},
    {label:'FGTS Cristian',data:R.map(r=>r.fg.Cristian),borderColor:'#9775fa',pointRadius:0,tension:.2},
    {label:'FGTS Pedro',data:R.map(r=>r.fg.Pedro),borderColor:'#f08c00',pointRadius:0,tension:.2},
    {label:'FGTS total',data:R.map(r=>r.fgT),borderColor:'#2b8a3e',borderDash:[5,4],pointRadius:0,tension:.2}]},options:tip}));
}

const xin=(l,x,f,t='number',w=96,st='0.01')=>`<td${t==='text'?' class="l"':''}><input ${t==='number'?`type="number" step="${st}"`:t==='month'?'type="month"':''} data-f="${f}" value="${x[f]??''}" style="width:${w}px"></td>`;
const xsel=(x,f,o)=>`<td class="l"><select data-f="${f}">${Object.entries(o).map(([k,v])=>`<option value="${k}" ${x[f]===k?'selected':''}>${v}</option>`).join('')}</select></td>`;

function rMetas(){
  const ref=F.mm||S.settings.base,Ms=allMonths(),M=S.extras.metas,sp={};
  monthItems(ref).forEach(i=>sp[i.cat]=(sp[i.cat]||0)+i.valor);
  S.off.forEach(o=>{if(o.kind!=='receita'&&offActive(o,ref)){const c=o.cat||'Outros';sp[c]=(sp[c]||0)+offV(o,ref)}});
  const cats=[...new Set([...Object.keys(sp),...Object.keys(M)])].sort((a,b)=>(sp[b]||0)-(sp[a]||0));
  const over=cats.filter(c=>M[c]&&sp[c]>M[c]);
  return `<div class="bar"><b>Mês</b><select id="fmm">${Ms.map(m=>`<option value="${m}" ${m===ref?'selected':''}>${lab(m)}</option>`).join('')}</select></div>
  ${over.length?`<div class="warn">${over.length} categoria(s) acima da meta em ${lab(ref)}: ${over.map(esc).join(', ')}.</div>`:''}
  <div class="panel"><h2>Metas de gasto por categoria (mensal)</h2>
  <div class="note">Compara o gasto do mês (cartão validado + fora do cartão) com o limite que você definir. Deixe em branco para não ter meta.</div>
  <div class="tw"><table><tr><th class="l">Categoria</th><th>Gasto no mês</th><th>Meta mensal</th><th>Uso</th><th class="l" style="width:220px"></th></tr>
  ${cats.map(c=>{const m=M[c],p=m?sp[c]/m*100:0;return `<tr><td class="l">${esc(c)}</td><td>${num(sp[c]||0)}</td><td><input type="number" step="10" data-meta="${esc(c)}" value="${m||''}" placeholder="–"></td><td class="${p>100?'neg':''}">${m?Math.round(p)+'%':''}</td><td class="l">${m?`<div style="background:var(--line);border-radius:6px;height:8px"><div style="width:${Math.min(100,p)}%;height:8px;border-radius:6px;background:${p>100?'var(--neg)':p>80?'#f08c00':'var(--accent)'}"></div></div>`:''}</td></tr>`}).join('')}</table></div></div>`;
}

function plans(){
  const E=S.extras,R=flow(false),st=S.settings,r=(st.fgtsRate||0)/100,rr=(E.reserva.rend||0)/100;
  let res=E.reserva.saldo||0,saldo=(st.saldoIni.Cristian||0)+(st.saldoIni.Pedro||0);
  const inv=E.inv.map(i=>i.saldo||0),projBal=(E.projetos||[]).map(p=>+p.saldoAtual||0),fg={Cristian:st.fgts.Cristian.ini,Pedro:st.fgts.Pedro.ini};
  return R.map((b,k)=>{
    const ym=b.ym;let out=0,inRes=0,invT=0,projT=0,cashIn=0;
    if(!(E.reserva.meta&&res>=E.reserva.meta))inRes=E.reserva.aporte||0;
    res=res*(1+rr)+inRes;out+=inRes;
    E.inv.forEach((i,j)=>{const on=i.inicio<=ym&&(!i.fim||ym<=i.fim);const ap=on?i.valor:0;inv[j]=inv[j]*(1+(i.rend||0)/100)+ap;out+=ap});
    invT=inv.reduce((a,v)=>a+v,0);
    (E.projetos||[]).forEach((p,j)=>{const on=projActive(p,ym),ap=on?(+p.aporteMensal||0):0;projBal[j]=projBal[j]*(1+(+p.rend||0)/100)+ap;out+=ap});
    projT=projBal.reduce((a,v)=>a+v,0);
    E.compras.forEach(c=>{const n=Math.max(1,c.np||1),d=diffM(c.mes,ym);if(d>=0&&d<n)out+=c.valor/n});
    ['Cristian','Pedro'].forEach(q=>fg[q]=fg[q]*(1+r)+st.fgts[q].dep);
    E.saques.forEach(x=>{if(x.mes===ym){const v=Math.min(x.valor,fg[x.quem]||0);fg[x.quem]-=v;if(x.destino==='caixa')cashIn+=v}});
    const sobra=b.sobra-out+cashIn;saldo+=sobra;const fgT=fg.Cristian+fg.Pedro;
    return {ym,sobra,saldo,res,invT,projT,fgT,fgC:fg.Cristian,fgP:fg.Pedro,patr:saldo+res+invT+projT+fgT,out,base:b};
  });
}
function rPlanos(){
  const E=S.extras,R=plans(),L=R[R.length-1],hit=E.reserva.meta?R.find(r=>r.res>=E.reserva.meta):null;
  const tbl=(l,head,rows)=>`<div class="tw"><table><tr>${head}<th></th></tr>${rows}</table></div><div class="bar" style="margin-top:8px"><button class="b g" data-act="add-x" data-list="${l}">+ Adicionar</button></div>`;
  return `<div class="panel" style="padding:12px 18px"><div class="bar" style="margin:0;justify-content:space-between">
   <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" data-s="includePlans" ${S.settings.includePlans?'checked':''}> <b>Refletir planos e projetos nas projeções globais</b></label>
   <span class="note">Quando desmarcado, fica restrito às abas Planos e Projetos.</span></div></div>
  <div class="cards">
   <div class="card"><small>Reserva de emergência (${lab(L.ym)})</small><b>${brl(L.res)}</b><small class="sub">${E.reserva.meta?(hit?'meta atingida em '+lab(hit.ym):'meta não atingida até '+lab(L.ym)):'sem meta definida'}</small></div>
   <div class="card"><small>Investimentos &amp; Projetos (${lab(L.ym)})</small><b>${brl(L.invT+L.projT)}</b><small class="sub">Inv.: ${brl(L.invT)} · Projetos (${(E.projetos||[]).length}): ${brl(L.projT)}</small></div>
   <div class="card"><small>Saldo ajustado &amp; FGTS</small><b class="${cls(L.saldo)}">${brl(L.saldo+L.fgT)}</b><small class="sub">Conta: ${brl(L.saldo)} · FGTS: ${brl(L.fgT)}</small></div>
   <div class="card c-pos"><small>Patrimônio total (${lab(L.ym)})</small><b>${brl(L.patr)}</b><small class="sub">Projeção consolidada com planos</small></div>
  </div>
  <div class="sec-lbl">Reserva &amp; Investimentos</div>
  <div class="panel"><h2>Reserva de emergência</h2><div class="bar">
   <label class="note">Meta (R$) <input type="number" data-res="meta" value="${E.reserva.meta||''}"></label>
   <label class="note">Saldo atual <input type="number" data-res="saldo" value="${E.reserva.saldo||''}"></label>
   <label class="note">Aporte mensal <input type="number" data-res="aporte" value="${E.reserva.aporte||''}"></label>
   <label class="note">Rendimento <input type="number" step="0.01" data-res="rend" value="${E.reserva.rend}" style="width:70px">% a.m.</label></div>
   <div class="note">O aporte para automaticamente ao atingir a meta (sugestão: 6 meses de despesas).</div></div>
  <div class="panel"><h2>Investimentos</h2>${tbl('inv','<th class="l">Nome</th><th class="l">Quem</th><th>Aporte mensal</th><th>Saldo atual</th><th>Rend. % a.m.</th><th class="l">Início</th><th class="l">Fim</th>',E.inv.map(x=>`<tr data-id="${x.id}" data-list="inv">${xin('inv',x,'nome','text',170)}${xsel(x,'quem',{Cristian:'Cristian',Pedro:'Pedro',Conjunto:'Conjunto'})}${xin('inv',x,'valor')}${xin('inv',x,'saldo')}${xin('inv',x,'rend',undefined,70)}${xin('inv',x,'inicio','month',122)}${xin('inv',x,'fim','month',122)}<td><button class="b r" data-act="del-x">×</button></td></tr>`).join(''))}</div>
  <div class="sec-lbl">Saques FGTS &amp; Compras Planejadas</div>
  <div class="panel"><h2>Saques do FGTS</h2>${tbl('saques','<th class="l">Descrição</th><th class="l">Quem</th><th class="l">Mês</th><th>Valor</th><th class="l">Destino</th>',E.saques.map(x=>`<tr data-id="${x.id}" data-list="saques">${xin('saques',x,'nome','text',170)}${xsel(x,'quem',{Cristian:'Cristian',Pedro:'Pedro'})}${xin('saques',x,'mes','month',122)}${xin('saques',x,'valor')}${xsel(x,'destino',{caixa:'Entra no saldo em conta',externo:'Uso direto (imóvel/financiamento)'})}<td><button class="b r" data-act="del-x">×</button></td></tr>`).join(''))}</div>
  <div class="panel"><h2>Compras planejadas</h2>${tbl('compras','<th class="l">Descrição</th><th class="l">Quem</th><th class="l">1º mês</th><th>Valor total</th><th>Parcelas</th>',E.compras.map(x=>`<tr data-id="${x.id}" data-list="compras">${xin('compras',x,'nome','text',170)}${xsel(x,'quem',{Cristian:'Cristian',Pedro:'Pedro',Conjunto:'Conjunto'})}${xin('compras',x,'mes','month',122)}${xin('compras',x,'valor')}${xin('compras',x,'np',undefined,60,'1')}<td><button class="b r" data-act="del-x">×</button></td></tr>`).join(''))}<div class="note">Viagem, móveis, reforma etc. Com parcelas, o valor é dividido entre os meses.</div></div>
  <div class="sec-lbl">Evolução do Patrimônio</div>
  <div class="panel"><h2>Patrimônio com os planos</h2><canvas id="cp"></canvas></div>
  <details class="acc">
    <summary><span>📅 Tabela detalhada mês a mês (${R.length} meses)</span></summary>
    <div class="acc-body">
      <div class="tw"><table><tr><th>Mês</th><th>Sobra ajustada</th><th>Saldo em conta</th><th>Reserva</th><th>Investimentos</th><th>Projetos</th><th>FGTS</th><th>Patrimônio</th></tr>
      ${R.map(r=>`<tr><td>${lab(r.ym)}</td><td class="${cls(r.sobra)}">${num(r.sobra)}</td><td class="${cls(r.saldo)}">${num(r.saldo)}</td><td>${num(r.res)}</td><td>${num(r.invT)}</td><td>${num(r.projT)}</td><td>${num(r.fgT)}</td><td><b>${num(r.patr)}</b></td></tr>`).join('')}</table></div>
    </div>
  </details>`;
}
function drawPlanos(){
  const R=plans(),c=document.getElementById('cp');if(!c)return;
  charts.push(new Chart(c,{type:'line',data:{labels:R.map(r=>lab(r.ym)),datasets:[
    {label:'Saldo em conta',data:R.map(r=>r.saldo),borderColor:'#0e6b7c',pointRadius:0,tension:.2},
    {label:'Reserva',data:R.map(r=>r.res),borderColor:'#f08c00',pointRadius:0,tension:.2},
    {label:'Investimentos',data:R.map(r=>r.invT),borderColor:'#9775fa',pointRadius:0,tension:.2},
    {label:'Projetos de Vida',data:R.map(r=>r.projT),borderColor:'#d6336c',pointRadius:0,tension:.2},
    {label:'FGTS',data:R.map(r=>r.fgT),borderColor:'#2b8a3e',pointRadius:0,tension:.2},
    {label:'Patrimônio',data:R.map(r=>r.patr),borderColor:'#16181d',borderDash:[5,4],pointRadius:0,tension:.2}]},
    options:{plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.parsed.y)}}}}}));
}

function projectSim(p){
  const st=S.settings,base=st.base,rFg=(st.fgtsRate||0)/100,rP=(+p.rend||0)/100;
  const fgRawHoje=p.usarFgts?(p.fgtsQuem==='Cristian'?st.fgts.Cristian.ini:p.fgtsQuem==='Pedro'?st.fgts.Pedro.ini:(st.fgts.Cristian.ini+st.fgts.Pedro.ini)):0;
  const fgtsHoje=p.usarFgts?(+p.fgtsUso>0?Math.min(fgRawHoje,+p.fgtsUso):fgRawHoje):0;
  const saldoHoje=+p.saldoAtual||0,acumHoje=saldoHoje+fgtsHoje,meta=+p.meta||0;
  const pctHoje=meta>0?Math.min(100,Math.round(acumHoje/meta*100)):0;
  const targetYm=p.mesAlvo&&p.mesAlvo>=base?p.mesAlvo:endMonth();
  let sal=saldoHoje,fgC=st.fgts.Cristian.ini,fgP=st.fgts.Pedro.ini;
  let etaYm=meta>0&&acumHoje>=meta?base:null,etaMonths=etaYm?0:null,atTarget=null,end120=null;
  const maxM=Math.max(120,diffM(base,targetYm)+1);
  for(let k=0;k<maxM;k++){
    const ym=addM(base,k);
    const ap=projActive(p,ym)?(+p.aporteMensal||0):0;
    sal=sal*(1+rP)+ap;
    fgC=fgC*(1+rFg)+st.fgts.Cristian.dep;
    fgP=fgP*(1+rFg)+st.fgts.Pedro.dep;
    let fgElig=0;
    if(p.usarFgts){
      const raw=p.fgtsQuem==='Cristian'?fgC:p.fgtsQuem==='Pedro'?fgP:(fgC+fgP);
      fgElig=+p.fgtsUso>0?Math.min(raw,+p.fgtsUso):raw;
    }
    const tot=sal+fgElig;
    if(!etaYm&&meta>0&&tot>=meta){etaYm=ym;etaMonths=k+1}
    if(ym===targetYm)atTarget={ym,saldoProj:sal,fgtsNoAlvo:fgElig,totalNoAlvo:tot,faltaNoAlvo:Math.max(0,meta-tot)};
    if(k===maxM-1)end120={ym,saldoProj:sal,fgtsNoAlvo:fgElig,totalNoAlvo:tot,faltaNoAlvo:Math.max(0,meta-tot)};
  }
  if(!atTarget)atTarget=end120;
  let finEst=null;
  if((+p.valorBem||0)>meta&&meta>0){
    const financ=(+p.valorBem)-meta;
    const isImov=p.tipo==='imovel';
    const prazo=isImov?360:48,taxa=isImov?0.0085:0.0145;
    const pmt=financ*(taxa*Math.pow(1+taxa,prazo))/(Math.pow(1+taxa,prazo)-1);
    finEst={financ,prazo,taxaPct:(taxa*100).toFixed(2),pmt};
  }
  return {fgtsHoje,acumHoje,pctHoje,etaYm,etaMonths,atTarget,finEst};
}
function rProjetos(){
  const projs=S.extras.projetos||[],base=S.settings.base;
  const metaDefs={imovel:{ico:'🏠',tit:'Imóvel / Reforma'},carro:{ico:'🚗',tit:'Carro / Veículo'},viagem:{ico:'✈️',tit:'Viagem / Férias'},outro:{ico:'🎯',tit:'Outro Projeto'}};
  const sims=projs.map(p=>({p,s:projectSim(p)}));
  const ativos=projs.filter(p=>p.ativo!==false);
  const totMeta=ativos.reduce((a,p)=>a+(+p.meta||0),0);
  const totAcum=sims.filter(x=>x.p.ativo!==false).reduce((a,x)=>a+x.s.acumHoje,0);
  const totAp=ativos.filter(p=>projActive(p,base)).reduce((a,p)=>a+(+p.aporteMensal||0),0);
  return `<div class="panel" style="padding:12px 18px"><div class="bar" style="margin:0;justify-content:space-between">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" data-s="includePlans" ${S.settings.includePlans?'checked':''}> <b>Refletir aportes dos Projetos de Vida na Visão Geral, Visão Mensal e Fluxo de Caixa</b></label>
    <span class="note">Use os botões abaixo para simular Imóvel (com FGTS conjunto), Carro, Viagens ou outras metas.</span>
  </div></div>
  <div class="panel">
    <div class="bar" style="justify-content:space-between">
      <div><h2 style="margin:0">🎯 Projetos de Vida & Grandes Conquistas</h2><div class="note" style="margin:2px 0 0">Acompanhe o progresso, combine FGTS de Cristian + Pedro e veja a previsão exata de conclusão.</div></div>
      <div class="bar" style="margin:0">
        <button class="b" data-act="add-proj" data-tipo="imovel">🏠 + Imóvel (c/ FGTS)</button>
        <button class="b g" data-act="add-proj" data-tipo="carro">🚗 + Carro</button>
        <button class="b g" data-act="add-proj" data-tipo="viagem">✈️ + Viagem</button>
        <button class="b g" data-act="add-proj" data-tipo="outro">🎯 + Outro</button>
      </div>
    </div>
    <div class="cards" style="margin-bottom:0">
      <div class="card"><small>Projetos ativos</small><b>${ativos.length}</b><small class="sub">${projs.length} cadastrado(s) no total</small></div>
      <div class="card"><small>Meta total de entrada / reserva</small><b>${brl(totMeta)}</b><small class="sub">Soma dos objetivos ativos</small></div>
      <div class="card c-pos"><small>Já acumulado hoje (c/ FGTS)</small><b>${brl(totAcum)}</b><small class="sub">${totMeta>0?Math.round(totAcum/totMeta*100)+'% da meta total':'Defina as metas abaixo'}</small></div>
      <div class="card c-warn"><small>Aporte mensal atual (${lab(base)})</small><b>${brl(totAp)}</b><small class="sub">${S.settings.includePlans?'Ativo nas projeções globais ✓':'Apenas simulação nesta aba'}</small></div>
    </div>
  </div>
  ${projs.length?`<div class="proj-grid">${sims.map(({p,s})=>{
    const md=metaDefs[p.tipo]||metaDefs.outro;
    const barCol=p.tipo==='carro'?'#f08c00':p.tipo==='viagem'?'#9775fa':p.tipo==='outro'?'#2b8a3e':'#0e6b7c';
    const etaTxt=p.meta<=0?'Defina um valor de meta/entrada para calcular o prazo.':
      s.etaMonths===0?'<b class="pos">✅ Meta já atingida hoje com saldo + FGTS!</b>':
      s.etaYm?`🎯 Previsão de atingir 100%: <b>${lab(s.etaYm)}</b> (${s.etaMonths} mês${s.etaMonths>1?'es':''})`:
      `<span class="neg">⏳ Com o aporte atual, não atinge 100% em 10 anos (em ${lab(s.atTarget.ym)}: ${brl(s.atTarget.totalNoAlvo)}).</span>`;
    return `<div class="proj-card ${esc(p.tipo||'outro')}" data-proj-id="${p.id}">
      <div class="bar" style="justify-content:space-between;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:180px">
          <span style="font-size:20px">${md.ico}</span>
          <input data-pf="nome" value="${esc(p.nome)}" style="font-weight:700;font-size:14.5px;width:100%;text-align:left">
        </div>
        <div class="bar" style="margin:0">
          <span class="pill-orig">${md.tit}</span>
          <label class="note" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" data-pf="ativo" ${p.ativo!==false?'checked':''}> Ativo</label>
          <button class="b r" data-act="del-proj" title="Excluir projeto">×</button>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:13px">
        <span>Acumulado hoje: <b>${brl(s.acumHoje)}</b>${s.fgtsHoje>0?` <small class="note">(Saldo ${brl(p.saldoAtual)} + FGTS ${brl(s.fgtsHoje)})</small>`:''}</span>
        <b>${s.pctHoje}%</b>
      </div>
      <div class="proj-prog"><div class="proj-bar" style="width:${s.pctHoje}%;background:${barCol}"></div></div>
      <div class="note" style="margin-bottom:4px">${etaTxt}</div>
      ${s.atTarget&&p.meta>0?`<div class="note">Em <b>${lab(s.atTarget.ym)}</b>: projetado <b>${brl(s.atTarget.totalNoAlvo)}</b> (Saldo ${brl(s.atTarget.saldoProj)}${s.atTarget.fgtsNoAlvo?` + FGTS ${brl(s.atTarget.fgtsNoAlvo)}`:''})${s.atTarget.faltaNoAlvo>0?` · faltam <b class="neg">${brl(s.atTarget.faltaNoAlvo)}</b>`:' · <b class="pos">meta coberta ✓</b>'}</div>`:''}
      ${s.finEst?`<div class="note" style="margin-top:4px;color:var(--petrol-dark)">🏦 Ref. financiamento de ${brl(s.finEst.financ)} (${s.finEst.prazo}x a ${s.finEst.taxaPct}% a.m.): <b>~${brl(s.finEst.pmt)}/mês</b></div>`:''}
      <div class="proj-fields">
        <label>Responsável / Rateio<select data-pf="quem">${quemOpts(p.quem||'Conjunto')}</select></label>
        <label>Meta / Entrada (R$)<input type="number" step="100" data-pf="meta" value="${p.meta||0}"></label>
        <label>Valor total do bem (opc.)<input type="number" step="1000" data-pf="valorBem" value="${p.valorBem||0}"></label>
        <label>Saldo já guardado (R$)<input type="number" step="100" data-pf="saldoAtual" value="${p.saldoAtual||0}"></label>
        <label>Aporte mensal (R$)<input type="number" step="50" data-pf="aporteMensal" value="${p.aporteMensal||0}"></label>
        <label>Rend. mensal (% a.m.)<input type="number" step="0.05" data-pf="rend" value="${p.rend??0.8}"></label>
        <label>Início aportes<input type="month" data-pf="inicio" value="${p.inicio||base}"></label>
        <label>Mês alvo (prazo)<input type="month" data-pf="mesAlvo" value="${p.mesAlvo||''}"></label>
      </div>
      <div style="margin-top:10px;padding-top:8px;border-top:1px dashed var(--line);display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <label class="note" style="display:inline-flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" data-pf="usarFgts" ${p.usarFgts?'checked':''}> <b>Usar FGTS neste projeto</b></label>
        ${p.usarFgts?`<label class="note" style="display:inline-flex;align-items:center;gap:4px">FGTS de:
          <select data-pf="fgtsQuem"><option value="Conjunto" ${(p.fgtsQuem||'Conjunto')==='Conjunto'?'selected':''}>Cristian + Pedro</option><option value="Cristian" ${p.fgtsQuem==='Cristian'?'selected':''}>Só Cristian</option><option value="Pedro" ${p.fgtsQuem==='Pedro'?'selected':''}>Só Pedro</option></select></label>
          <label class="note" style="display:inline-flex;align-items:center;gap:4px">Limite FGTS (0=todo)<input type="number" step="500" data-pf="fgtsUso" value="${p.fgtsUso||0}" style="width:105px"></label>`:''}
      </div>
    </div>`;
  }).join('')}</div>`:`<div class="panel"><div class="note">Nenhum Projeto de Vida cadastrado ainda. Clique em <b>🏠 + Imóvel (c/ FGTS)</b>, <b>🚗 + Carro</b> ou <b>✈️ + Viagem</b> acima para começar a simular suas conquistas!</div></div>`}`;
}

function scenario(){
  const c=S.extras.cen,bak=S;let R;
  S=structuredClone(bak);
  try{
    S.off.forEach(o=>{if(o.kind==='receita')o.valor*=1+(c.rendaPct||0)/100;else if((o.cat||'')==='Moradia')o.valor*=1+(c.moradiaPct||0)/100});
    (S.settings.varItems||[]).forEach(v=>v.valor*=1+(c.varPct||0)/100);
    if(c.quitarId&&c.quitarMes){const o=S.off.find(x=>String(x.id)===String(c.quitarId));if(o){o.fim=addM(c.quitarMes,-1);o.np=0}}
    if(c.extra)S.off.push({id:1,nome:'Despesa extra',quem:'Conjunto',kind:'despesa',valor:c.extra,inicio:c.extraDe||S.settings.base,fim:null,cat:'Cenário',freq:'mensal'});
    R=flow();
  }finally{S=bak}
  return R;
}
function cenNav(){
  return `<div class="bar" style="justify-content:space-between;margin-bottom:12px">
    <div class="seg-bar">
      <button data-act="cenmode" data-mode="cen" class="${cenMode==='cen'?'on':''}">📊 Cenários de Fluxo</button>
      <button data-act="cenmode" data-mode="amort" class="${cenMode==='amort'?'on':''}">🏦 Quitação & Amortização</button>
      <button data-act="cenmode" data-mode="fire" class="${cenMode==='fire'?'on':''}">🔥 Independência Financeira (FIRE)</button>
    </div>
    <span class="note">Simuladores estratégicos — não alteram seus dados reais.</span>
  </div>`;
}
function amortSim(cfg){
  const saldo=Math.max(0,+cfg.saldo||0),r=Math.max(0,+cfg.jurosMes||0)/100,meses=Math.max(1,Math.min(600,Math.round(+cfg.meses||1)));
  const calcPmt=(pv,rate,n)=>pv<=0||n<=0?0:(rate>0?pv*(rate*Math.pow(1+rate,n))/(Math.pow(1+rate,n)-1):pv/n);
  const pmtPrice=calcPmt(saldo,r,meses);
  const rawPmt=+cfg.pmt||0;
  const pmtInvalid=r>0&&saldo>0&&rawPmt>0&&rawPmt<=saldo*r+0.01;
  const pmtEff=(rawPmt>0&&!pmtInvalid)?rawPmt:pmtPrice;
  const simSched=(bal0,rate,pmtVal,limit)=>{
    let bal=bal0,totJ=0,totP=0;const path=[+bal0.toFixed(2)];
    for(let m=1;m<=limit&&bal>0.01;m++){
      const jur=bal*rate,pag=Math.min(bal+jur,pmtVal);
      bal=Math.max(0,bal+jur-pag);totJ+=jur;totP+=pag;path.push(+bal.toFixed(2));
    }
    return {meses:path.length-1,jurosTotal:totJ,pagoTotal:totP,path};
  };
  const orig=simSched(saldo,r,pmtEff,Math.max(meses,600));
  const extra=Math.max(0,+cfg.aporteExtra||0);
  const balAfter=Math.max(0,saldo-extra);
  const modo=cfg.modo==='parcela'?'parcela':'prazo';
  let pmtNew=pmtEff,novo;
  if(balAfter<=0.01){
    pmtNew=0;novo={meses:0,jurosTotal:0,pagoTotal:0,path:[balAfter]};
  }else if(modo==='parcela'){
    pmtNew=calcPmt(balAfter,r,Math.max(1,orig.meses));
    novo=simSched(balAfter,r,pmtNew,Math.max(1,orig.meses));
  }else{
    novo=simSched(balAfter,r,pmtEff,Math.max(orig.meses,600));
  }
  const base=S.settings.base;
  return {
    saldo,r,pmtEff,pmtNew,pmtInvalid,extra,modo,orig,novo,
    jurosEcon:Math.max(0,orig.jurosTotal-novo.jurosTotal),
    mesesEcon:Math.max(0,orig.meses-novo.meses),
    pmtEcon:Math.max(0,pmtEff-pmtNew),
    fimOrig:orig.meses>0?addM(base,orig.meses-1):base,
    fimNovo:novo.meses>0?addM(base,novo.meses-1):base
  };
}
function rAmort(){
  const a=S.extras.amort||{},sim=amortSim(a);
  const loans=S.off.filter(o=>o.kind!=='receita'&&((o.np||0)>1||/carro|veic|imovel|apart|casa|financ|emprest|consorc|moto/i.test((o.nome||'')+' '+(o.cat||''))));
  const fgtsTot=(S.settings.fgts?.Cristian?.ini||0)+(S.settings.fgts?.Pedro?.ini||0);
  return `${cenNav()}
  <div class="panel">
    <div class="bar" style="justify-content:space-between;margin-bottom:8px">
      <div>
        <h2 style="margin:0">🏦 Simulador de Quitação Antecipada & Amortização</h2>
        <div class="note" style="margin:2px 0 0">Descubra quanto você economiza em juros e quantos meses antecipa usando um aporte extra ou FGTS.</div>
      </div>
      ${fgtsTot>0?`<button class="b g" data-act="amort-use-fgts" data-val="${fgtsTot.toFixed(2)}">⚡ Simular usando FGTS (${brl(fgtsTot)})</button>`:''}
    </div>
    ${loans.length?`<div class="bar" style="margin-bottom:10px">
      <label class="note" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;max-width:100%"><b>Carregar de Fora do cartão:</b>
        <select id="amort-off-sel" style="max-width:100%"><option value="">– Selecione um contrato/parcelamento (ou edite manualmente) –</option>
        ${loans.map(o=>`<option value="${o.id}" ${String(a.offId)===String(o.id)?'selected':''}>${esc(o.nome)} (${brl(offV(o,S.settings.base))}/mês${o.np?` · ${o.np}x`:''})</option>`).join('')}
        </select>
      </label>
    </div>`:''}
    <div class="fire-grid">
      <label>Descrição do contrato<input data-amort="nome" value="${esc(a.nome||'Financiamento')}"> </label>
      <label>Saldo devedor atual (R$)<input type="number" step="500" data-amort="saldo" value="${a.saldo??0}"></label>
      <label>Parcela mensal atual (R$)<input type="number" step="50" data-amort="pmt" value="${a.pmt??0}"></label>
      <label>Meses restantes<input type="number" step="1" min="1" max="600" data-amort="meses" value="${a.meses??1}"></label>
      <label>Taxa de juros (% a.m.)<input type="number" step="0.05" min="0" data-amort="jurosMes" value="${a.jurosMes??0}"></label>
      <label>Aporte extra / FGTS (R$)<input type="number" step="500" min="0" data-amort="aporteExtra" value="${a.aporteExtra??0}"></label>
      <label>Estratégia da amortização<select data-amort="modo">
        <option value="prazo" ${a.modo!=='parcela'?'selected':''}>Reduzir prazo (manter parcela)</option>
        <option value="parcela" ${a.modo==='parcela'?'selected':''}>Reduzir valor da parcela (manter prazo)</option>
      </select></label>
    </div>
    ${sim.pmtInvalid?`<div class="warn" style="margin:6px 0 0">A parcela informada era menor ou igual aos juros mensais; ajustamos automaticamente para a parcela Price mínima (${brl(sim.pmtEff)}).</div>`:''}
  </div>
  <div class="cards">
    <div class="card c-pos"><small>Economia total em juros</small><b class="pos">${brl(sim.jurosEcon)}</b><small class="sub">Juros originais: ${brl(sim.orig.jurosTotal)} → Novo: ${brl(sim.novo.jurosTotal)}</small></div>
    <div class="card c-pos"><small>${sim.modo==='prazo'?'Prazo antecipado':'Alívio na parcela mensal'}</small><b>${sim.modo==='prazo'?(sim.novo.meses===0?'Quitação imediata!':`${sim.mesesEcon} mês(es) a menos`):`${brl(sim.pmtEcon)}/mês`}</b><small class="sub">${sim.modo==='prazo'?`De ${sim.orig.meses}x (${lab(sim.fimOrig)}) → ${sim.novo.meses}x (${lab(sim.fimNovo)})`:`Nova parcela: ${brl(sim.pmtNew)}/mês`}</small></div>
    <div class="card"><small>Saldo devedor pós-amortização</small><b>${brl(Math.max(0,sim.saldo-sim.extra))}</b><small class="sub">Aporte aplicado: ${brl(sim.extra)}</small></div>
    <div class="card"><small>Retorno total do aporte</small><b>${sim.extra>0?Math.round((sim.jurosEcon/sim.extra)*100)+'%':'–'}</b><small class="sub">Economia de juros sobre valor amortizado</small></div>
  </div>
  <div class="panel"><h2>Evolução do saldo devedor: Original × Amortizado</h2><canvas id="c-amort" height="105"></canvas></div>`;
}
function drawAmort(){
  const sim=amortSim(S.extras.amort||{}),c=document.getElementById('c-amort');if(!c)return;
  const maxM=Math.max(sim.orig.path.length,sim.novo.path.length);
  const L=Array.from({length:maxM},(_,i)=>i===0?'Hoje':lab(addM(S.settings.base,i-1)));
  const pad=arr=>Array.from({length:maxM},(_,i)=>arr[i]!=null?arr[i]:0);
  charts.push(new Chart(c,{type:'line',data:{labels:L,datasets:[
    {label:'Sem amortizar (Original)',data:pad(sim.orig.path),borderColor:'#80868f',pointRadius:0,tension:.15},
    {label:'Com amortização extra',data:pad(sim.novo.path),borderColor:'#2b8a3e',borderWidth:3,pointRadius:0,tension:.15}]},
    options:{plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.parsed.y)}}}}}));
}
function fireDefaults(){
  const E=S.extras,st=S.settings,f0=flow(false)[0]||{renda:0,cartao:0,fora:0};
  const patrLiq=(st.saldoIni?.Cristian||0)+(st.saldoIni?.Pedro||0)+(E.reserva?.saldo||0)+(E.inv||[]).reduce((a,i)=>a+(+i.saldo||0),0)+(E.projetos||[]).reduce((a,p)=>a+(+p.saldoAtual||0),0);
  const fgtsHoje=(st.fgts?.Cristian?.ini||0)+(st.fgts?.Pedro?.ini||0);
  const custoVida=Math.max(0,Math.round((f0.cartao||0)+(f0.fora||0)));
  const aporteCap=Math.max(0,Math.round((f0.renda||0)-custoVida));
  return {patrLiq,fgtsHoje,custoVida,aporteCap};
}
function fireSim(cfg){
  const def=fireDefaults();
  const gasto=+cfg.gastoMensal>0?+cfg.gastoMensal:def.custoVida;
  const aporte=cfg.aporteMensal!==''&&cfg.aporteMensal!=null&&+cfg.aporteMensal>=0?+cfg.aporteMensal:def.aporteCap;
  const patrIni=cfg.patrimonioAtual!==''&&cfg.patrimonioAtual!=null?+cfg.patrimonioAtual:(def.patrLiq+(cfg.incluirFgts!==false?def.fgtsHoje:0));
  const swr=Math.max(0.5,+cfg.swr||4.0)/100;
  const rendAnual=+cfg.rendRealAnual||0;
  const rMes=Math.pow(1+rendAnual/100,1/12)-1;
  const target=gasto>0?(gasto*12)/swr:0;
  const idade=+cfg.idadeAtual||32;
  const base=S.settings.base;
  let bal=patrIni,fireMonths=target>0&&bal>=target?0:null,fireYm=fireMonths===0?base:null;
  const pts=[{yr:0,ym:base,patr:bal,rendaPassiva:bal*swr/12}];
  const maxM=600;
  for(let m=1;m<=maxM;m++){
    bal=bal*(1+rMes)+aporte;
    if(fireMonths===null&&target>0&&bal>=target){fireMonths=m;fireYm=addM(base,m)}
    if(m%12===0){
      const y=m/12;
      if(y<=35||(fireMonths&&y<=Math.ceil(fireMonths/12)+3))pts.push({yr:y,ym:addM(base,m),patr:bal,rendaPassiva:bal*swr/12});
    }
  }
  const showPts=pts.slice(0,Math.max(16,fireMonths?Math.min(36,Math.ceil(fireMonths/12)+4):26));
  const pctHoje=target>0?Math.min(100,Math.round(patrIni/target*100)):0;
  const rendaPassivaHoje=patrIni*swr/12;
  const fireIdade=fireMonths!=null?+(idade+fireMonths/12).toFixed(1):null;
  return {def,gasto,aporte,patrIni,swrPct:+(swr*100).toFixed(2),rendAnual,target,pctHoje,rendaPassivaHoje,fireMonths,fireYm,fireIdade,pts:showPts};
}
function rFire(){
  const f=S.extras.fire||{},sim=fireSim(f);
  const yrsTxt=sim.fireMonths==null?'Não atinge em 50 anos (aumente aporte ou rentabilidade)':
    sim.fireMonths===0?'✅ Liberdade Financeira já atingida hoje!':
    `${Math.floor(sim.fireMonths/12)} ano(s) e ${sim.fireMonths%12} mês(es) · <b>${lab(sim.fireYm)}</b> (~${sim.fireIdade} anos)`;
  return `${cenNav()}
  <div class="panel">
    <div class="bar" style="justify-content:space-between;margin-bottom:8px">
      <div>
        <h2 style="margin:0">🔥 Calculadora de Independência Financeira (FIRE)</h2>
        <div class="note" style="margin:2px 0 0">Calcula o patrimônio necessário para a renda passiva cobrir 100% do custo de vida do casal (Regra dos 4% ajustável).</div>
      </div>
      <button class="b g" data-act="fire-fill">⚡ Puxar números atuais do casal</button>
    </div>
    <div class="fire-grid">
      <label>Custo de vida mensal alvo (R$)<input type="number" step="100" data-fire="gastoMensal" value="${f.gastoMensal||''}" placeholder="${sim.def.custoVida} (atual)"></label>
      <label>Aporte mensal do casal (R$)<input type="number" step="100" data-fire="aporteMensal" value="${f.aporteMensal!==''&&f.aporteMensal!=null&&+f.aporteMensal>0?f.aporteMensal:''}" placeholder="${sim.def.aporteCap} (sobra)"></label>
      <label>Patrimônio investido hoje (R$)<input type="number" step="1000" data-fire="patrimonioAtual" value="${f.patrimonioAtual!==''&&f.patrimonioAtual!=null?f.patrimonioAtual:''}" placeholder="${Math.round(sim.def.patrLiq+(f.incluirFgts!==false?sim.def.fgtsHoje:0))}"></label>
      <label>Rentabilidade real (% a.a. acima da inflação)<input type="number" step="0.2" data-fire="rendRealAnual" value="${f.rendRealAnual??5.5}"></label>
      <label title="Safe Withdrawal Rate: % do patrimônio sacado por ano sem esgotá-lo (4% equivale a 25× o gasto anual)">Taxa de retirada segura (% a.a. — 4% = 25× gasto anual)<input type="number" step="0.2" min="1" max="10" data-fire="swr" value="${f.swr??4.0}"></label>
      <label>Idade de referência hoje<input type="number" step="1" min="18" max="90" data-fire="idadeAtual" value="${f.idadeAtual??32}"></label>
    </div>
    <label class="note" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" data-fire="incluirFgts" ${f.incluirFgts!==false?'checked':''}> Incluir saldo atual de FGTS (${brl(sim.def.fgtsHoje)}) no patrimônio inicial</label>
  </div>
  <div class="cards">
    <div class="card"><small>Patrimônio FIRE Alvo (${sim.swrPct}% a.a.)</small><b>${brl(sim.target)}</b><small class="sub">Para gerar ${brl(sim.gasto)}/mês de renda passiva perpétua</small></div>
    <div class="card ${sim.pctHoje>=100?'c-pos':''}"><small>Patrimônio considerado hoje</small><b>${brl(sim.patrIni)}</b><small class="sub"><b>${sim.pctHoje}%</b> da meta · Renda passiva hoje: ${brl(sim.rendaPassivaHoje)}/mês</small></div>
    <div class="card ${sim.fireMonths!=null?'c-pos':'c-warn'}"><small>Previsão de Independência (FIRE)</small><b style="font-size:15px">${yrsTxt}</b><small class="sub">Aporte simulado: ${brl(sim.aporte)}/mês a ${sim.rendAnual}% real/ano</small></div>
    <div class="card"><small>Falta acumular</small><b>${brl(Math.max(0,sim.target-sim.patrIni))}</b><small class="sub">${sim.gasto>0?`Equivale a ${(100/sim.swrPct).toFixed(1)}× despesas anuais`:''}</small></div>
  </div>
  <div class="panel"><h2>Trajetória Patrimonial até Independência Financeira</h2><canvas id="c-fire" height="105"></canvas></div>`;
}
function drawFire(){
  const sim=fireSim(S.extras.fire||{}),c=document.getElementById('c-fire');if(!c)return;
  const baseYr=+S.settings.base.slice(0,4);
  charts.push(new Chart(c,{type:'line',data:{labels:sim.pts.map(p=>String(baseYr+p.yr)),datasets:[
    {label:'Patrimônio Projetado (R$ real)',data:sim.pts.map(p=>+p.patr.toFixed(0)),borderColor:'#0e6b7c',backgroundColor:'rgba(14,107,124,.12)',fill:true,borderWidth:3,pointRadius:2,tension:.2},
    {label:'Meta FIRE',data:sim.pts.map(()=>+sim.target.toFixed(0)),borderColor:'#2b8a3e',borderDash:[6,4],pointRadius:0}]},
    options:{plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.parsed.y)}}}}}));
}
function rCen(){
  if(cenMode==='amort')return rAmort();
  if(cenMode==='fire')return rFire();
  const c=S.extras.cen,B=flow(),Sc=scenario(),b=B[B.length-1],s=Sc[Sc.length-1],Ms=allMonths();
  const avg=R=>R.reduce((a,r)=>a+r.sobra,0)/R.length;
  const dl=(v)=>`<small class="${v<0?'neg':'pos'}">${v>=0?'+':''}${brl(v)}</small>`;
  const rows=[['Simulação de renda (%)','rendaPct'],['Moradia reajustada em (%)','moradiaPct'],['Estimativas opcionais (%)','varPct'],['Despesa extra mensal (R$)','extra']];
  return `${cenNav()}
  <div class="panel"><h2>Premissas do cenário</h2><div class="grid2">
   ${rows.map(([l,f])=>`<label>${l}</label><input type="number" step="0.1" data-cen="${f}" value="${c[f]||0}">`).join('')}
   <label>Despesa extra a partir de</label><input type="month" data-cen="extraDe" value="${c.extraDe||''}" style="width:150px">
   <label>Quitar/encerrar item fora do cartão</label><select data-cen="quitarId"><option value="">–</option>${S.off.filter(o=>o.kind!=='receita').map(o=>`<option value="${o.id}" ${String(c.quitarId)===String(o.id)?'selected':''}>${esc(o.nome.slice(0,34))}</option>`).join('')}</select>
   <label>…encerrando em (1º mês sem cobrança)</label><select data-cen="quitarMes"><option value="">–</option>${Ms.map(m=>`<option value="${m}" ${c.quitarMes===m?'selected':''}>${lab(m)}</option>`).join('')}</select></div>
   <div class="bar" style="margin-top:12px"><button class="b g" id="cenreset">Limpar cenário</button></div></div>
  <div class="cards"><div class="card"><small>Saldo em ${lab(b.ym)}: base</small><b>${brl(b.saldo)}</b></div>
   <div class="card"><small>Saldo em ${lab(b.ym)}: cenário</small><b class="${cls(s.saldo)}">${brl(s.saldo)}</b>${dl(s.saldo-b.saldo)}</div>
   <div class="card"><small>Sobra média: base</small><b>${brl(avg(B))}</b></div>
   <div class="card"><small>Sobra média: cenário</small><b>${brl(avg(Sc))}</b>${dl(avg(Sc)-avg(B))}</div></div>
  <div class="panel"><h2>Saldo em conta: base x cenário</h2><canvas id="cc"></canvas></div>`;
}
function drawCen(){
  if(cenMode==='amort'){drawAmort();return}
  if(cenMode==='fire'){drawFire();return}
  const B=flow(),Sc=scenario(),c=document.getElementById('cc');if(!c)return;
  charts.push(new Chart(c,{type:'line',data:{labels:B.map(r=>lab(r.ym)),datasets:[
    {label:'Base',data:B.map(r=>r.saldo),borderColor:'#80868f',pointRadius:0,tension:.2},
    {label:'Cenário',data:Sc.map(r=>r.saldo),borderColor:'#0e6b7c',borderWidth:3,pointRadius:0,tension:.2}]},
    options:{plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.parsed.y)}}}}}));
}

function rCartao(){
  const Ms=months(),cats=[...new Set([...OCATS,...S.tx.map(x=>x.cat)])].filter(Boolean).sort();
  const groups=['parcelas','fixas','assinaturas'];
  const sections=groups.map(g=>{
    const items=S.tx.filter(x=>GROUP[x.tipo]===g&&live(x)).map(x=>({x,vals:Ms.map((_,k)=>txAmount(x,k)*weight(x.quem))})).filter(i=>i.vals.some(v=>v));
    items.sort((a,b)=>b.vals[1]-a.vals[1]||b.vals[0]-a.vals[0]);
    const tot=Ms.map((_,k)=>items.reduce((a,i)=>a+i.vals[k],0));
    return `<tr class="sec"><td colspan="${Ms.length+3}">${GLAB[g]}</td></tr>`+
      items.map(i=>`<tr><td class="l">${esc(i.x.desc.slice(0,42))}${i.x.tipo==='parcelada'?` <small>(${i.x.cur}/${i.x.tot})</small>`:''}</td><td class="l"><span class="tag t-${i.x.quem}">${i.x.quem}${i.x.quem==='Conjunto'?' (50/50)':''}</span></td><td class="l">${i.x.fim?lab(i.x.fim):''}</td>${i.vals.map(v=>`<td>${v?num(v):''}</td>`).join('')}</tr>`).join('')+
      `<tr class="tot"><td class="l">Total ${GLAB[g]}</td><td></td><td></td>${tot.map(v=>`<td>${num(v)}</td>`).join('')}</tr>`;
  }).join('');
  const comp=Ms.map((_,k)=>S.tx.reduce((a,x)=>a+txAmount(x,k)*weight(x.quem),0));
  const vList=S.settings.varItems||[];
  const vRows=vList.filter(v=>v.ativo&&v.valor>0).map(v=>({v,vals:Ms.map((ym,k)=>k===0?0:(S.settings.includeVar&&vItemActive(v,ym)?v.valor*weight(v.quem):0))})).filter(r=>r.vals.some(x=>x));
  const realVar0=PEOPLE.reduce((a,q)=>a+varAt(q,0)*weight(q),0);
  const vt=Ms.map((_,k)=>k===0?realVar0:vRows.reduce((a,r)=>a+r.vals[k],0));
  const s=S.settings;
  const presets=[['Gasolina','Transporte'],['Alimentação fora','Alimentação'],['Mercado','Mercado'],['Delivery / iFood','Alimentação'],['Farmácia','Saúde'],['Lazer','Lazer']];
  const varPanel=`<div class="panel"><div class="bar" style="justify-content:space-between;margin-bottom:8px">
    <h2 style="margin:0">Estimativas de gastos futuros (opcionais)</h2>
    <label class="note"><input type="checkbox" data-s="includeVar" ${s.includeVar?'checked':''}> Ativar estimativas nos meses futuros</label>
  </div>
  <div class="note" style="margin-bottom:8px">Por padrão, futuros exibem apenas compromissos programados. Adicione estimativas opcionais abaixo (Individual ou Conjunto 50/50):</div>
  <div class="bar">
    ${presets.map(([n,c])=>`<button class="b g" data-act="add-vitem" data-nome="${n}" data-cat="${c}">+ ${n}</button>`).join('')}
    <button class="b" data-act="add-vitem" data-nome="Nova estimativa" data-cat="Outros">+ Outra estimativa</button>
  </div>
  <datalist id="vcats">${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</datalist>
  ${vList.length?`<div class="tw"><table><tr><th class="l">Descrição da estimativa</th><th class="l">Ativo</th><th class="l">Quem (Indiv. ou 50/50)</th><th class="l">Categoria</th><th>Valor mensal (R$)</th><th class="l">Início</th><th class="l">Até (mês)</th><th></th></tr>
  ${vList.map(v=>`<tr data-vid="${v.id}">
    <td class="l"><input class="d" data-vf="nome" value="${esc(v.nome)}"></td>
    <td class="l"><input type="checkbox" data-vf="ativo" ${v.ativo?'checked':''}></td>
    <td class="l"><select data-vf="quem">${quemOpts(v.quem)}</select></td>
    <td class="l"><input list="vcats" data-vf="cat" value="${esc(v.cat||'')}"></td>
    <td><input type="number" step="0.01" data-vf="valor" value="${v.valor||0}"></td>
    <td class="l"><input type="month" data-vf="inicio" value="${v.inicio||addM(s.base,1)}"></td>
    <td class="l"><input type="month" data-vf="fim" value="${v.fim||''}"></td>
    <td><button class="b r" data-act="del-vitem" title="Excluir estimativa">×</button></td>
  </tr>`).join('')}</table></div>`:`<div class="note">Nenhuma estimativa manual adicionada. Somente parcelas, despesas fixas e assinaturas estão sendo projetadas.</div>`}</div>`;
  return varPanel+`<div class="sec-lbl">Compromissos &amp; Projeção Mensal</div>
  <div class="panel"><h2>Cartão – visão: ${esc(document.getElementById('view').selectedOptions[0].text)}</h2>
  <div class="note">Mês atual (${lab(Ms[0])}) mostra os lançamentos reais; meses seguintes mostram parcelas, fixas, assinaturas e estimativas ativas.</div>
  <div class="tw"><table><tr><th class="l">Item</th><th class="l">Quem</th><th class="l">Até</th>${Ms.map(m=>`<th>${lab(m)}</th>`).join('')}</tr>
  ${sections}
  <tr class="tot"><td class="l">PROGRAMADO NO CARTÃO (parcelas + fixas + assinaturas)</td><td></td><td></td>${comp.map(v=>`<td>${num(v)}</td>`).join('')}</tr>
  <tr class="sec"><td colspan="${Ms.length+3}">Variáveis já lançadas em ${lab(Ms[0])} e Estimativas manuais (meses seguintes)</td></tr>
  <tr><td class="l">Variáveis já lançadas na fatura (${lab(Ms[0])})</td><td class="l">–</td><td></td><td>${num(realVar0)}</td>${Ms.slice(1).map(()=>`<td></td>`).join('')}</tr>
  ${vRows.map(r=>`<tr><td class="l">📌 ${esc(r.v.nome)} (estimativa)</td><td class="l"><span class="tag t-${r.v.quem}">${r.v.quem}${r.v.quem==='Conjunto'?' (50/50)':''}</span></td><td class="l">${r.v.fim?lab(r.v.fim):''}</td>${r.vals.map(v=>`<td>${v?num(v):''}</td>`).join('')}</tr>`).join('')}
  <tr class="tot"><td class="l">TOTAL DO CARTÃO</td><td></td><td></td>${comp.map((v,k)=>`<td>${num(v+vt[k])}</td>`).join('')}</tr>
  </table></div></div>`;
}

function opts(obj,sel){return Object.entries(obj).map(([k,v])=>`<option value="${k}" ${k===sel?'selected':''}>${v}</option>`).join('')}
function quemOpts(sel){return PEOPLE.map(p=>`<option ${p===sel?'selected':''}>${p}</option>`).join('')}
const cardBadge=x=>(x.portador||x.cartao)?`<small class="note" style="margin-left:6px">(${esc([x.portador,x.cartao&&'final '+x.cartao].filter(Boolean).join(' · '))})</small>`:'';
function batchBar(rows,isImp=false){
  const sel=rows.filter(x=>SEL.has(x.id));
  if(!sel.length)return '';
  const soma=sel.reduce((a,x)=>a+x.valor,0);
  return `<div class="batch-bar">
    <b>✓ ${sel.length} selecionado(s) · ${brl(soma)}</b>
    <select id="bquem"><option value="">Atribuir Quem…</option>${PEOPLE.map(p=>`<option value="${p}">${p}</option>`).join('')}</select>
    <select id="btipo"><option value="">Mudar Tipo…</option>${opts(TIPOS,'')}</select>
    <input id="bcat" list="cats" placeholder="Mudar Categoria…" style="width:150px">
    <button class="b g" data-act="batch-cat" style="padding:4px 9px;font-size:12px">Aplicar cat.</button>
    ${isImp?`<button class="b" data-act="batch-ok">✓ Validar selecionados (${sel.length})</button>`:''}
    <button class="b r" data-act="batch-del">× Excluir (${sel.length})</button>
    <button class="b g" data-act="batch-clear">Limpar seleção</button>
  </div>`;
}
function rLanc(){
  const fats=[...new Set(S.tx.map(x=>x.fatura))].sort().reverse(),fsel=F.fat||S.settings.base;
  const cats=[...new Set(S.tx.map(x=>x.cat))].sort();
  const rows=S.tx.filter(x=>(fsel==='all'||x.fatura===fsel)&&(!F.rev||x.rev)&&(!F.quem||x.quem===F.quem)&&(!F.tipo||x.tipo===F.tipo)&&(!F.txt||x.desc.toLowerCase().includes(F.txt.toLowerCase()))).sort((a,b)=>b.data.localeCompare(a.data)||a.id-b.id);
  const tot=rows.filter(x=>x.ativo&&x.tipo!=='ignorar').reduce((a,x)=>a+x.valor,0);
  const byQuem={Cristian:0,Pedro:0,Conjunto:0};rows.filter(x=>x.ativo&&x.tipo!=='ignorar').forEach(x=>byQuem[x.quem]=(byQuem[x.quem]||0)+x.valor);
  const allChecked=rows.length>0&&rows.every(x=>SEL.has(x.id));
  return `<div class="panel"><h2>Lançamentos da fatura</h2>
  <div class="bar">
    <input id="ftxt" placeholder="Buscar descrição" value="${esc(F.txt)}">
    <select id="fquem"><option value="">Todos</option>${quemOpts(F.quem)}</select>
    <select id="ffat"><option value="all" ${fsel==='all'?'selected':''}>Todas as faturas</option>${fats.map(f=>`<option value="${f}" ${f===fsel?'selected':''}>${lab(f)}</option>`).join('')}</select>
    <label><input type="checkbox" id="frev" ${F.rev?'checked':''}> só pendentes</label>
    <select id="ftipo"><option value="">Todos os tipos</option>${opts(TIPOS,F.tipo)}</select>
    <button class="b" data-act="add-tx">+ Lançamento</button>
    <span class="note">${rows.length} itens · total ${brl(tot)} · <b>Indiv. Cristian:</b> ${brl(byQuem.Cristian)} · <b>Indiv. Pedro:</b> ${brl(byQuem.Pedro)} · <b>Conjunto (50/50):</b> ${brl(byQuem.Conjunto)}</span>
  </div>
  <datalist id="cats">${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</datalist>
  ${batchBar(rows,false)}
  <div class="tw"><table><tr><th class="l"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="sel-all-tx" ${allChecked?'checked':''} title="Selecionar todos visíveis"> Descrição</label></th><th class="l">Data</th><th>Parcela</th><th>Valor</th><th class="l">Tipo</th><th class="l">Quem</th><th class="l">Categoria</th><th class="l">Até (mês)</th><th class="l">Ativo</th><th></th></tr>
  ${rows.map(x=>`<tr data-id="${x.id}"><td class="l"><div style="display:flex;align-items:center;gap:6px"><input type="checkbox" data-sel="${x.id}" ${SEL.has(x.id)?'checked':''}><input class="d" data-f="desc" value="${esc(x.desc)}">${cardBadge(x)}</div></td>
   <td class="l"><input type="date" data-f="data" value="${x.data}"></td>
   <td>${x.tot?`<input type="number" style="width:46px" data-f="cur" value="${x.cur}">/<input type="number" style="width:46px" data-f="tot" value="${x.tot}">`:''}</td>
   <td><input type="number" step="0.01" data-f="valor" value="${x.valor}"></td>
   <td class="l"><select data-f="tipo">${opts(TIPOS,x.tipo)}</select></td>
   <td class="l"><select data-f="quem">${quemOpts(x.quem)}</select></td>
   <td class="l"><input list="cats" data-f="cat" value="${esc(x.cat)}"></td>
   <td class="l">${['fixa','assinatura_mensal','assinatura_anual'].includes(x.tipo)?`<input type="month" data-f="fim" value="${x.fim||''}">`:''}</td>
   <td class="l"><input type="checkbox" data-f="ativo" ${x.ativo?'checked':''}></td>
   <td><button class="b r" data-act="del-tx" title="Excluir">×</button></td></tr>`).join('')}
  </table></div>
  <div class="note">Dica: selecione múltiplos itens na 1ª coluna para alterar Quem, Tipo, Categoria ou excluir em lote. Lançamentos "Cristian" ou "Pedro" são 100% individuais; apenas "Conjunto" é dividido 50/50.</div></div>`;
}
const OCATS=['Moradia','Transporte','Impostos','Saúde','Educação','Seguros','Lazer','Outros'];
function rFora(){
  const ref=F.om||S.settings.base,Ms=allMonths(),items=S.off;
  const st=o=>o.inicio>ref?['futuro','#e3f1f3','#0e6b7c']:(o.fim&&o.fim<ref?['encerrado','#f1f3f5','#80868f']:['ativo','#e3f4e8','#2b8a3e']);
  const act=o=>offActive(o,ref);
  const rec=items.filter(o=>o.kind==='receita'),des=items.filter(o=>o.kind!=='receita');
  const actDes=des.filter(act),paidDes=actDes.filter(o=>isPaid(ref,o.id));
  const cats=[...new Set([...OCATS,...des.map(o=>o.cat||'Outros')])].filter(c=>c!=='Renda'),tot=l=>l.filter(act).reduce((a,o)=>a+offV(o,ref),0);
  const renda=tot(rec),fora=tot(des),pagoVal=paidDes.reduce((a,o)=>a+offV(o,ref),0);
  const conjDes=actDes.filter(o=>o.quem==='Conjunto').reduce((a,o)=>a+offV(o,ref),0);
  const indDes=fora-conjDes;
  const catOpts=sel=>cats.map(c=>`<option value="${esc(c)}" ${c===(sel||'Outros')?'selected':''}>${esc(c)}</option>`).join('');
  const row=(o,isRec)=>{const[t,bg,fg]=st(o),ok=isPaid(ref,o.id),active=act(o),ds=active&&!isRec?dueStatus(o,ref):null;return `<tr data-id="${o.id}" style="${t==='encerrado'?'opacity:.55':''}">
   <td class="l"><input class="d" data-f="nome" value="${esc(o.nome)}"></td>
   ${isRec?'':`<td class="l">${active?`<input type="checkbox" data-paid="${o.id}" data-ym="${ref}" ${ok?'checked':''} title="Marcar como pago em ${lab(ref)}">`:'–'}</td>`}
   ${isRec?'':`<td class="l"><select data-f="cat">${catOpts(o.cat)}</select></td>`}
   <td class="l"><select data-f="quem">${quemOpts(o.quem)}</select></td>
   <td><input type="number" step="0.01" data-f="valor" value="${o.valor}"></td>
   <td><div style="display:inline-flex;align-items:center;gap:5px"><input type="number" min="1" max="31" data-f="venc" value="${o.venc||''}" placeholder="dia" style="width:54px">${ds&&!ok&&ds.urgent?`<span class="due-badge ${ds.cls}">${ds.label}</span>`:''}</div></td>
   <td class="l"><select data-f="freq"><option value="mensal" ${o.freq!=='anual'?'selected':''}>Mensal</option><option value="anual" ${o.freq==='anual'?'selected':''}>Anual</option></select></td>
   <td class="l"><input type="month" data-f="inicio" value="${o.inicio}"></td>
   <td class="l"><input type="month" data-f="fim" value="${o.fim||''}"></td>
   <td><input type="number" data-f="np" value="${o.np||''}" placeholder="–" style="width:56px"></td>
   <td><input type="number" step="0.1" data-f="reaj" value="${o.reaj||''}" placeholder="0" style="width:60px"></td>
   <td><span class="tag" style="background:${bg};color:${fg}">${t}</span></td>
   <td><button class="b r" data-act="del-off">×</button></td></tr>`};
  const recSorted=[...rec].sort((a,b)=>(a.venc||99)-(b.venc||99));
  const desGroups=cats.map(c=>({c,l:des.filter(o=>(o.cat||'Outros')===c).sort((a,b)=>(a.venc||99)-(b.venc||99))})).filter(g=>g.l.length>0);
  return `<div class="bar" style="justify-content:space-between;margin-bottom:10px">
    <div class="bar" style="margin:0"><b>Mês de referência</b><select id="fom">${Ms.map(m=>`<option value="${m}" ${m===ref?'selected':''}>${lab(m)}</option>`).join('')}</select></div>
    <div class="bar" style="margin:0">
      <button class="b" data-act="add-off" data-cat="Outros" data-kind="despesa">+ Nova Despesa</button>
      <button class="b g" data-act="add-off" data-cat="Renda" data-kind="receita" data-quem="Cristian">+ Nova Renda</button>
      <button class="b g" data-act="add-cat">+ Nova categoria</button>
    </div>
  </div>
  <div class="cards">
   <div class="card c-pos"><small>Renda no mês (${lab(ref)})</small><b>${brl(renda)}</b><small class="sub">Sobra p/ cartão &amp; caixa: <b class="${cls(renda-fora)}">${brl(renda-fora)}</b></small></div>
   <div class="card c-warn"><small>Conjuntas Fora do Cartão (50/50)</small><b>${brl(conjDes)}</b><small class="sub">${brl(conjDes/2)} p/ Cristian · ${brl(conjDes/2)} p/ Pedro</small></div>
   <div class="card"><small>Individuais Fora do Cartão</small><b>${brl(indDes)}</b><small class="sub">Total fora do cartão: ${brl(fora)}</small></div>
   <div class="card ${paidDes.length===actDes.length&&actDes.length?'c-pos':'c-warn'}"><small>Contas pagas (${lab(ref)})</small><b>${paidDes.length}/${actDes.length}</b><small class="sub">${brl(pagoVal)} pagos · faltam ${brl(Math.max(0,fora-pagoVal))}</small></div>
  </div>
  ${dueAlertsPanel(ref,true)}
  <div class="sec-lbl">Rendas &amp; Contas Recorrentes</div>
  <div class="panel">
    <div class="bar" style="justify-content:space-between"><h2 style="margin:0">💰 Rendas (Entradas) <span class="note">· ${brl(renda)} em ${lab(ref)}</span></h2>
      <button class="b g" data-act="add-off" data-cat="Renda" data-kind="receita" data-quem="Cristian">+ Adicionar Renda</button>
    </div>
    ${recSorted.length?`<div class="tw"><table><tr><th class="l">Nome</th><th class="l">Quem</th><th>Valor</th><th>Dia</th><th class="l">Frequência</th><th class="l">Início</th><th class="l">Fim</th><th>Parc.</th><th>Reaj. %</th><th></th><th></th></tr>${recSorted.map(o=>row(o,true)).join('')}</table></div>`:'<div class="note">Nenhuma renda cadastrada.</div>'}
  </div>
  <div class="panel">
    <div class="bar" style="justify-content:space-between"><h2 style="margin:0">🧾 Despesas Fora do Cartão <span class="note">· ${brl(fora)} em ${lab(ref)} (${des.length} itens)</span></h2>
      <button class="b g" data-act="add-off" data-cat="Outros" data-kind="despesa">+ Adicionar Despesa</button>
    </div>
    ${desGroups.length?`<div class="tw"><table>
      <tr><th class="l">Nome</th><th class="l">Pago</th><th class="l">Categoria</th><th class="l">Quem</th><th>Valor</th><th>Venc.</th><th class="l">Freq.</th><th class="l">Início</th><th class="l">Fim</th><th>Parc.</th><th>Reaj. %</th><th></th><th></th></tr>
      ${desGroups.map(g=>`<tr class="sec"><td colspan="13"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span>${esc(g.c)} · ${brl(tot(g.l))} em ${lab(ref)}</span><button class="b g" data-act="add-off" data-cat="${esc(g.c)}" data-kind="despesa" style="padding:2px 8px;font-size:11px">+ ${esc(g.c)}</button></div></td></tr>${g.l.map(o=>row(o,false)).join('')}`).join('')}
    </table></div>`:'<div class="note">Nenhuma despesa fora do cartão cadastrada.</div>'}
  </div>`;
}

function irpfYears(){
  const s=new Set([S.settings.base.slice(0,4),todayYM().slice(0,4)]);
  S.tx.forEach(x=>{if(x.fatura)s.add(x.fatura.slice(0,4))});
  S.off.forEach(o=>{if(o.inicio)s.add(o.inicio.slice(0,4));if(o.fim)s.add(o.fim.slice(0,4))});
  Object.keys(S.extras.acertoPix||{}).forEach(ym=>s.add(ym.slice(0,4)));
  Object.keys(S.extras.closedMonths||{}).forEach(ym=>s.add(ym.slice(0,4)));
  return [...s].filter(Boolean).sort().reverse();
}
function irpfYearData(yr){
  const ir=S.extras.irpf||{},base=S.settings.base,pixMap=S.extras.acertoPix||{};
  const rows=Array.from({length:12},(_,i)=>{
    const ym=`${yr}-${String(i+1).padStart(2,'0')}`;
    const fr=S.extras.closedMonths?.[ym]||null;
    const isReal=ym<=base;
    let cardTotal,offTotal,cristianCPF,pedroInd,conj50,pedroCalc;
    if(fr){
      cardTotal=fr.card.total||0;
      offTotal=fr.off.total||0;
      cristianCPF=cardTotal+(ir.includeOffInCristian!==false?offTotal:0);
      pedroInd=fr.totIndP||0;
      conj50=fr.meioConj||0;
      pedroCalc=fr.totP||0;
    }else{
      const cList=isReal?S.tx.filter(x=>x.fatura===ym&&live(x)):monthItems(ym,false);
      const cByQ={Cristian:0,Pedro:0,Conjunto:0};
      cList.forEach(x=>cByQ[x.quem]=(cByQ[x.quem]||0)+x.valor);
      const oByQ={Cristian:0,Pedro:0,Conjunto:0};
      S.off.filter(o=>o.kind!=='receita'&&offActive(o,ym)).forEach(o=>{oByQ[o.quem]=(oByQ[o.quem]||0)+offV(o,ym)});
      cardTotal=cByQ.Cristian+cByQ.Pedro+cByQ.Conjunto;
      offTotal=oByQ.Cristian+oByQ.Pedro+oByQ.Conjunto;
      cristianCPF=cardTotal+(ir.includeOffInCristian!==false?offTotal:0);
      pedroInd=cByQ.Pedro+oByQ.Pedro;
      conj50=(cByQ.Conjunto+oByQ.Conjunto)*0.5;
      pedroCalc=pedroInd+conj50;
    }
    const pix=pixMap[ym]||fr?.pix||null;
    const pixVal=pix?(+pix.valor||0):0;
    const acOk=isPaid(ym,'acerto');
    return {ym,isReal,isFrozen:!!fr,cardTotal,offTotal,cristianCPF,pedroInd,conj50,pedroCalc,pix,pixVal,acOk};
  });
  const tot=rows.reduce((a,r)=>({
    cardTotal:a.cardTotal+r.cardTotal,offTotal:a.offTotal+r.offTotal,cristianCPF:a.cristianCPF+r.cristianCPF,
    pedroInd:a.pedroInd+r.pedroInd,conj50:a.conj50+r.conj50,pedroCalc:a.pedroCalc+r.pedroCalc,
    pixVal:a.pixVal+r.pixVal,nPix:a.nPix+(r.pixVal>0?1:0),nDecred:a.nDecred+(r.cardTotal>=5000?1:0)
  }),{cardTotal:0,offTotal:0,cristianCPF:0,pedroInd:0,conj50:0,pedroCalc:0,pixVal:0,nPix:0,nDecred:0});
  return {rows,tot};
}
function irpfClassifyDed(cat,desc){
  const c=norm(cat),d=norm(desc);
  if(/farmac|drogaria|droga\s*raia|drogasil|pacheco|pague\s*menos|panvel|ultrafarma/.test(c+' '+d))return 'farmacia';
  if(/educac|escola|colegio|faculdade|universidade|ensino|creche|pos[\s-]?grad|mestrado|doutorado|\bpuc\b|\busp\b|\bfgv\b|\binsper\b|mackenzie|estacio|anhanguera|mensalidade\s*escol/.test(c+' '+d))return 'educacao';
  if(/saude|medic|clinic|hospital|laborat|exame|fleury|dasa|lavoisier|odont|dentist|psicolog|terap|fisio|fono|nutri|oftalmo|unimed|bradesco\s*saude|sulamerica|\bamil\b|hapvida|notredame|plano\s*de\s*saude|ortoped|dermat|cardio|gineco|pediatr|urolog/.test(c+' '+d))return 'saude';
  return null;
}
function irpfHealthEdu(yr,includeProj=false){
  const base=S.settings.base,benefMap=S.extras.irpfBenef||{},items=[];
  S.tx.filter(x=>live(x)&&x.fatura&&x.fatura.startsWith(yr+'-')&&(includeProj||x.fatura<=base)).forEach(x=>{
    const nat=irpfClassifyDed(x.cat,x.desc);
    if(!nat)return;
    const keyId='tx:'+x.id;
    const autoBenef=nat==='farmacia'?'NaoDedutivel':(x.quem==='Conjunto'?'Definir':x.quem);
    const benef=benefMap[keyId]||autoBenef;
    items.push({keyId,ym:x.fatura,data:x.data,desc:x.desc,orig:'Cartão',cat:x.cat||'Outros',nat,quemOrig:x.quem,valor:x.valor,benef});
  });
  for(let m=1;m<=12;m++){
    const ym=`${yr}-${String(m).padStart(2,'0')}`;
    if(!includeProj&&ym>base)continue;
    S.off.filter(o=>o.kind!=='receita'&&offActive(o,ym)).forEach(o=>{
      const nat=irpfClassifyDed(o.cat,o.nome);
      if(!nat)return;
      const keyId='off:'+o.id;
      const autoBenef=nat==='farmacia'?'NaoDedutivel':(o.quem==='Conjunto'?'Definir':o.quem);
      const benef=benefMap[keyId]||autoBenef;
      items.push({keyId,ym,data:`${ym}-${String(Math.min(o.venc||1,daysInMonth(ym))).padStart(2,'0')}`,desc:o.nome,orig:'Fora do cartão',cat:o.cat||'Outros',nat,quemOrig:o.quem,valor:offV(o,ym),benef});
    });
  }
  items.sort((a,b)=>a.ym.localeCompare(b.ym)||a.data.localeCompare(b.data));
  const sumFor=(who,nat)=>items.filter(i=>i.benef===who&&(!nat||i.nat===nat)).reduce((a,i)=>a+i.valor,0);
  return {
    items,
    cSaude:sumFor('Cristian','saude'),cEdu:sumFor('Cristian','educacao'),cTot:sumFor('Cristian','saude')+sumFor('Cristian','educacao'),
    pSaude:sumFor('Pedro','saude'),pEdu:sumFor('Pedro','educacao'),pTot:sumFor('Pedro','saude')+sumFor('Pedro','educacao'),
    pend:items.filter(i=>i.benef==='Definir').reduce((a,i)=>a+i.valor,0),
    pendCount:items.filter(i=>i.benef==='Definir').length,
    naoDed:sumFor('NaoDedutivel',null)
  };
}
function irpfStatementText(yr,data){
  const ir=S.extras.irpf||{},pedroNome=(ir.pedroNome||'Pedro').trim()||'Pedro',pedroCpf=(ir.pedroCpf||'').trim()||'[CPF do Pedro]';
  const valBase=data.tot.pixVal>0?data.tot.pixVal:(ir.useCalcIfNoPix!==false?data.tot.pedroCalc:0);
  if(ir.modo==='doacao'){
    return `Transferências mensais recebidas de ${pedroNome}, CPF ${pedroCpf}, a título de doação em espécie via Pix, destinadas ao custeio e composição de despesas familiares no ano-calendário ${yr}, totalizando ${brl(valBase)}.`;
  }
  return `Transferências mensais recebidas de ${pedroNome}, CPF ${pedroCpf}, a título de ressarcimento/rateio proporcional de despesas familiares conjuntas e individuais custeadas pelo declarante em conta/cartão de sua titularidade, conforme demonstrativo de rateio anual anexado, totalizando ${brl(valBase)} no ano-calendário ${yr}.`;
}
function irpfBalancesAndAssets(yr){
  const decYm=`${yr}-12`,ir=S.extras.irpf||{},saved=(ir.saldosAno&&ir.saldosAno[yr])||{};
  const flowRows=flow(!!S.settings.includePlans),decFlow=flowRows.find(r=>r.ym===decYm)||null;
  const planDec=S.settings.includePlans?plans().find(r=>r.ym===decYm):null;
  const est={
    contaCasal:decFlow?decFlow.saldo:null,
    fgtsC:decFlow?decFlow.fg.Cristian:null,
    fgtsP:decFlow?decFlow.fg.Pedro:null,
    invCasal:planDec?(planDec.res+planDec.invT+(planDec.projT||0)):null
  };
  const numVal=k=>saved[k]!==''&&saved[k]!=null&&!isNaN(+saved[k])?+saved[k]:0;
  const hasAny= ['contaC','contaP','fgtsC','fgtsP','invCasal'].some(k=>saved[k]!==''&&saved[k]!=null);
  const totInformado=numVal('contaC')+numVal('contaP')+numVal('fgtsC')+numVal('fgtsP')+numVal('invCasal');

  const assets=[];
  S.off.filter(o=>o.kind!=='receita').forEach(o=>{
    const isRelevant=(o.np||0)>1||/carro|veic|moto|imovel|apart|casa|financ|consorc|emprest|seguro\s*auto|ipva/i.test((o.nome||'')+' '+(o.cat||''));
    if(!isRelevant)return;
    let pagoYr=0,mesesYr=0;
    for(let m=1;m<=12;m++){
      const ym=`${yr}-${String(m).padStart(2,'0')}`;
      if(offActive(o,ym)){pagoYr+=offV(o,ym);mesesYr++}
    }
    if(!mesesYr)return;
    let status='';
    if(o.fim&&o.fim<=decYm){
      status=`Quitado / encerrado em ${lab(o.fim)}`;
    }else if((o.np||0)>0){
      const paidDec=Math.min(o.np,Math.max(0,diffM(o.inicio,decYm)+1));
      const rem=Math.max(0,o.np-paidDec);
      status=rem===0?`Quitado em ${lab(decYm)} ✓`:`${paidDec}/${o.np} parc. em 31/12 · restam ${rem} (${brl(rem*offV(o,decYm))})`;
    }else{
      status=`Ativo em 31/12/${yr} (${mesesYr} mês(es) no ano)`;
    }
    assets.push({nome:o.nome,orig:'Fora do cartão',cat:o.cat||'Outros',quem:o.quem,mesesYr,pagoYr,status,isQuit:Boolean((o.fim&&o.fim<=decYm)||((o.np||0)>0&&diffM(o.inicio,decYm)+1>=o.np))});
  });

  const txGroups={};
  S.tx.filter(x=>live(x)&&x.tipo==='parcelada'&&(x.tot||0)>=3).forEach(x=>{
    const startYm=addM(x.fatura,-((x.cur||1)-1));
    const gk=`${key(x.desc)}|${startYm}|${x.tot}|${x.quem}`;
    if(!txGroups[gk])txGroups[gk]={rep:x,startYm,rows:[]};
    txGroups[gk].rows.push(x);
  });
  Object.values(txGroups).forEach(g=>{
    let pagoYr=0,mesesYr=0;
    for(let m=1;m<=12;m++){
      const ym=`${yr}-${String(m).padStart(2,'0')}`;
      const v=g.rows.reduce((a,x)=>a+txValAt(x,ym),0);
      if(v>0){pagoYr+=v;mesesYr++}
    }
    if(!pagoYr)return;
    const x=g.rep,endYm=addM(g.startYm,x.tot-1);
    let status='',isQuit=false;
    if(endYm<=decYm){
      status=`Quitado em ${lab(endYm)} ✓`;isQuit=true;
    }else{
      const paidDec=Math.min(x.tot,Math.max(0,diffM(g.startYm,decYm)+1));
      const rem=Math.max(0,x.tot-paidDec);
      status=`${paidDec}/${x.tot} parc. em 31/12 · restam ${rem} (${brl(rem*x.valor)})`;
    }
    assets.push({nome:`${x.desc} (${x.tot}x)`,orig:'Cartão parcelado',cat:x.cat||'Outros',quem:x.quem,mesesYr,pagoYr,status,isQuit});
  });

  assets.sort((a,b)=>(a.orig===b.orig?b.pagoYr-a.pagoYr:(a.orig==='Fora do cartão'?-1:1)));
  return {saved,est,hasAny,totInformado,assets};
}
function rIrpf(){
  const yrs=irpfYears();
  if(!irpfYear||!yrs.includes(irpfYear))irpfYear=yrs[0]||S.settings.base.slice(0,4);
  const yr=irpfYear,ir=S.extras.irpf||{},data=irpfYearData(yr),ded=irpfHealthEdu(yr,!!ir.includeProjHealth),pat=irpfBalancesAndAssets(yr);
  const ufInfo=ITCMD_UFS[ir.uf||'SP']||ITCMD_UFS.SP;
  const customTeto=ir.itcmdTeto!==''&&ir.itcmdTeto!=null?+ir.itcmdTeto:null;
  const tetoEfetivo=customTeto!=null&&!isNaN(customTeto)?customTeto:ufInfo.teto;
  const valRef=data.tot.pixVal>0?data.tot.pixVal:(ir.useCalcIfNoPix!==false?data.tot.pedroCalc:0);
  const overItcmd=ir.modo==='doacao'&&(tetoEfetivo<=0?valRef>0:valRef>tetoEfetivo);
  const pctItcmd=tetoEfetivo>0?Math.round(valRef/tetoEfetivo*100):0;
  const txt=irpfStatementText(yr,data);
  const diffPix=data.tot.pixVal-data.tot.pedroCalc;
  const natLab={saude:'Saúde (Dedutível)',educacao:'Educação (Dedutível)',farmacia:'Farmácia (Não dedutível)'};

  const dedTable=(list,emptyMsg)=>list.length?`<div class="tw" style="max-height:42vh"><table>
    <thead><tr><th class="l">Mês</th><th class="l">Data</th><th class="l">Descrição</th><th class="l">Origem</th><th class="l">Tipo IRPF</th><th class="l">Titular no app</th><th>Valor</th><th class="l">CPF Dedutível</th></tr></thead>
    <tbody>${list.map(i=>`<tr>
      <td class="l">${lab(i.ym)}</td>
      <td class="l">${fmtDateBR(i.data)}</td>
      <td class="l"><b>${esc(i.desc.slice(0,42))}</b></td>
      <td class="l"><span class="pill-orig">${esc(i.orig)}</span></td>
      <td class="l"><span class="tag" style="background:${i.nat==='farmacia'?'#f1f3f5':i.nat==='saude'?'#e3f4e8':'#e3f1f3'};color:${i.nat==='farmacia'?'#495057':i.nat==='saude'?'#1e6b2e':'#0e6b7c'}">${natLab[i.nat]}</span></td>
      <td class="l"><span class="tag t-${i.quemOrig}">${i.quemOrig}</span></td>
      <td><b>${num(i.valor)}</b></td>
      <td class="l"><select data-irpf-benef="${esc(i.keyId)}">
        <option value="Cristian" ${i.benef==='Cristian'?'selected':''}>CPF Cristian</option>
        <option value="Pedro" ${i.benef==='Pedro'?'selected':''}>CPF Pedro</option>
        <option value="Definir" ${i.benef==='Definir'?'selected':''}>⚠ Definir CPF</option>
        <option value="NaoDedutivel" ${i.benef==='NaoDedutivel'?'selected':''}>Não dedutível</option>
      </select></td>
    </tr>`).join('')}</tbody>
  </table></div>`:`<div class="note">${emptyMsg}</div>`;

  return `<div class="panel">
    <div class="bar" style="justify-content:space-between;margin-bottom:10px">
      <div class="bar" style="margin:0">
        <label class="note" style="display:inline-flex;align-items:center;gap:6px"><b>Ano-calendário:</b>
          <select id="irpf-ano">${yrs.map(y=>`<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('')}</select>
        </label>
        <span class="note">Decred (≥ R$ 5 mil/mês) &amp; e-Financeira — ${yr}</span>
      </div>
      <div class="bar no-print" style="margin:0">
        <button class="b g" data-act="export-irpf">📊 Exportar Dossiê (.xlsx)</button>
        <button class="b" data-act="print-irpf">🖨️ Imprimir / PDF</button>
      </div>
    </div>
    <div class="cards" style="margin-bottom:0">
      <div class="card"><small>Gastos no CPF Cristian (${yr})</small><b>${brl(data.tot.cristianCPF)}</b><small class="sub">Cartão: ${brl(data.tot.cardTotal)} · Fora: ${brl(data.tot.offTotal)}${data.tot.nDecred?` · <b>${data.tot.nDecred}m Decred ≥5k</b>`:''}</small></div>
      <div class="card"><small>Parte calculada do Pedro (${yr})</small><b>${brl(data.tot.pedroCalc)}</b><small class="sub">Indiv.: ${brl(data.tot.pedroInd)} + 50% Conj.: ${brl(data.tot.conj50)}</small></div>
      <div class="card ${data.tot.pixVal>0?'c-pos':'c-warn'}"><small>Transferido por Pedro (Pix)</small><b>${brl(data.tot.pixVal)}</b><small class="sub">${data.tot.nPix}/12 meses · Dif.: <b class="${diffPix<0?'neg':'pos'}">${diffPix>=0?'+':''}${brl(diffPix)}</b></small></div>
      <div class="card"><small>Deduções Saúde + Educação (${yr})</small><b style="font-size:15px">C: ${brl(ded.cTot)} · P: ${brl(ded.pTot)}</b><small class="sub">${ded.pendCount?`<span class="neg">${ded.pendCount} item(ns) sem CPF</span>`:'Recibos separados por CPF ✓'}</small></div>
    </div>
  </div>

  <div class="sec-lbl">Configuração Fiscal &amp; Texto para Declaração</div>
  <div class="row">
    <div class="panel" style="flex:1.15;min-width:300px">
      <h2>1. Classificação Fiscal &amp; Dados (Reembolso vs Doação)</h2>
      <div class="grid2" style="grid-template-columns:155px 1fr;margin-bottom:10px">
        <label>Nome do declarante</label><input data-irpf="cristianNome" value="${esc(ir.cristianNome||'Cristian')}">
        <label>Nome completo do Pedro</label><input data-irpf="pedroNome" value="${esc(ir.pedroNome||'Pedro')}" placeholder="Nome completo">
        <label>CPF do Pedro</label><input data-irpf="pedroCpf" value="${esc(ir.pedroCpf||'')}" placeholder="000.000.000-00">
        <label>Enquadramento fiscal</label>
        <select data-irpf="modo">
          <option value="reembolso" ${ir.modo!=='doacao'?'selected':''}>Reembolso / Rateio de Despesas (Recomendado)</option>
          <option value="doacao" ${ir.modo==='doacao'?'selected':''}>Doação em espécie (com alerta ITCMD)</option>
        </select>
        ${ir.modo==='doacao'?`<label>Estado (UF) p/ ITCMD</label>
        <select data-irpf="uf">${Object.entries(ITCMD_UFS).map(([k,v])=>`<option value="${k}" ${(ir.uf||'SP')===k?'selected':''}>${v.nome}</option>`).join('')}</select>
        <label>Teto isenção manual (R$)</label>
        <input type="number" step="0.01" data-irpf="itcmdTeto" value="${ir.itcmdTeto??''}" placeholder="${ufInfo.teto?ufInfo.teto:'0 (sem isenção)'}">`:''}
      </div>
      <div style="margin-bottom:10px;display:flex;gap:12px;flex-wrap:wrap">
        <label class="note" style="display:inline-flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" data-irpf="includeOffInCristian" ${ir.includeOffInCristian!==false?'checked':''}> Incluir contas fora do cartão em "CPF Cristian"</label>
        <label class="note" style="display:inline-flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" data-irpf="useCalcIfNoPix" ${ir.useCalcIfNoPix!==false?'checked':''}> Simular texto pelo rateio se sem Pix</label>
      </div>
      ${ir.modo!=='doacao'?`<div class="info-ok">
        <b>✓ Recomendado: Reembolso / Rateio de Despesas Comuns</b><br>
        <small>Ressarcimento de faturas e contas compartilhadas não gera acréscimo patrimonial nem fato gerador de <b>ITCMD estadual</b>.</small>
      </div>`:`<div class="${overItcmd?'danger-box':'warn'}">
        <b>${overItcmd?'⚠️ ALERTA DE ITCMD ESTADUAL':'ℹ️ Monitoramento de ITCMD Estadual'} — ${esc(ufInfo.nome)} (${ufInfo.aliq})</b><br>
        <small>${esc(ufInfo.regra)}. Acumulado: <b>${brl(valRef)}</b> ${tetoEfetivo>0?`vs teto de <b>${brl(tetoEfetivo)}</b> (<b>${pctItcmd}%</b>).`:'— <b>sem isenção geral neste estado!</b>'}
        ${overItcmd?'<br><b>Atenção:</b> acima do limite estadual pode incidir ITCMD; avalie usar <b>Reembolso / Rateio</b>.':''}</small>
      </div>`}
    </div>

    <div class="panel" style="flex:0.95;min-width:290px">
      <div class="bar" style="justify-content:space-between;margin-bottom:8px">
        <h2 style="margin:0">3. Texto Pronto p/ IRPF</h2>
        <button class="b no-print" id="btn-copy-irpf" data-act="copy-irpf">📋 Copiar texto</button>
      </div>
      <div class="note" style="margin-bottom:8px">Ficha: <b>${ir.modo==='doacao'?'Rendimentos Isentos → Código 14 (Doações)':'Rendimentos Isentos / Info. Complementares'}</b></div>
      ${data.tot.pixVal===0&&data.tot.pedroCalc>0?`<div class="note" style="color:#b4440c;margin-bottom:8px">ℹ️ Sem Pix registrado em ${yr}; usando ${ir.useCalcIfNoPix!==false?'o rateio calculado':'R$ 0,00'}.</div>`:''}
      <textarea id="irpf-txt" class="irpf-copy" readonly style="min-height:140px">${esc(txt)}</textarea>
    </div>
  </div>

  <div class="sec-lbl">Conciliação Mensal (${yr})</div>
  <div class="panel">
    <div class="bar" style="justify-content:space-between">
      <div>
        <h2 style="margin:0">2. Tabela de Conciliação Mensal Pronta para Declaração (${yr})</h2>
        <div class="note" style="margin:2px 0 0">Clique em <b>+ Pix / ✎ Editar</b> em qualquer mês para informar Data, Valor e Código E2E.</div>
      </div>
    </div>
    <div class="tw"><table>
      <thead><tr>
        <th class="l">Mês</th>
        <th>Fatura/Contas CPF Cristian</th>
        <th>Desp. Indiv. Pedro</th>
        <th>50% Conjunto Pedro</th>
        <th class="col-p">Total Calculado Pedro</th>
        <th class="bl col-c">Transferido por Pedro (Pix)</th>
        <th class="l">Data do Pix</th>
        <th class="l">Documento / Ref</th>
        <th class="no-print"></th>
      </tr></thead>
      <tbody>
        ${data.rows.map(r=>`<tr>
          <td class="l"><a href="#" data-mes="${r.ym}"><b>${lab(r.ym)}</b></a> <small class="note">(${r.isFrozen?'🔒 fechado':r.isReal?'real':'proj.'})</small></td>
          <td>${cellN(r.cristianCPF)}</td>
          <td>${cellN(r.pedroInd)}</td>
          <td>${cellN(r.conj50)}</td>
          <td class="col-p">${cellN(r.pedroCalc)}</td>
          <td class="bl col-c">${r.pixVal?`<b>${num(r.pixVal)}</b>`:(r.acOk?'<span class="note">ok (s/ valor)</span>':'<span class="z">–</span>')}</td>
          <td class="l">${r.pix?.data?fmtDateBR(r.pix.data):'<span class="z">–</span>'}</td>
          <td class="l"><small>${esc([r.pix?.codigo,r.pix?.obs].filter(Boolean).join(' · ')||'–')}</small></td>
          <td class="no-print"><button class="b g" data-act="edit-pix" data-ym="${r.ym}" data-calc="${r.pedroCalc.toFixed(2)}" data-card="${(r.pedroInd+r.conj50).toFixed(2)}" data-off="0" style="padding:3px 9px;font-size:11.5px">${r.pix?'✎ Editar':'+ Pix'}</button></td>
        </tr>`).join('')}
        <tr class="tot">
          <td class="l">TOTAL ${yr}</td>
          <td>${num(data.tot.cristianCPF)}</td>
          <td>${num(data.tot.pedroInd)}</td>
          <td>${num(data.tot.conj50)}</td>
          <td>${num(data.tot.pedroCalc)}</td>
          <td class="bl">${num(data.tot.pixVal)}</td>
          <td class="l">${data.tot.nPix}/12 meses</td>
          <td class="l">–</td>
          <td class="no-print"></td>
        </tr>
      </tbody>
    </table></div>
  </div>

  <div class="sec-lbl">Deduções por CPF &amp; Bens em 31/12/${yr}</div>
  <div class="panel">
    <div class="bar" style="justify-content:space-between">
      <div>
        <h2 style="margin:0">4. Deduções de Saúde e Educação Separadas por CPF (${yr})</h2>
        <div class="note" style="margin:2px 0 0">Lance em cada declaração apenas recibos/NFs no respectivo CPF (farmácias avulsas não são dedutíveis).</div>
      </div>
      <label class="note no-print" style="display:inline-flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" data-irpf="includeProjHealth" ${ir.includeProjHealth?'checked':''}> Incluir meses projetados (${yr})</label>
    </div>
    <div class="cards">
      <div class="card"><small>🔵 Dedutível — CPF Cristian</small><b>${brl(ded.cTot)}</b><small class="sub">Saúde: ${brl(ded.cSaude)} · Educação: ${brl(ded.cEdu)}</small></div>
      <div class="card" style="border-top-color:#d9480f"><small>🟠 Dedutível — CPF Pedro</small><b>${brl(ded.pTot)}</b><small class="sub">Saúde: ${brl(ded.pSaude)} · Educação: ${brl(ded.pEdu)}</small></div>
      <div class="card ${ded.pendCount?'c-warn':'c-pos'}"><small>🟢 Conjunto pendente de CPF</small><b>${brl(ded.pend)}</b><small class="sub">${ded.pendCount} item(ns) para escolher CPF da NF</small></div>
      <div class="card"><small>💊 Farmácia / Não dedutível</small><b>${brl(ded.naoDed)}</b><small class="sub">Listados para controle, fora da dedução</small></div>
    </div>
    ${dedTable(ded.items,`Nenhuma despesa de Saúde ou Educação identificada em ${yr}. Classifique lançamentos com categoria "Saúde" ou "Educação" para vê-los aqui.`)}
  </div>

  <div class="panel">
    <div class="bar" style="justify-content:space-between">
      <div>
        <h2 style="margin:0">5. Saldos em 31/12/${yr} &amp; Bens / Financiamentos no Ano (Bens e Direitos)</h2>
        <div class="note" style="margin:2px 0 0">Informe os saldos dos extratos em 31/12/${yr} (Grupo 06 / 99) e confira os bens/parcelamentos no ano.</div>
      </div>
      ${pat.est.fgtsC!=null?`<button class="b g no-print" data-act="fill-est-saldos" style="font-size:12px">⚡ Preencher FGTS estimados (${lab(yr+'-12')})</button>`:''}
    </div>
    <div class="irpf-saldo-grid">
      <div class="irpf-saldo-box">
        <label>🔵 Conta / Poupança 31/12 — Cristian (R$)</label>
        <input type="number" step="0.01" data-irpf-saldo="contaC" value="${pat.saved.contaC??''}" placeholder="Informe o extrato 31/12/${yr}">
        ${pat.est.contaCasal!=null?`<div class="note">Saldo projetado do casal em dez/${yr.slice(2)}: <b>${brl(pat.est.contaCasal)}</b></div>`:''}
      </div>
      <div class="irpf-saldo-box">
        <label>🟠 Conta / Poupança 31/12 — Pedro (R$)</label>
        <input type="number" step="0.01" data-irpf-saldo="contaP" value="${pat.saved.contaP??''}" placeholder="Informe o extrato 31/12/${yr}">
        <div class="note">Use o Informe de Rendimentos bancário de 31/12/${yr}.</div>
      </div>
      <div class="irpf-saldo-box">
        <label>🏦 FGTS em 31/12 — Cristian (R$)</label>
        <input type="number" step="0.01" data-irpf-saldo="fgtsC" value="${pat.saved.fgtsC??''}" placeholder="${pat.est.fgtsC!=null?pat.est.fgtsC.toFixed(2):'Saldo FGTS'}">
        ${pat.est.fgtsC!=null?`<div class="note">Estimativa no Fluxo (31/12): <b>${brl(pat.est.fgtsC)}</b></div>`:'<div class="note">Consulte o extrato analítico no app FGTS.</div>'}
      </div>
      <div class="irpf-saldo-box">
        <label>🏦 FGTS em 31/12 — Pedro (R$)</label>
        <input type="number" step="0.01" data-irpf-saldo="fgtsP" value="${pat.saved.fgtsP??''}" placeholder="${pat.est.fgtsP!=null?pat.est.fgtsP.toFixed(2):'Saldo FGTS'}">
        ${pat.est.fgtsP!=null?`<div class="note">Estimativa no Fluxo (31/12): <b>${brl(pat.est.fgtsP)}</b></div>`:'<div class="note">Consulte o extrato analítico no app FGTS.</div>'}
      </div>
      <div class="irpf-saldo-box">
        <label>📈 Reserva / Investimentos 31/12 (${yr})</label>
        <input type="number" step="0.01" data-irpf-saldo="invCasal" value="${pat.saved.invCasal??''}" placeholder="${pat.est.invCasal!=null?pat.est.invCasal.toFixed(2):'Aplicações 31/12'}">
        <div class="note">${pat.est.invCasal!=null?`Estimativa planos em 31/12: <b>${brl(pat.est.invCasal)}</b>`:'CDB, Tesouro, Fundos, Ações em 31/12.'} ${pat.hasAny?`· <b>Total informado: ${brl(pat.totInformado)}</b>`:''}</div>
      </div>
    </div>
    <h3 style="margin:12px 0 8px;font-size:13.5px;color:var(--petrol-dark)">Bens, Financiamentos e Parcelamentos relevantes em ${yr} (${pat.assets.length})</h3>
    ${pat.assets.length?`<div class="tw" style="max-height:38vh"><table>
      <thead><tr><th class="l">Bem / Obrigação</th><th class="l">Origem</th><th class="l">Categoria</th><th class="l">Titular</th><th>Meses em ${yr}</th><th>Total Pago em ${yr}</th><th class="l">Situação em 31/12/${yr}</th></tr></thead>
      <tbody>${pat.assets.map(a=>`<tr>
        <td class="l"><b>${esc(a.nome)}</b></td>
        <td class="l"><span class="pill-orig">${esc(a.orig)}</span></td>
        <td class="l">${esc(a.cat)}</td>
        <td class="l"><span class="tag t-${a.quem}">${a.quem}${a.quem==='Conjunto'?' (50/50)':''}</span></td>
        <td>${a.mesesYr}/12</td>
        <td><b>${num(a.pagoYr)}</b></td>
        <td class="l"><span class="${a.isQuit?'pos':''}">${esc(a.status)}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>`:`<div class="note">Nenhum financiamento, veículo, imóvel ou parcelamento de longo prazo (≥ 3x) encontrado em ${yr}.</div>`}
  </div>`;
}
function exportIrpfXlsx(yr){
  const data=irpfYearData(yr),ded=irpfHealthEdu(yr,!!S.extras.irpf?.includeProjHealth),pat=irpfBalancesAndAssets(yr),wb=XLSX.utils.book_new();
  const rd=v=>typeof v==='number'?+v.toFixed(2):v;
  const rows=[
    ['Mês','Status','Fatura/Contas CPF Cristian','Desp. Indiv. Pedro','50% Conjunto Pedro','Total Calculado Pedro','Transferido por Pedro (Pix)','Data do Pix','Documento / Ref'],
    ...data.rows.map(r=>[lab(r.ym),r.isFrozen?'Fechado 🔒':r.isReal?'Real':'Projeção',rd(r.cristianCPF),rd(r.pedroInd),rd(r.conj50),rd(r.pedroCalc),rd(r.pixVal),r.pix?.data?fmtDateBR(r.pix.data):'',[r.pix?.codigo,r.pix?.obs].filter(Boolean).join(' · ')]),
    ['TOTAL '+yr,'',rd(data.tot.cristianCPF),rd(data.tot.pedroInd),rd(data.tot.conj50),rd(data.tot.pedroCalc),rd(data.tot.pixVal),data.tot.nPix+'/12 meses','']
  ];
  rows.push([],['Texto sugerido para IRPF:',irpfStatementText(yr,data)]);
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Conciliacao_IRPF_'+yr);
  const dRows=[
    ['Mês','Data','Descrição','Origem','Categoria','Tipo IRPF','Titular no app','Valor','CPF Dedutível'],
    ...ded.items.map(i=>[lab(i.ym),fmtDateBR(i.data),i.desc,i.orig,i.cat,i.nat,i.quemOrig,rd(i.valor),i.benef])
  ];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(dRows),'Saude_Educacao_'+yr);
  const nv=k=>pat.saved[k]!==''&&pat.saved[k]!=null?rd(+pat.saved[k]):'';
  const sRows=[
    ['Item em 31/12/'+yr,'Valor Informado (Extrato Oficial)','Estimativa no Fluxo'],
    ['Conta / Poupança — Cristian',nv('contaC'),pat.est.contaCasal!=null?'(Casal total: '+rd(pat.est.contaCasal)+')':''],
    ['Conta / Poupança — Pedro',nv('contaP'),''],
    ['FGTS — Cristian',nv('fgtsC'),pat.est.fgtsC!=null?rd(pat.est.fgtsC):''],
    ['FGTS — Pedro',nv('fgtsP'),pat.est.fgtsP!=null?rd(pat.est.fgtsP):''],
    ['Reserva / Investimentos',nv('invCasal'),pat.est.invCasal!=null?rd(pat.est.invCasal):''],
    ['TOTAL INFORMADO EM 31/12/'+yr,rd(pat.totInformado),'']
  ];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sRows),'Saldos_31_12_'+yr);
  const bRows=[
    ['Bem / Obrigação','Origem','Categoria','Titular','Meses no ano','Total Pago em '+yr,'Situação em 31/12/'+yr],
    ...pat.assets.map(a=>[a.nome,a.orig,a.cat,a.quem,a.mesesYr,rd(a.pagoYr),a.status])
  ];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(bRows),'Bens_Parcelamentos_'+yr);
  XLSX.writeFile(wb,`dossie-irpf-${yr}.xlsx`);
}
function rPrem(){
  const s=S.settings,snaps=loadSnaps(),fd=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  return `<div class="sec-lbl">Guia &amp; Parâmetros do Portal</div>
  <div class="row">
    <div class="panel" style="flex:1;min-width:290px">
      <h2>Ajuda, Guia de Uso &amp; Celular</h2>
      <div class="note" style="margin-bottom:10px">Explica a <b>Regra de Ouro (100% Individual × 50/50 Conjunto)</b>, a rotina mensal em 4 passos, mapa de abas e instalação no celular.</div>
      <div class="bar" style="margin:0">
        <button class="b" type="button" data-act="open-guide">📖 Abrir Guia Rápido &amp; Celular</button>
        <button class="b g" type="button" data-act="reset-welcome">Reexibir boas-vindas</button>
      </div>
    </div>
    <div class="panel" style="flex:1;min-width:290px">
      <h2>Premissas gerais</h2>
      <div class="grid2" style="margin-bottom:8px">
        <label>Mês da fatura atual (base)</label><input type="month" data-s="base" value="${s.base}">
        <label>Meses projetados no Cartão</label><input type="number" data-s="horizon" value="${s.horizon}" min="1" max="36">
      </div>
      <div class="note">Fluxo, Geral e Mensal projetam até <b>dezembro do ano seguinte ao mês base</b> (${lab(nextYearDec())}), ajustável no seletor "Projetar até".</div>
    </div>
  </div>
  <div class="sec-lbl">Backups &amp; Pontos de Restauração</div>
  <div class="panel"><h2>Dados e backups</h2><div class="bar">
   <button class="b g" data-act="export-json">Exportar backup (.json)</button>
   <label class="b g">Importar backup<input type="file" accept=".json" id="impj" hidden></label>
   <button class="b" data-act="add-snap">+ Criar ponto de restauração</button>
   <button class="b r" data-act="reset">Restaurar dados originais</button></div>
   <div class="note">Os dados ficam sincronizados no Supabase e salvos localmente neste navegador.</div></div>
  <div class="panel"><h2>Pontos de restauração automáticos (últimos 5)</h2>
   <div class="note">Criados automaticamente antes de importar faturas, importar backups ou restaurar dados.</div>
   ${snaps.length?`<div class="tw" style="margin-top:8px"><table><tr><th class="l">Data/Hora</th><th class="l">Motivo</th><th class="l">Por</th><th>Lançamentos</th><th>Fora do cartão</th><th></th></tr>
   ${snaps.map(sn=>`<tr data-snap="${sn.id}"><td class="l">${fd(sn.at)}</td><td class="l"><b>${esc(sn.motivo)}</b></td><td class="l">${esc(sn.by||'Local')}</td><td>${sn.txCount}</td><td>${sn.offCount}</td>
   <td><button class="b g" data-act="restore-snap">Restaurar</button> <button class="b r" data-act="del-snap" title="Excluir ponto">×</button></td></tr>`).join('')}</table></div>`:'<div class="note" style="margin-top:8px">Nenhum ponto de restauração salvo ainda.</div>'}</div>
  <details class="acc">
    <summary><span>⌨️ Atalhos de teclado</span><span class="note">Alt+N · Alt+T · Esc</span></summary>
    <div class="acc-body">
      <div class="note">• <code>Alt + N</code>: Abrir modal de novo lançamento rápido (Cartão, Fora do cartão ou Estimativa futura)<br>• <code>Alt + T</code>: Alternar entre modo claro e modo escuro<br>• <code>Esc</code>: Fechar modal rápido, menu ou limpar seleção em lote</div>
    </div>
  </details>`;
}
const pctBox=()=>`<span class="note"><b>Regra de divisão:</b> Despesas individuais (Cristian ou Pedro, incl. QuintoAndar do Pedro) = <b>100% individuais</b> · Despesas Conjuntas (Aluguel, Carro e itens Conjunto) = <b>50% / 50% (meio a meio)</b></span>`;

const saveRender=()=>{save();setTimeout(render,0)};
function bind(m){
  m.querySelectorAll('tr[data-id] [data-f]').forEach(el=>el.addEventListener('change',()=>{
    const id=+el.closest('tr').dataset.id,list=el.closest('tr').dataset.list?S.extras[el.closest('tr').dataset.list]:tab==='lanc'||tab==='imp'?S.tx:S.off,o=list.find(x=>x.id===id),f=el.dataset.f;
    o[f]=el.type==='checkbox'?el.checked:el.type==='number'?(+el.value||0):(el.value||(f==='fim'?null:''));
    if(list===S.off&&['np','inicio'].includes(f)&&o.np)o.fim=addM(o.inicio,o.np-1);
    if(f==='tipo'&&o.tipo==='parcelada'&&!o.tot){o.cur=1;o.tot=2}
    if(list===S.tx&&!o.rev&&['tipo','quem','cat','fim'].includes(f))remember(o,f)
    saveRender();
  }));
  m.querySelectorAll('tr[data-vid] [data-vf]').forEach(el=>el.addEventListener('change',()=>{
    const id=+el.closest('tr').dataset.vid,v=(S.settings.varItems||[]).find(x=>x.id===id),f=el.dataset.vf;
    if(!v)return;
    v[f]=el.type==='checkbox'?el.checked:el.type==='number'?(+el.value||0):(el.value||(f==='fim'?null:''));
    if(f==='valor'&&v.valor>0){v.ativo=true;S.settings.includeVar=true}
    saveRender();
  }));
  m.querySelectorAll('[data-sel]').forEach(el=>el.addEventListener('change',()=>{
    const id=+el.dataset.sel;el.checked?SEL.add(id):SEL.delete(id);render();
  }));
  const sa=m.querySelector('#sel-all-tx');
  if(sa)sa.addEventListener('change',()=>{
    m.querySelectorAll('[data-sel]').forEach(el=>{const id=+el.dataset.sel;sa.checked?SEL.add(id):SEL.delete(id)});
    render();
  });
  const bq=m.querySelector('#bquem');
  if(bq)bq.addEventListener('change',()=>{
    if(!bq.value)return;
    S.tx.forEach(x=>{if(SEL.has(x.id)){x.quem=bq.value;if(!x.rev)remember(x,'quem')}});
    saveRender();
  });
  const bt=m.querySelector('#btipo');
  if(bt)bt.addEventListener('change',()=>{
    if(!bt.value)return;
    S.tx.forEach(x=>{if(SEL.has(x.id)){x.tipo=bt.value;if(x.tipo==='parcelada'&&!x.tot){x.cur=1;x.tot=2}if(!x.rev)remember(x,'tipo')}});
    saveRender();
  });
  m.querySelectorAll('tr[data-rule] [data-rf]').forEach(el=>el.addEventListener('change',()=>{
    const k=el.closest('tr').dataset.rule,r=S.rules[k],f=el.dataset.rf;
    if(!r)return;
    r[f]=el.value||(f==='fim'?null:'');
    S.tx.forEach(y=>{if(y.rev&&key(y.desc)===k)applyRule(y,r,f==='quem')});
    saveRender();
  }));
  m.querySelectorAll('[data-paid]').forEach(el=>el.addEventListener('change',()=>{
    const ym=el.dataset.ym||S.settings.base,k=el.dataset.paid;
    if(k==='acerto'&&el.checked){openPixModal(ym,+el.dataset.calc||0,+el.dataset.card||0,+el.dataset.off||0);return}
    setPaid(ym,k,el.checked);
    if(k==='acerto'&&S.extras.closedMonths?.[ym])S.extras.closedMonths[ym].acertoOk=el.checked;
    const lbl=k==='fatura'?'Fatura do cartão':k==='acerto'?'Acerto mensal':(S.off.find(o=>String(o.id)===String(k))?.nome||'Conta #'+k);
    logAudit(el.checked?'Pagamento marcado':'Pagamento desmarcado',`${lbl} (${lab(ym)})`);
    saveRender();
  }));
  m.querySelectorAll('[data-pixcfg]').forEach(el=>el.addEventListener('change',()=>{
    S.extras.pixConfig=S.extras.pixConfig||{chave:'',titular:'Cristian',cidade:'SAO PAULO'};
    S.extras.pixConfig[el.dataset.pixcfg]=el.value.trim();saveRender();
  }));
  m.querySelectorAll('.proj-card[data-proj-id] [data-pf]').forEach(el=>el.addEventListener('change',()=>{
    const pid=+el.closest('.proj-card').dataset.projId,p=(S.extras.projetos||[]).find(x=>x.id===pid),f=el.dataset.pf;
    if(!p)return;
    p[f]=el.type==='checkbox'?el.checked:el.type==='number'?(+el.value||0):el.value;
    saveRender();
  }));
  m.querySelectorAll('[data-irpf]').forEach(el=>el.addEventListener('change',()=>{
    const f=el.dataset.irpf;S.extras.irpf=S.extras.irpf||{};
    S.extras.irpf[f]=el.type==='checkbox'?el.checked:el.value;saveRender();
  }));
  m.querySelectorAll('[data-irpf-benef]').forEach(el=>el.addEventListener('change',()=>{
    S.extras.irpfBenef=S.extras.irpfBenef||{};S.extras.irpfBenef[el.dataset.irpfBenef]=el.value;saveRender();
  }));
  m.querySelectorAll('[data-irpf-saldo]').forEach(el=>el.addEventListener('change',()=>{
    const yr=irpfYear||S.settings.base.slice(0,4),k=el.dataset.irpfSaldo;
    S.extras.irpf=S.extras.irpf||{};S.extras.irpf.saldosAno=S.extras.irpf.saldosAno||{};
    S.extras.irpf.saldosAno[yr]=S.extras.irpf.saldosAno[yr]||{};
    S.extras.irpf.saldosAno[yr][k]=el.value===''?'':(+el.value||0);
    saveRender();
  }));
  const ia=m.querySelector('#irpf-ano');if(ia)ia.addEventListener('change',()=>{irpfYear=ia.value;render()});
  m.querySelectorAll('[data-s]').forEach(el=>el.addEventListener('change',()=>{
    const f=el.dataset.s;S.settings[f]=el.type==='checkbox'?el.checked:(el.type==='number'?+el.value:el.value);saveRender();
  }));
  m.querySelectorAll('[data-fg]').forEach(el=>el.addEventListener('change',()=>{const[q,f]=el.dataset.fg.split('.');S.settings.fgts[q][f]=+el.value||0;saveRender()}));
  m.querySelectorAll('[data-meta]').forEach(el=>el.addEventListener('change',()=>{const v=+el.value||0;v?S.extras.metas[el.dataset.meta]=v:delete S.extras.metas[el.dataset.meta];saveRender()}));
  m.querySelectorAll('[data-res]').forEach(el=>el.addEventListener('change',()=>{S.extras.reserva[el.dataset.res]=+el.value||0;saveRender()}));
  m.querySelectorAll('[data-cen]').forEach(el=>el.addEventListener('change',()=>{const f=el.dataset.cen;S.extras.cen[f]=el.type==='number'?(+el.value||0):el.value;saveRender()}));
  m.querySelectorAll('[data-amort]').forEach(el=>el.addEventListener('change',()=>{
    const f=el.dataset.amort;S.extras.amort=S.extras.amort||{};
    S.extras.amort[f]=el.type==='number'?(+el.value||0):el.value;saveRender();
  }));
  const aos=m.querySelector('#amort-off-sel');
  if(aos)aos.addEventListener('change',()=>{
    S.extras.amort=S.extras.amort||{};S.extras.amort.offId=aos.value;
    const o=S.off.find(x=>String(x.id)===String(aos.value));
    if(o){
      const base=S.settings.base,pmt=+offV(o,base).toFixed(2);
      const rem=o.fim&&o.fim>=base?(diffM(base,o.fim)+1):(o.np?Math.max(1,o.np-Math.max(0,diffM(o.inicio,base))):36);
      const r=(+S.extras.amort.jurosMes||0.85)/100;
      const pv=r>0?pmt*(1-Math.pow(1+r,-rem))/r:pmt*rem;
      S.extras.amort.nome=o.nome;S.extras.amort.pmt=pmt;S.extras.amort.meses=rem;S.extras.amort.saldo=Math.round(pv);
    }
    saveRender();
  });
  m.querySelectorAll('[data-fire]').forEach(el=>el.addEventListener('change',()=>{
    const f=el.dataset.fire;S.extras.fire=S.extras.fire||{};
    if(el.type==='checkbox')S.extras.fire[f]=el.checked;
    else if(el.value===''&&['patrimonioAtual','gastoMensal','aporteMensal'].includes(f))S.extras.fire[f]='';
    else S.extras.fire[f]=el.type==='number'?(+el.value||0):el.value;
    saveRender();
  }));
  m.querySelectorAll('[data-si]').forEach(el=>el.addEventListener('change',()=>{S.settings.saldoIni[el.dataset.si]=+el.value;saveRender()}));
  m.querySelectorAll('[data-act]').forEach(el=>el.addEventListener('click',()=>act(el)));
  const bindF=(id,k,ev)=>{const e=m.querySelector(id);if(e)e.addEventListener(ev,()=>{F[k]=e.value;render()})};
  bindF('#ftxt','txt','input');bindF('#fquem','quem','change');bindF('#ftipo','tipo','change');bindF('#ffat','fat','change');bindF('#fhf','hf','change');bindF('#fom','om','change');bindF('#fmm','mm','change');bindF('#frtxt','rtxt','input');
  const fr=m.querySelector('#frev');if(fr)fr.addEventListener('change',()=>{F.rev=fr.checked;render()});
  const ifat=m.querySelector('#imfat');if(ifat)ifat.addEventListener('change',()=>{IMP.fatura=ifat.value;markDups(IMP);render()});
  const iof=m.querySelector('#imof');if(iof)iof.addEventListener('change',()=>{IMP.oficial=iof.value});
  const ix=m.querySelector('#impx');if(ix)ix.addEventListener('change',()=>parseFatura(ix.files[0]));
  const dz=m.querySelector('#dropzone');
  if(dz){
    dz.addEventListener('dragover',ev=>{ev.preventDefault();dz.classList.add('drag')});
    dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
    dz.addEventListener('drop',ev=>{ev.preventDefault();dz.classList.remove('drag');if(ev.dataTransfer?.files?.[0])parseFatura(ev.dataTransfer.files[0])});
  }
  const ib=m.querySelector('#imp-bank');if(ib)ib.addEventListener('change',()=>parseExtrato(ib.files[0]));
  const bdz=m.querySelector('#bank-dropzone');
  if(bdz){
    bdz.addEventListener('dragover',ev=>{ev.preventDefault();bdz.classList.add('drag')});
    bdz.addEventListener('dragleave',()=>bdz.classList.remove('drag'));
    bdz.addEventListener('drop',ev=>{ev.preventDefault();bdz.classList.remove('drag');if(ev.dataTransfer?.files?.[0])parseExtrato(ev.dataTransfer.files[0])});
  }
  const bdq=m.querySelector('#bank-def-quem');
  if(bdq)bdq.addEventListener('change',()=>{
    bankDefQuem=bdq.value;
    if(IMP_BANK)IMP_BANK.rows.forEach(r=>{if(!S.rules[key(r.desc)])r.quem=bankDefQuem});
    render();
  });
  m.querySelectorAll('.bank-row[data-bi] [data-bf]').forEach(el=>el.addEventListener('change',()=>{
    if(!IMP_BANK)return;
    const idx=+el.closest('.bank-row').dataset.bi,row=IMP_BANK.rows.find(x=>x.idx===idx),f=el.dataset.bf;
    if(!row)return;
    row[f]=el.type==='checkbox'?el.checked:el.value;
    if(f==='kind'&&row.kind==='receita')row.cat='Renda';
    render();
  }));
  const ba=m.querySelector('#bank-all');
  if(ba)ba.addEventListener('change',()=>{
    if(!IMP_BANK)return;
    IMP_BANK.rows.forEach(r=>{if(!r.dup)r.importar=ba.checked});
    render();
  });
  const ia1=m.querySelector('#infl-a'),ib1=m.querySelector('#infl-b');
  if(ia1)ia1.addEventListener('change',()=>{inflBaseYr=ia1.value;render()});
  if(ib1)ib1.addEventListener('change',()=>{inflCompYr=ib1.value;render()});
  const at=m.querySelector('#audit-txt');if(at)at.addEventListener('input',()=>{auditFilter=at.value;render()});
  const aw=m.querySelector('#audit-who');if(aw)aw.addEventListener('change',()=>{auditWho=aw.value;render()});
  const rdet=m.querySelector('#rdet');if(rdet)rdet.addEventListener('toggle',()=>{rulesOpen=rdet.open});
  const cpm=m.querySelector('#chk-past-m');if(cpm)cpm.addEventListener('change',()=>{showPastMatrix=cpm.checked;render()});
  m.querySelectorAll('[data-mes]').forEach(el=>el.addEventListener('click',ev=>{ev.preventDefault();MS=el.dataset.mes;tab='mes';render()}));
  const ms=m.querySelector('#msel');if(ms)ms.addEventListener('change',()=>{MS=ms.value;render()});
  const cr=m.querySelector('#cenreset');if(cr)cr.addEventListener('click',()=>{S.extras.cen={moradiaPct:0,rendaPct:0,varPct:0,extra:0,extraDe:'',quitarId:'',quitarMes:''};save();render()});
  const ij=m.querySelector('#impj');if(ij)ij.addEventListener('change',()=>ij.files[0].text().then(t=>{saveSnap('Antes de importar backup JSON');S=mig(JSON.parse(t));save();render()}));
}
function copyClip(text,btn,okMsg){
  const done=()=>{if(btn){const prev=btn.textContent;btn.textContent=okMsg;setTimeout(()=>{if(document.body.contains(btn))btn.textContent=prev},2000)}};
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(done).catch(()=>{
    const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(e){}document.body.removeChild(ta);done();
  });
  else{
    const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(e){}document.body.removeChild(ta);done();
  }
}
function act(el){
  const a=el.dataset.act,id=+(el.closest('tr')?.dataset.id||0),vid=+(el.closest('tr')?.dataset.vid||0),snapId=+(el.closest('tr')?.dataset.snap||0);
  if(a==='open-guide'){openGuideModal();return}
  if(a==='dismiss-welcome'){localStorage.setItem('pf-onboard-seen','1');render();return}
  if(a==='reset-welcome'){localStorage.removeItem('pf-onboard-seen');tab='geral';SEL.clear();render();return}
  if(a==='gmode'){geralMode=el.dataset.mode||'linhas';render();return}
  if(a==='cenmode'){cenMode=el.dataset.mode||'cen';render();return}
  if(a==='histmode'){histMode=el.dataset.mode||'faturas';render();return}
  if(a==='amort-use-fgts'){S.extras.amort=S.extras.amort||{};S.extras.amort.aporteExtra=+el.dataset.val||0;save();render();return}
  if(a==='fire-fill'){
    const def=fireDefaults();S.extras.fire=S.extras.fire||{};
    S.extras.fire.gastoMensal=def.custoVida;
    S.extras.fire.aporteMensal=def.aporteCap;
    S.extras.fire.patrimonioAtual=Math.round(def.patrLiq+(S.extras.fire.incluirFgts!==false?def.fgtsHoje:0));
    save();render();return;
  }
  if(a==='bank-import-confirm'){if(!confirmBankImport())return;save();render();return}
  if(a==='bank-import-cancel'){IMP_BANK=null;render();return}
  if(a==='clear-audit'){if(!confirm('Limpar todo o histórico de auditoria?'))return;S.extras.auditLog=[];save();render();return}
  if(a==='tog-varq'){const q=el.dataset.q;openVarQ.has(q)?openVarQ.delete(q):openVarQ.add(q);render();return}
  if(a==='tog-mesdet'){const ym=el.dataset.ym;openMesDet.has(ym)?openMesDet.delete(ym):openMesDet.add(ym);render();return}
  if(a==='edit-pix'){openPixModal(el.dataset.ym,+el.dataset.calc||0,+el.dataset.card||0,+el.dataset.off||0);return}
  if(a==='quick-pay'){
    const ym=el.dataset.ym||todayYM(),oid=el.dataset.id,o=S.off.find(x=>String(x.id)===String(oid));
    setPaid(ym,oid,true);
    logAudit('Conta paga',`${o?o.nome:'Conta #'+oid} (${lab(ym)})`);
    save();render();return;
  }
  if(a==='freeze-month'){freezeMonth(el.dataset.ym||MS||S.settings.base);save();render();return}
  if(a==='unfreeze-month'){if(!unfreezeMonth(el.dataset.ym||MS||S.settings.base))return;save();render();return}
  if(a==='tog-pix-cfg'){pixCfgOpen=!pixCfgOpen;render();return}
  if(a==='tog-wa-preview'){waPreviewOpen=!waPreviewOpen;render();return}
  if(a==='copy-wa'){const ta=document.getElementById('wa-txt');if(ta)copyClip(ta.value,el,'✓ Mensagem copiada!');return}
  if(a==='copy-pix-key'){const k=S.extras.pixConfig?.chave;if(!k)return alert('Configure sua Chave Pix primeiro.');copyClip(k,el,'✓ Chave copiada!');return}
  if(a==='copy-pix-emv'){
    const cfg=S.extras.pixConfig||{},payload=buildPixPayload({...cfg,valor:+el.dataset.val||0,txid:'PF'+(el.dataset.ym||'').replace('-','')});
    if(!payload)return alert('Configure sua Chave Pix primeiro.');
    copyClip(payload,el,'✓ Pix Copia e Cola copiado!');return;
  }
  if(a==='fill-est-saldos'){
    const yr=irpfYear||S.settings.base.slice(0,4),pat=irpfBalancesAndAssets(yr);
    S.extras.irpf=S.extras.irpf||{};S.extras.irpf.saldosAno=S.extras.irpf.saldosAno||{};
    const row=S.extras.irpf.saldosAno[yr]=S.extras.irpf.saldosAno[yr]||{};
    if(pat.est.fgtsC!=null)row.fgtsC=+pat.est.fgtsC.toFixed(2);
    if(pat.est.fgtsP!=null)row.fgtsP=+pat.est.fgtsP.toFixed(2);
    if(pat.est.invCasal!=null&&(row.invCasal===''||row.invCasal==null))row.invCasal=+pat.est.invCasal.toFixed(2);
    save();render();return;
  }
  if(a==='copy-irpf'){
    const ta=document.getElementById('irpf-txt');if(!ta)return;
    copyClip(ta.value,document.getElementById('btn-copy-irpf')||el,'✓ Texto copiado!');
    return;
  }
  if(a==='export-irpf'){exportIrpfXlsx(irpfYear||S.settings.base.slice(0,4));return}
  if(a==='print-irpf'){window.print();return}
  if(a==='add-proj'){
    const tipo=el.dataset.tipo||'outro',b=S.settings.base;
    const defs={
      imovel:{nome:'Compra de Imóvel',quem:'Conjunto',meta:120000,valorBem:500000,saldoAtual:0,aporteMensal:2500,rend:0.8,usarFgts:true,fgtsQuem:'Conjunto',fgtsUso:0},
      carro:{nome:'Troca / Compra de Carro',quem:'Conjunto',meta:40000,valorBem:95000,saldoAtual:0,aporteMensal:1200,rend:0.8,usarFgts:false,fgtsQuem:'Conjunto',fgtsUso:0},
      viagem:{nome:'Viagem / Férias',quem:'Conjunto',meta:15000,valorBem:0,saldoAtual:0,aporteMensal:800,rend:0.8,usarFgts:false,fgtsQuem:'Conjunto',fgtsUso:0},
      outro:{nome:'Novo Projeto',quem:'Conjunto',meta:20000,valorBem:0,saldoAtual:0,aporteMensal:500,rend:0.8,usarFgts:false,fgtsQuem:'Conjunto',fgtsUso:0}
    };
    const obj=defs[tipo]||defs.outro;
    S.extras.projetos=S.extras.projetos||[];
    S.extras.projetos.push({id:Date.now(),tipo,ativo:true,inicio:b,mesAlvo:'',...obj});
    logAudit('Projeto criado',`${obj.nome} (Meta ${brl(obj.meta)})`);
  }
  else if(a==='del-proj'){
    const pid=+el.closest('.proj-card')?.dataset.projId,exP=(S.extras.projetos||[]).find(x=>x.id===pid);
    if(!confirm('Excluir este Projeto de Vida?'))return;
    S.extras.projetos=(S.extras.projetos||[]).filter(x=>x.id!==pid);
    logAudit('Projeto excluído',exP?.nome||'Projeto');
  }
  else if(a==='del-tx'){S.tx=S.tx.filter(x=>x.id!==id);SEL.delete(id)}
  else if(a==='del-off'){S.off=S.off.filter(x=>x.id!==id)}
  else if(a==='del-rule'){delete S.rules[el.closest('tr').dataset.rule]}
  else if(a==='add-vitem'){
    S.settings.varItems=S.settings.varItems||[];
    S.settings.includeVar=true;
    S.settings.varItems.push({id:Date.now(),ativo:true,nome:el.dataset.nome||'Nova estimativa',quem:currentUser==='Pedro'?'Pedro':currentUser==='Cristian'?'Cristian':'Conjunto',cat:el.dataset.cat||'Outros',valor:0,inicio:addM(S.settings.base,1),fim:null});
  }
  else if(a==='del-vitem'){S.settings.varItems=(S.settings.varItems||[]).filter(v=>v.id!==vid)}
  else if(a==='batch-cat'){const c=document.getElementById('bcat')?.value.trim();if(!c)return;S.tx.forEach(x=>{if(SEL.has(x.id)){x.cat=c;if(!x.rev)remember(x,'cat')}})}
  else if(a==='batch-ok'){const cnt=SEL.size;S.tx.forEach(x=>{if(SEL.has(x.id)){x.rev=false;remember(x)}});SEL.clear();logAudit('Validação em lote',`Validou ${cnt} lançamento(s) selecionado(s)`)}
  else if(a==='batch-del'){if(!confirm(`Excluir ${SEL.size} lançamento(s) selecionado(s)?`))return;S.tx=S.tx.filter(x=>!SEL.has(x.id));SEL.clear()}
  else if(a==='batch-clear'){SEL.clear();render();return}
  else if(a==='add-tx'){S.tx.push({id:Date.now(),data:new Date().toISOString().slice(0,10),desc:'Novo lançamento',cur:null,tot:null,valor:0,tipo:'variavel',cat:'Sem categoria',quem:'Cristian',cartao:'',fim:null,ativo:true,fatura:S.settings.base,rev:false})}
  else if(a==='add-x'){const l=el.dataset.list,b=S.settings.base,def={inv:{nome:'Novo investimento',quem:'Conjunto',valor:0,saldo:0,rend:0.8,inicio:b,fim:null},saques:{quem:'Cristian',mes:b,valor:0,destino:'caixa',nome:'Saque FGTS'},compras:{nome:'Nova compra',quem:'Conjunto',mes:b,valor:0,np:1}}[l];S.extras[l].push({id:Date.now(),...def})}
  else if(a==='del-x'){const l=el.closest('tr').dataset.list;S.extras[l]=S.extras[l].filter(x=>x.id!==id)}
  else if(a==='add-cat'){const n=prompt('Nome da nova categoria:');if(!n)return;S.off.push({id:Date.now(),nome:'Novo item',quem:'Conjunto',kind:'despesa',valor:0,inicio:S.settings.base,fim:null,cat:n.trim(),freq:'mensal'})}
  else if(a==='add-off'){const d=el.dataset;S.off.push({id:Date.now(),nome:d.nome||'Novo item',quem:d.quem||'Conjunto',kind:d.kind||'despesa',valor:0,inicio:S.settings.base,fim:null,cat:d.cat||'',freq:d.freq||'mensal'})}
  else if(a==='imp-merge'){if(!confirmImport('merge'))return}
  else if(a==='imp-replace'){if(!confirmImport('replace'))return}
  else if(a==='imp-cancel'){IMP=null}
  else if(a==='ok-tx'){const o=S.tx.find(x=>x.id===id);o.rev=false;SEL.delete(id);remember(o);logAudit('Lançamento validado',`${o.desc} (${brl(o.valor)} · ${o.quem} · ${o.cat})`)}
  else if(a==='ok-all'){const pends=S.tx.filter(x=>x.rev);pends.forEach(x=>{x.rev=false;SEL.delete(x.id);remember(x)});logAudit('Validação em massa',`Confirmou ${pends.length} lançamento(s) pendente(s)`)}
  else if(a==='add-snap'){const m=prompt('Descrição do ponto de restauração:','Ponto manual');if(!m)return;saveSnap(m);render();return}
  else if(a==='restore-snap'){if(!restoreSnap(snapId))return}
  else if(a==='del-snap'){delSnap(snapId);render();return}
  else if(a==='reset'){if(!confirm('Apagar suas edições e restaurar os dados originais?'))return;saveSnap('Antes de restaurar dados originais');S=mig(structuredClone(window.SEED||EMPTY))}
  else if(a==='export-json'){download('planejamento-backup.json',JSON.stringify(S,null,1),'application/json');return}
  else if(a==='export-xlsx'){exportXlsx();return}
  save();render();
}
function download(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click()}
function exportXlsx(){
  const R=series().filter(r=>r.ym>=S.settings.base),M=buildItemMatrix(R),wb=XLSX.utils.book_new();
  const rd=v=>typeof v==='number'?+v.toFixed(2):v;
  const rows=[['Item / Linha','Grupo','Origem',...M.Ms.map(lab),'Total Período']];
  rows.push(['--- 1. RECEITAS ---','','',...M.Ms.map(()=>''),'']);
  M.incItems.forEach(it=>rows.push([it.nome,it.quem,it.orig,...it.vals.map(rd),rd(it.tot)]));
  rows.push(['= SOMA RECEITAS (A)','','Subtotal',...R.map(r=>rd(r.renda)),rd(R.reduce((a,r)=>a+r.renda,0))]);
  [['Cristian','2. INDIVIDUAIS CRISTIAN (100%)','B1'],['Pedro','3. INDIVIDUAIS PEDRO (100%)','B2'],['Conjunto','4. CONJUNTAS (DIVIDIDAS 50/50)','C']].forEach(([q,tit,cd])=>{
    rows.push([`--- ${tit} ---`,'','',...M.Ms.map(()=>''),'']);
    M.groups[q].forEach(it=>rows.push([it.nome,q,it.orig,...it.vals.map(rd),rd(it.tot)]));
    const vt=M.varTotByQ[q],vs=vt.reduce((a,b)=>a+b,0);
    if(vs>0)rows.push([`Compras variáveis da fatura (${M.varSub[q].length} itens)`,q,'Cartão · Variável',...vt.map(rd),rd(vs)]);
    rows.push([`= SOMA ${tit} (${cd})`,q,'Subtotal',...R.map(r=>rd(r.byQ[q])),rd(R.reduce((a,r)=>a+r.byQ[q],0))]);
  });
  rows.push(['↳ 50% CONJUNTO PARA CADA UM (C ÷ 2)','50/50','Metade p/ cada',...R.map(r=>rd(r.byQ.Conjunto*0.5)),rd(R.reduce((a,r)=>a+r.byQ.Conjunto*0.5,0))]);
  rows.push(['--- 5. FECHAMENTO MENSAL ---','','',...M.Ms.map(()=>''),'']);
  rows.push(['= TOTAL CRISTIAN PAGA (B1 + 50% Conj.)','Cristian','Fechamento',...R.map(r=>rd(r.byQ.Cristian+r.byQ.Conjunto*0.5)),rd(R.reduce((a,r)=>a+r.byQ.Cristian+r.byQ.Conjunto*0.5,0))]);
  rows.push(['= TOTAL PEDRO PAGA (B2 + 50% Conj.)','Pedro','Fechamento',...R.map(r=>rd(r.byQ.Pedro+r.byQ.Conjunto*0.5)),rd(R.reduce((a,r)=>a+r.byQ.Pedro+r.byQ.Conjunto*0.5,0))]);
  rows.push(['= TOTAL GERAL DE DESPESAS','Casal','Fechamento',...R.map(r=>rd(r.total)),rd(R.reduce((a,r)=>a+r.total,0))]);
  rows.push(['= SOBRA / FALTA DO MÊS','Casal','Fechamento',...R.map(r=>rd(r.sobra)),rd(R.reduce((a,r)=>a+r.sobra,0))]);
  rows.push(['= SALDO ACUMULADO EM CONTA','Casal','Fechamento',...R.map(r=>rd(r.saldo||0)),rd(R[R.length-1]?.saldo||0)]);
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Linhas que se somam');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Mês','Renda','Cartão Cristian','Fora Cristian','= Indiv. Cristian','Cartão Pedro','Fora Pedro','= Indiv. Pedro','Cartão Conjunto','Fora Conjunto','= Conjuntas (100%)','50% Conjunto (cada)','= Cristian paga','= Pedro paga','= Total Despesas','Sobra/Falta','Saldo Acumulado'],
   ...R.map(r=>[r.ym,r.renda,r.cardByQ.Cristian,r.offByQ.Cristian,r.byQ.Cristian,r.cardByQ.Pedro,r.offByQ.Pedro,r.byQ.Pedro,r.cardByQ.Conjunto,r.offByQ.Conjunto,r.byQ.Conjunto,r.byQ.Conjunto*0.5,r.byQ.Cristian+r.byQ.Conjunto*0.5,r.byQ.Pedro+r.byQ.Conjunto*0.5,r.total,r.sobra,r.saldo].map(rd))]),'Resumo por Mês');
  XLSX.writeFile(wb,'projecao-financeira.xlsx');
}

const TPMAP={variavel:'variavel','compra parcelada':'parcelada','assinatura mensal':'assinatura_mensal','assinatura anual':'assinatura_anual','despesa mensal':'fixa','despesa fixa':'fixa'};
const ym2=(y,m)=>y+'-'+String(m).padStart(2,'0');
const MESES={janeiro:1,fevereiro:2,'março':3,marco:3,abril:4,maio:5,junho:6,julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12};
const pDate=d=>{if(d instanceof Date)return new Date(d.getTime()+43200000).toISOString().slice(0,10);const m=typeof d==='string'&&d.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:null};
const pVal=v=>typeof v==='number'?v:typeof v==='string'&&v.trim()?parseFloat(v.replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.')):NaN;
const capital=s=>{s=String(s||'').trim().toLowerCase();return s?s[0].toUpperCase()+s.slice(1):'Sem categoria'};

function learn(d,list){
  const c={},ex={};
  list.forEach(x=>{const k=key(x.desc);if(!k)return;ex[k]=x.desc;const s=JSON.stringify([x.tipo,x.quem,x.cat,x.fim||null]);const m=c[k]=c[k]||{};m[s]=(m[s]||0)+1});
  Object.entries(c).forEach(([k,m])=>{const [tipo,quem,cat,fim]=JSON.parse(Object.entries(m).sort((a,b)=>b[1]-a[1])[0][0]);d.rules[k]={tipo,quem,cat,fim,exemplo:ex[k]}});
}
function applyRule(x,r,forceQuem){
  if(/quintoandar/i.test(x.desc)){x.quem='Pedro';x.cat='Moradia';x.tipo=x.tot?'parcelada':'fixa';return}
  x.tipo=x.tot?'parcelada':(r.tipo==='parcelada'?'variavel':r.tipo);
  if(forceQuem)x.quem=r.quem;
  else if(!x.portador&&x.quem==='Conjunto'&&r.quem)x.quem=r.quem;
  x.cat=r.cat;x.fim=r.fim||null;
}
function remember(o,changedField){
  const k=key(o.desc);if(!k)return;
  S.rules[k]={tipo:o.tipo,quem:o.quem,cat:o.cat,fim:o.fim||null,exemplo:o.desc};
  S.tx.forEach(y=>{if(y.rev&&y!==o&&key(y.desc)===k)applyRule(y,S.rules[k],changedField==='quem')});
}

const txSig=x=>`${x.data}|${norm(x.desc)}|${(+x.valor).toFixed(2)}|${x.cur||0}/${x.tot||0}`;
function markDups(imp){
  if(!imp)return;
  const counts={};
  S.tx.filter(x=>x.fatura===imp.fatura).forEach(x=>{const s=txSig(x);counts[s]=(counts[s]||0)+1});
  imp.tx.forEach(x=>{
    const s=txSig(x);
    if(counts[s]>0){counts[s]--;x.dup=true}else{x.dup=false}
  });
}

function parseFatura(file){
  if(!file)return;
  file.arrayBuffer().then(buf=>{
    const wb=XLSX.read(buf,{cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
    const hi=rows.findIndex(r=>r.some(c=>norm(c)==='lancamento')&&r.some(c=>norm(c)==='valor'));
    if(hi<0)return alert('Não encontrei o cabeçalho (Lançamento / Valor).');
    const col={};rows[hi].forEach((c,i)=>{if(c!=null)col[norm(c)]=i});
    const get=(r,n)=>col[n]==null?null:r[col[n]];
    let fatura=null,oficial='';
    rows.slice(0,hi).forEach((r,ri)=>r.forEach((c,ci)=>{
      const m=typeof c==='string'&&c.match(/(?:Fechada|Aberta)\s*-\s*([\p{L}]+)\/(\d{4})/iu);if(m)fatura=ym2(m[2],MESES[norm(m[1])]||1);
      if(typeof c==='string'&&/^valor \(/.test(norm(c))){const t=rows[ri+1]&&rows[ri+1][ci];if(typeof t==='number')oficial=t}
    }));
    const tx=[];
    rows.slice(hi+1).forEach(r=>{
      const data=pDate(get(r,'data')),desc=get(r,'lancamento'),v=pVal(get(r,'valor'));
      if(!data||isNaN(v)||!desc||/pagamento/i.test(desc))return;
      const nomeRaw=String(get(r,'quem')??get(r,'responsavel')??get(r,'nome')??get(r,'portador')??get(r,'titular')??get(r,'nome no cartao')??'').trim();
      const cartaoRaw=String(get(r,'numero do cartao')??get(r,'final do cartao')??get(r,'cartao')??'').trim();
      const tipoRaw=norm(get(r,'tipo de despesa')),parc=get(r,'parcelamento');
      let fTipo=TPMAP[tipoRaw]||null,fFim=null;
      const mf=tipoRaw.match(/fixa ate (\w+) de (\d{4})/);if(mf){fTipo='fixa';fFim=ym2(mf[2],MESES[mf[1]]||1)}
      const vC=pVal(get(r,'cristian')),vP=pVal(get(r,'pedro')),vCj=pVal(get(r,'conjunto'));
      let pessoa=/pedro/i.test(nomeRaw)?'Pedro':/cristian/i.test(nomeRaw)?'Cristian':/conjunto/i.test(nomeRaw)?'Conjunto':null;
      if(!pessoa){
        if(!isNaN(vC)&&vC>0&&(isNaN(vP)||vP===0))pessoa='Cristian';
        else if(!isNaN(vP)&&vP>0&&(isNaN(vC)||vC===0))pessoa='Pedro';
        else if((!isNaN(vCj)&&vCj>0)||(!isNaN(vC)&&vC>0&&!isNaN(vP)&&vP>0))pessoa='Conjunto';
      }
      const fCat=get(r,'categoria')?capital(get(r,'categoria')):null;
      const mp=parc&&String(parc).match(/(\d+)\s*de\s*(\d+)/);
      const ru=S.rules[key(desc)]||null;
      let quem=pessoa||ru?.quem||'Cristunto';
      if(quem==='Cristunto')quem='Conjunto';
      let t=fTipo||ru?.tipo||'variavel';
      if(mp)t='parcelada';else if(t==='parcelada')t='variavel';
      let cat=fCat||ru?.cat||'Sem categoria';
      if(/quintoandar/i.test(desc)){
        quem='Pedro';
        cat=fCat||'Moradia';
        if(!fTipo&&!mp)t='fixa';
      }
      const x={id:0,data,desc:String(desc).replace(/\s+/g,' ').trim(),cur:mp?+mp[1]:null,tot:mp?+mp[2]:null,valor:+v.toFixed(2),
        quem,cat,fim:fFim||(ru&&!fTipo?ru.fim:null)||null,
        portador:nomeRaw,cartao:cartaoRaw,ativo:true,rev:true,sug:!!ru||!!pessoa,tipo:t};
      tx.push(x);
    });
    if(!fatura){const mx=tx.map(x=>x.data).sort().pop();fatura=mx?mx.slice(0,7):S.settings.base}
    IMP={tx,fatura,oficial,name:file.name};markDups(IMP);tab='imp';render();
  });
}
function confirmImport(mode='merge'){
  const fat=IMP.fatura,ex=S.tx.filter(x=>x.fatura===fat);
  if(!fat)return alert('Informe o mês da fatura.');
  if(mode==='replace'&&ex.length&&!confirm(`Já existem ${ex.length} lançamentos da fatura ${fat} (${ex.filter(x=>!x.rev).length} validados). Substituir a fatura inteira por esta importação?`))return false;
  saveSnap(`Antes de importar fatura ${lab(fat)} (${mode==='replace'?'substituir':'mesclar'})`);
  if(mode==='replace'){
    S.tx=S.tx.filter(x=>x.fatura!==fat);
    IMP.tx.forEach((x,i)=>{delete x.dup;x.id=Date.now()+i;x.fatura=fat});
    S.tx.push(...IMP.tx);
  }else{
    const novos=IMP.tx.filter(x=>!x.dup);
    novos.forEach((x,i)=>{delete x.dup;x.id=Date.now()+i;x.fatura=fat});
    S.tx.push(...novos);
  }
  const allFat=S.tx.filter(x=>x.fatura===fat&&x.tipo!=='ignorar');
  const soma=+allFat.reduce((a,x)=>a+x.valor,0).toFixed(2);
  S.meta.lastImport={at:new Date().toISOString(),fatura:fat,file:IMP.name,n:IMP.tx.length,total:soma};
  if(fat>=S.settings.base){S.settings.base=fat;S.settings.faturaOficial=+IMP.oficial||soma}
  logAudit('Importação de fatura',`Fatura ${lab(fat)} (${mode==='replace'?'substituída':'mesclada'} · ${IMP.tx.length} itens · ${brl(soma)})`);
  IMP=null;return true;
}

function decodeBankBuffer(buf){
  const u8=new Uint8Array(buf);
  let txt=new TextDecoder('utf-8',{fatal:false}).decode(u8);
  if(txt.includes('\uFFFD')){try{txt=new TextDecoder('windows-1252').decode(u8)}catch(e){}}
  return txt.replace(/^\uFEFF/,'');
}
function guessBankCat(desc,kind){
  if(kind==='receita')return 'Renda';
  const d=norm(desc);
  if(/aluguel|condom|energia|cemig|enel|light|copel|sabesp|agua|\bgas\b|comgas|internet|vivo|claro|\btim\b|iptu|seguro\s*inc/.test(d))return 'Moradia';
  if(/mercado|supermerc|atacad|assai|carrefour|pao\s*de\s*acucar|extra|hortifruti|padaria/.test(d))return 'Mercado';
  if(/uber|99|posto|gasol|etanol|combust|estacion|pedagio|sem\s*parar|ipva|detran|carro|oficina/.test(d))return 'Transporte';
  if(/farmac|drogaria|droga\s*raia|drogasil|medico|hospital|unimed|bradesco\s*saude|sulamerica|plano\s*de\s*saude|laborat/.test(d))return 'Saúde';
  if(/escola|faculd|curso|educac/.test(d))return 'Educação';
  if(/ifood|ifd|restaurante|lanche|pizza|cafe|bar\b/.test(d))return 'Alimentação';
  if(/seguro/.test(d))return 'Seguros';
  return 'Outros';
}
const isCardPaymentLine=desc=>/pagamento\s+(?:de\s+|da\s+)?fatura|fatura\s+(?:do\s+)?cartao|pagto?\s+cartao|itaucard|nubank\s+fatura|aplicacao\s+autom|resgate\s+autom/i.test(norm(desc));
function normalizeBankIsoDate(s){
  const str=String(s||'').trim();
  let m=str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  m=str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if(m)return `${m[3]}-${m[2]}-${m[1]}`;
  m=str.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if(m)return `20${m[3]}-${m[2]}-${m[1]}`;
  m=str.match(/^(\d{4})(\d{2})(\d{2})/);
  if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
function pBankMoney(raw){
  if(typeof raw==='number')return raw;
  let s=String(raw||'').replace(/R\$/gi,'').replace(/\s+/g,'').trim();
  if(!s)return NaN;
  let neg=false;
  if(s.startsWith('(')&&s.endsWith(')')){neg=true;s=s.slice(1,-1)}
  if(s.endsWith('-')){neg=true;s=s.slice(0,-1)}
  if(s.startsWith('-')){neg=true;s=s.slice(1)}
  else if(s.startsWith('+'))s=s.slice(1);
  s=s.replace(/[^\d.,]/g,'');
  if(!s)return NaN;
  const lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');
  if(lc>=0&&ld>=0)s=lc>ld?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  else if(lc>=0)s=s.replace(',','.');
  const n=parseFloat(s);
  return isNaN(n)?NaN:(neg?-n:n);
}
function parseOfx(text){
  const out=[];
  const re=/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>|$))/gi;
  let m;
  const tag=(blk,nm)=>{const r=blk.match(new RegExp(`<${nm}>([^<\\r\\n]+)`,'i'));return r?r[1].trim():''};
  while((m=re.exec(text))!==null){
    const blk=m[1];
    const data=normalizeBankIsoDate(tag(blk,'DTPOSTED'));
    const amt=pBankMoney(tag(blk,'TRNAMT'));
    const rawDesc=(tag(blk,'MEMO')||tag(blk,'NAME')||tag(blk,'TRNTYPE')||'Movimentação OFX').replace(/\s+/g,' ').trim();
    const fitid=tag(blk,'FITID');
    if(!data||isNaN(amt)||amt===0)continue;
    out.push({data,desc:rawDesc,amt,fitid});
  }
  return out;
}
function splitCsvLine(line,sep){
  const res=[];let cur='',q=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}
    else if(ch===sep&&!q){res.push(cur.trim());cur=''}
    else cur+=ch;
  }
  res.push(cur.trim());
  return res;
}
function parseBankCsv(text){
  const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(!lines.length)return [];
  const sample=lines.slice(0,5).join('\n');
  const sep=(sample.match(/;/g)||[]).length>=(sample.match(/,/g)||[]).length?';':',';
  const rows=lines.map(l=>splitCsvLine(l,sep));
  let hi=rows.findIndex(r=>r.some(c=>/^(data|date|dt)$/.test(norm(c)))&&r.some(c=>/^(valor|amount|quantia|debito|credito|saldo)/.test(norm(c))||/valor/.test(norm(c))));
  let colMap={};
  if(hi>=0){
    rows[hi].forEach((c,i)=>{const k=norm(c);if(k&&colMap[k]==null)colMap[k]=i});
  }
  const findCol=names=>{for(const n of names){const found=Object.keys(colMap).find(k=>k===n||k.includes(n));if(found!=null)return colMap[found]}return -1};
  const idxData=hi>=0?findCol(['data','date','dt']):0;
  const idxDesc=hi>=0?findCol(['descricao','historico','lancamento','estabelecimento','memo','title','nome','description']):1;
  const idxVal=hi>=0?findCol(['valor','amount','quantia']):2;
  const idxCred=hi>=0?findCol(['credito','entrada']):-1;
  const idxDeb=hi>=0?findCol(['debito','saida']):-1;
  const idxId=hi>=0?findCol(['identificador','fitid','id']):-1;
  const start=hi>=0?hi+1:0;
  const out=[];
  rows.slice(start).forEach(r=>{
    const data=normalizeBankIsoDate(r[idxData]);
    if(!data)return;
    let amt=idxVal>=0?pBankMoney(r[idxVal]):NaN;
    if(isNaN(amt)&&(idxCred>=0||idxDeb>=0)){
      const cr=idxCred>=0?(pBankMoney(r[idxCred])||0):0;
      const db=idxDeb>=0?Math.abs(pBankMoney(r[idxDeb])||0):0;
      amt=cr-db;
    }
    if(isNaN(amt)||amt===0)return;
    const desc=(r[idxDesc]||'Lançamento extrato').replace(/\s+/g,' ').trim();
    const fitid=idxId>=0?String(r[idxId]||'').trim():'';
    out.push({data,desc,amt,fitid});
  });
  return out;
}
function markBankDups(imp){
  if(!imp)return;
  imp.rows.forEach(r=>{
    const dup=S.off.some(o=>{
      if(r.fitid&&o.fitid&&o.fitid===r.fitid)return true;
      return o.inicio===r.ym&&o.fim===r.ym&&Math.abs((+o.valor||0)-r.valor)<0.01&&norm(o.nome)===norm(r.desc);
    });
    r.dup=dup;
    if(dup)r.importar=false;
  });
}
function parseExtrato(file){
  if(!file)return;
  file.arrayBuffer().then(buf=>{
    const txt=decodeBankBuffer(buf),isOfx=/\.ofx$/i.test(file.name)||/<STMTTRN>/i.test(txt);
    const raw=isOfx?parseOfx(txt):parseBankCsv(txt);
    if(!raw.length)return alert('Não encontrei movimentações válidas no extrato (.ofx ou .csv com Data, Descrição e Valor).');
    const defQuem=bankDefQuem||(currentUser==='Pedro'?'Pedro':'Cristian');
    const rows=raw.map((x,idx)=>{
      const ym=x.data.slice(0,7);
      const kind=x.amt>=0?'receita':'despesa';
      const valor=+Math.abs(x.amt).toFixed(2);
      const ru=S.rules[key(x.desc)]||null;
      const skipFat=isCardPaymentLine(x.desc);
      const quem=ru?.quem||defQuem;
      const cat=kind==='receita'?'Renda':(ru?.cat||guessBankCat(x.desc,kind));
      return {idx,data:x.data,ym,desc:x.desc,valor,kind,quem,cat,fitid:x.fitid||'',skipFat,dup:false,importar:!skipFat};
    });
    IMP_BANK={name:file.name,fmt:isOfx?'OFX':'CSV',rows};
    markBankDups(IMP_BANK);
    tab='imp';render();
  });
}
function confirmBankImport(){
  if(!IMP_BANK)return 0;
  const sel=IMP_BANK.rows.filter(r=>r.importar&&!r.dup&&r.valor>0);
  if(!sel.length){alert('Selecione ao menos 1 lançamento novo (não duplicado) para importar.');return 0}
  saveSnap(`Antes de importar extrato ${IMP_BANK.name} (${sel.length} itens)`);
  const baseId=Date.now();
  sel.forEach((r,i)=>{
    S.off.push({
      id:baseId+i,
      nome:r.desc,
      quem:r.quem||'Conjunto',
      kind:r.kind||'despesa',
      valor:+r.valor.toFixed(2),
      venc:+r.data.slice(8,10)||null,
      inicio:r.ym,
      fim:r.ym,
      np:1,
      cat:r.kind==='receita'?'Renda':(r.cat||'Outros'),
      freq:'mensal',
      origem:'extrato',
      dataExata:r.data,
      fitid:r.fitid||''
    });
  });
  logAudit('Importação de extrato',`${sel.length} item(ns) de ${IMP_BANK.name} (${IMP_BANK.fmt})`);
  IMP_BANK=null;
  return sel.length;
}

function rImp(){
  const rev=S.tx.filter(x=>x.rev).sort((a,b)=>b.fatura.localeCompare(a.fatura)||b.data.localeCompare(a.data));
  const cats=[...new Set([...OCATS,...S.tx.map(x=>x.cat)])].filter(Boolean).sort();
  const allChecked=rev.length>0&&rev.every(x=>SEL.has(x.id));
  const defQuem=bankDefQuem||(currentUser==='Pedro'?'Pedro':'Cristian');
  let pre='';
  if(IMP){
    const soma=IMP.tx.filter(x=>x.tipo!=='ignorar').reduce((a,x)=>a+x.valor,0),ex=S.tx.filter(x=>x.fatura===IMP.fatura);
    const novos=IMP.tx.filter(x=>!x.dup),dups=IMP.tx.filter(x=>x.dup),valEx=ex.filter(x=>!x.rev).length;
    pre=`<div class="panel"><h2>Pré-visualização: ${esc(IMP.name)}</h2>
    <div class="grid2" style="grid-template-columns:260px 160px">
      <label>Mês da fatura</label><input type="month" id="imfat" value="${IMP.fatura}">
      <label>Total oficial da fatura (opcional)</label><input type="number" step="0.01" id="imof" value="${IMP.oficial}">
    </div>
    <p>${IMP.tx.length} lançamentos na planilha · soma ${brl(soma)} · <b>${IMP.tx.filter(x=>x.sug).length}</b> identificados automaticamente (pelo nome na fatura ou histórico) · <b>${IMP.tx.filter(x=>!x.sug).length}</b> sem histórico.</p>
    ${ex.length?`<div class="warn">A fatura <b>${lab(IMP.fatura)}</b> já possui <b>${ex.length}</b> itens no app (${valEx} já validados). Foram encontrados <b>${novos.length} novos lançamentos</b> e <b>${dups.length} já existentes</b>.</div>
    <div class="bar">
      <button class="b" data-act="imp-merge" ${!novos.length?'disabled':''}>Mesclar (+${novos.length} novos, manter existentes)</button>
      <button class="b r" data-act="imp-replace">Substituir fatura inteira (${IMP.tx.length})</button>
      <button class="b g" data-act="imp-cancel">Cancelar</button>
    </div>`:`<p class="note">Todos entram <b>pendentes de validação</b> para revisão manual antes de somarem nos cálculos.</p>
    <div class="bar"><button class="b" data-act="imp-replace">Confirmar importação (${IMP.tx.length} itens)</button><button class="b g" data-act="imp-cancel">Cancelar</button></div>`}
    </div>`;
  }
  let bankPre='';
  if(IMP_BANK){
    const rows=IMP_BANK.rows,sel=rows.filter(r=>r.importar&&!r.dup),dups=rows.filter(r=>r.dup),skips=rows.filter(r=>r.skipFat);
    const sumDesp=sel.filter(r=>r.kind==='despesa').reduce((a,r)=>a+r.valor,0),sumRec=sel.filter(r=>r.kind==='receita').reduce((a,r)=>a+r.valor,0);
    const allBk=rows.filter(r=>!r.dup).length>0&&rows.filter(r=>!r.dup).every(r=>r.importar);
    bankPre=`<div class="panel">
      <div class="bar" style="justify-content:space-between">
        <div>
          <h2 style="margin:0">🏦 Pré-visualização do Extrato (${IMP_BANK.fmt}): ${esc(IMP_BANK.name)}</h2>
          <div class="note">${rows.length} linha(s) lida(s) · <b>${sel.length}</b> marcada(s) (Saídas: <b class="neg">${brl(sumDesp)}</b> · Entradas: <b class="pos">${brl(sumRec)}</b>)${dups.length?` · ${dups.length} duplicado(s)`:''}${skips.length?` · ${skips.length} pgto de fatura ignorado(s)`:''}</div>
        </div>
        <div class="bar" style="margin:0">
          <button class="b" id="btn-bank-confirm" data-act="bank-import-confirm" ${!sel.length?'disabled':''}>✓ Importar selecionados (${sel.length})</button>
          <button class="b g" data-act="bank-import-cancel">Cancelar</button>
        </div>
      </div>
      <div class="tw" style="max-height:48vh"><table>
        <thead><tr>
          <th class="l"><label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" id="bank-all" ${allBk?'checked':''}> Imp.</label></th>
          <th class="l">Data</th><th class="l">Descrição (Extrato / Pix)</th><th class="l">Tipo</th><th class="l">Quem</th><th class="l">Categoria</th><th>Valor</th><th class="l">Obs.</th>
        </tr></thead>
        <tbody>
          ${rows.map(r=>`<tr class="bank-row" data-bi="${r.idx}" style="${r.dup||!r.importar?'opacity:.55':''}">
            <td class="l"><input type="checkbox" data-bf="importar" ${r.importar?'checked':''} ${r.dup?'disabled':''}></td>
            <td class="l">${fmtDateBR(r.data)}</td>
            <td class="l"><input class="d" data-bf="desc" value="${esc(r.desc)}"></td>
            <td class="l"><select data-bf="kind"><option value="despesa" ${r.kind==='despesa'?'selected':''}>Despesa (Saída)</option><option value="receita" ${r.kind==='receita'?'selected':''}>Receita (Entrada)</option></select></td>
            <td class="l"><select data-bf="quem">${quemOpts(r.quem)}</select></td>
            <td class="l"><input list="cats" data-bf="cat" value="${esc(r.cat)}"></td>
            <td class="${r.kind==='receita'?'pos':'neg'}"><b>${r.kind==='receita'?'+':'-'}${num(r.valor)}</b></td>
            <td class="l">${r.dup?'<span class="due-badge due-later">Duplicado</span>':r.skipFat?'<span class="due-badge due-soon">Pgto fatura (evita 2x)</span>':'<span class="due-badge due-ok">Novo</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <div class="note" style="margin-top:8px">Itens importados entram pontualmente apenas no respectivo mês (em <b>Fora do cartão</b> e <b>Visão mensal</b>) e ficam disponíveis no cálculo de <b>Burn-rate</b>, <b>Dossiê IRPF</b> e <b>Inflação Pessoal</b>.</div>
    </div>`;
  }
  const rulesList=Object.entries(S.rules).filter(([k,r])=>!F.rtxt||k.includes(norm(F.rtxt))||norm(r.exemplo||'').includes(norm(F.rtxt))||norm(r.cat||'').includes(norm(F.rtxt))).sort((a,b)=>(a[1].exemplo||a[0]).localeCompare(b[1].exemplo||b[0]));
  return `<div class="sec-lbl">Passo 1 — Importar Arquivos</div>
  <div class="row">
    <div class="panel" id="dropzone" style="flex:1;min-width:290px">
      <h2>1. Fatura do Cartão Itaú (.xlsx)</h2>
      <div class="note" style="margin-bottom:10px">Lê portador, parcelas e sugere categorias com <b>${Object.keys(S.rules).length}</b> regras memorizadas.</div>
      <div class="bar" style="margin:0"><label class="b">Escolher arquivo (.xlsx)<input type="file" accept=".xlsx,.xls" id="impx" hidden></label><span class="note">ou solte aqui</span></div>
    </div>
    <div class="panel" style="flex:1;min-width:290px">
      <h2>1B. Extrato Bancário / Pix (.ofx / .csv)</h2>
      <div class="note" style="margin-bottom:10px">Itaú, Nubank ou Inter — ignora pagamentos de fatura para não duplicar.</div>
      <div id="bank-dropzone" class="bank-drop">
        <div class="bar" style="margin:0;justify-content:space-between">
          <div class="bar" style="margin:0">
            <label class="b">Escolher extrato (.ofx / .csv)<input type="file" accept=".ofx,.csv,.txt" id="imp-bank" hidden></label>
            <span class="note">ou solte aqui</span>
          </div>
          <label class="note" style="display:inline-flex;align-items:center;gap:6px">Titular:
            <select id="bank-def-quem">${quemOpts(defQuem)}</select>
          </label>
        </div>
      </div>
    </div>
  </div>
  ${pre}
  ${bankPre}
  <div class="sec-lbl">Passo 2 — Revisar &amp; Regras</div>
  <div class="panel"><h2>2. Revisar lançamentos pendentes (${rev.length})</h2>
  ${rev.length?`<div class="bar"><button class="b" data-act="ok-all">Confirmar todos (${rev.length} validados)</button><span class="note">Selecione vários itens para alterar Quem/Tipo/Categoria ou validar em lote.</span></div>`:'<div class="note">Nada pendente. Tudo validado.</div>'}
  <datalist id="cats">${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</datalist>
  ${batchBar(rev,true)}
  ${rev.length?`<div class="tw"><table><tr><th class="l"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="sel-all-tx" ${allChecked?'checked':''} title="Selecionar todos pendentes"> Descrição (Portador na fatura)</label></th><th class="l">Fatura</th><th class="l">Data</th><th>Parcela</th><th>Valor</th><th class="l">Quem</th><th class="l">Tipo</th><th class="l">Categoria</th><th class="l">Até (mês)</th><th></th></tr>
  ${rev.map(x=>`<tr data-id="${x.id}"><td class="l"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" data-sel="${x.id}" ${SEL.has(x.id)?'checked':''}><span>${esc(x.desc)}${cardBadge(x)}</span></label></td><td class="l">${lab(x.fatura)}</td><td class="l">${x.data.slice(8)}/${x.data.slice(5,7)}</td><td>${x.tot?x.cur+'/'+x.tot:''}</td><td>${num(x.valor)}</td>
   <td class="l"><select data-f="quem">${quemOpts(x.quem)}</select></td>
   <td class="l"><select data-f="tipo">${opts(TIPOS,x.tipo)}</select></td>
   <td class="l"><input list="cats" data-f="cat" value="${esc(x.cat)}"></td>
   <td class="l">${['fixa','assinatura_mensal','assinatura_anual'].includes(x.tipo)?`<input type="month" data-f="fim" value="${x.fim||''}">`:''}</td>
   <td><button class="b" data-act="ok-tx" title="Confirmar">✓</button></td></tr>`).join('')}</table></div>`:''}</div>
  <details class="acc" id="rdet" ${rulesOpen?'open':''}>
    <summary><span>⚙️ 3. Regras de estabelecimentos memorizados (${Object.keys(S.rules).length})</span></summary>
    <div class="acc-body">
      <div class="note">Prefixos de maquininhas/apps (IFD*, UBER*, MP*, PAG*) são limpos automaticamente. Edite ou exclua qualquer regra abaixo.</div>
      <div class="bar"><input id="frtxt" placeholder="Buscar estabelecimento ou categoria" value="${esc(F.rtxt)}" style="width:260px"><span class="note">${rulesList.length} regra(s) exibida(s)</span></div>
      <div class="tw" style="max-height:45vh"><table><tr><th class="l">Chave</th><th class="l">Exemplo de descrição</th><th class="l">Tipo padrão</th><th class="l">Categoria</th><th class="l">Quem (se s/ portador)</th><th class="l">Até (mês)</th><th></th></tr>
      ${rulesList.map(([k,r])=>`<tr data-rule="${esc(k)}"><td class="l"><code>${esc(k)}</code></td><td class="l">${esc(r.exemplo||k)}</td>
       <td class="l"><select data-rf="tipo">${opts(TIPOS,r.tipo)}</select></td>
       <td class="l"><input list="cats" data-rf="cat" value="${esc(r.cat||'')}"></td>
       <td class="l"><select data-rf="quem">${quemOpts(r.quem)}</select></td>
       <td class="l">${['fixa','assinatura_mensal','assinatura_anual'].includes(r.tipo)?`<input type="month" data-rf="fim" value="${r.fim||''}">`:''}</td>
       <td><button class="b r" data-act="del-rule" title="Excluir regra">×</button></td></tr>`).join('')}
      </table></div>
    </div>
  </details>`;
}

const histFats=()=>[...new Set([...S.tx.map(x=>x.fatura),...Object.keys(S.extras.closedMonths||{})])].filter(Boolean).sort();
function histSplit(f){
  const fr=S.extras.closedMonths?.[f];
  if(fr)return {Cristian:fr.card.Cristian||0,Pedro:fr.card.Pedro||0,Conjunto:fr.card.Conjunto||0,total:fr.card.total||0,payC:fr.card.payC||0,payP:fr.card.payP||0,frozen:true};
  return split(f);
}
function histNav(){
  const nAud=(S.extras.auditLog||[]).length;
  return `<div class="bar" style="justify-content:space-between;margin-bottom:12px">
    <div class="seg-bar">
      <button data-act="histmode" data-mode="faturas" class="${histMode==='faturas'?'on':''}">🧾 Faturas & Categorias</button>
      <button data-act="histmode" data-mode="inflacao" class="${histMode==='inflacao'?'on':''}">📈 Inflação Pessoal & Anos</button>
      <button data-act="histmode" data-mode="auditoria" class="${histMode==='auditoria'?'on':''}">🛡️ Auditoria (${nAud})</button>
    </div>
    <span class="note">Eixo do Passado: histórico oficial, variação de custo de vida e trilha de alterações.</span>
  </div>`;
}
function histYearsList(){
  const set=new Set([S.settings.base.slice(0,4)]);
  S.tx.forEach(x=>{if(x.fatura)set.add(x.fatura.slice(0,4))});
  S.off.forEach(o=>{if(o.inicio)set.add(o.inicio.slice(0,4));if(o.fim)set.add(o.fim.slice(0,4))});
  Object.keys(S.extras.closedMonths||{}).forEach(ym=>set.add(ym.slice(0,4)));
  allMonths().forEach(ym=>set.add(ym.slice(0,4)));
  return [...set].filter(Boolean).sort();
}
function yearCategoryStats(yr){
  const base=S.settings.base,cats={};
  let total=0,activeMonths=0,activeDays=0;
  for(let m=1;m<=12;m++){
    const ym=`${yr}-${String(m).padStart(2,'0')}`;
    const fr=S.extras.closedMonths?.[ym];
    let mTot=0;
    const addCat=(cat,val)=>{
      if(!val)return;
      const c=cat||'Outros';
      cats[c]=(cats[c]||0)+val;
      mTot+=val;
    };
    if(fr){
      (fr.items?.card||[]).forEach(x=>addCat(x.cat||'Sem categoria',x.valor*weight(x.quem)));
      (fr.items?.off||[]).filter(o=>o.kind!=='receita').forEach(o=>addCat(o.cat||'Outros',o.valor*weight(o.quem)));
    }else{
      const cList=ym<=base?S.tx.filter(x=>x.fatura===ym&&live(x)):monthItems(ym,false);
      cList.forEach(x=>addCat(x.cat||'Sem categoria',x.valor*weight(x.quem)));
      S.off.filter(o=>o.kind!=='receita'&&offActive(o,ym)).forEach(o=>addCat(o.cat||'Outros',offV(o,ym)*weight(o.quem)));
    }
    if(mTot>0){total+=mTot;activeMonths++;activeDays+=daysInMonth(ym)}
  }
  const effM=Math.max(1,activeMonths),effD=Math.max(1,activeDays);
  return {yr,cats,total,activeMonths,activeDays,avgMonth:total/effM,avgDay:total/effD};
}
function calcPersonalInflation(yrA,yrB){
  const A=yearCategoryStats(yrA),B=yearCategoryStats(yrB);
  const effA=Math.max(1,A.activeMonths),effB=Math.max(1,B.activeMonths);
  const allCats=[...new Set([...Object.keys(A.cats),...Object.keys(B.cats)])];
  const rows=allCats.map(c=>{
    const totA=A.cats[c]||0,totB=B.cats[c]||0,avgA=totA/effA,avgB=totB/effB,diff=avgB-avgA;
    const pct=avgA>0?((avgB-avgA)/avgA*100):(avgB>0?100:0);
    return {cat:c,totA,totB,avgA,avgB,diff,pct};
  }).filter(r=>r.totA>0||r.totB>0).sort((a,b)=>Math.max(b.avgA,b.avgB)-Math.max(a.avgA,a.avgB));
  const topRise=[...rows].filter(r=>r.diff>0).sort((a,b)=>b.diff-a.diff)[0]||null;
  const topDrop=[...rows].filter(r=>r.diff<0).sort((a,b)=>a.diff-b.diff)[0]||null;
  const inflPct=A.avgDay>0?((B.avgDay-A.avgDay)/A.avgDay*100):0;
  return {A,B,rows,topRise,topDrop,inflPct};
}
function rInflacao(){
  const yrs=histYearsList(),curY=S.settings.base.slice(0,4);
  if(!inflBaseYr||!yrs.includes(inflBaseYr))inflBaseYr=yrs.includes(String(+curY-1))?String(+curY-1):(yrs[0]||curY);
  if(!inflCompYr||!yrs.includes(inflCompYr))inflCompYr=yrs.includes(curY)?curY:(yrs[yrs.length-1]||curY);
  const d=calcPersonalInflation(inflBaseYr,inflCompYr);
  const pctBadge=v=>`${v>=0?'+':''}${v.toFixed(1)}%`;
  const vLab={casal:'Casal',cristian:'Cristian',pedro:'Pedro',conjunto:'Conjunto'}[view];
  return `${histNav()}
  <div class="panel">
    <div class="bar" style="justify-content:space-between;margin-bottom:8px">
      <div>
        <h2 style="margin:0">📈 Termômetro de Inflação Pessoal & Comparativo Anual (${vLab})</h2>
        <div class="note" style="margin:2px 0 0">Compara o custo médio mensal e diário por categoria entre dois anos (considerando meses com lançamentos/projeção e fechamentos congelados 🔒).</div>
      </div>
      <div class="bar" style="margin:0">
        <label class="note">Ano base: <select id="infl-a">${yrs.map(y=>`<option value="${y}" ${y===inflBaseYr?'selected':''}>${y}</option>`).join('')}</select></label>
        <span class="note">vs</span>
        <label class="note">Ano comparado: <select id="infl-b">${yrs.map(y=>`<option value="${y}" ${y===inflCompYr?'selected':''}>${y}</option>`).join('')}</select></label>
      </div>
    </div>
    <div class="cards" style="margin-bottom:0">
      <div class="card"><small>Custo médio por dia (${inflBaseYr} → ${inflCompYr})</small><b>${brl(d.B.avgDay)}/dia</b><small class="sub">Em ${inflBaseYr}: ${brl(d.A.avgDay)}/dia · <b class="${d.inflPct>0?'neg':'pos'}">${pctBadge(d.inflPct)}</b></small></div>
      <div class="card"><small>Média mensal (${inflCompYr} vs ${inflBaseYr})</small><b>${brl(d.B.avgMonth)}/mês</b><small class="sub">${inflBaseYr} (${d.A.activeMonths}m): ${brl(d.A.avgMonth)} · ${inflCompYr} (${d.B.activeMonths}m)</small></div>
      <div class="card ${d.topRise?'c-neg':''}"><small>Maior alta mensal</small><b style="font-size:15px">${d.topRise?esc(d.topRise.cat):'Nenhuma alta'}</b><small class="sub">${d.topRise?`<span class="neg">+${brl(d.topRise.diff)}/mês (${pctBadge(d.topRise.pct)})</span>`:'–'}</small></div>
      <div class="card c-pos"><small>Maior queda / alívio</small><b style="font-size:15px">${d.topDrop?esc(d.topDrop.cat):'Nenhuma queda'}</b><small class="sub">${d.topDrop?`<span class="pos">${brl(d.topDrop.diff)}/mês (${pctBadge(d.topDrop.pct)})</span>`:'–'}</small></div>
    </div>
  </div>
  <div class="panel"><h2>Top 10 Categorias: Média Mensal (${inflBaseYr} × ${inflCompYr})</h2><canvas id="c-infl" height="105"></canvas></div>
  <div class="panel"><h2>Comparativo Detalhado por Categoria</h2>
    <div class="tw"><table>
      <thead><tr><th class="l">Categoria</th><th>Total ${inflBaseYr} (${d.A.activeMonths}m)</th><th>Média/mês ${inflBaseYr}</th><th>Total ${inflCompYr} (${d.B.activeMonths}m)</th><th>Média/mês ${inflCompYr}</th><th>Dif. Média/mês</th><th>Variação (%)</th></tr></thead>
      <tbody>
        ${d.rows.map(r=>`<tr>
          <td class="l"><b>${esc(r.cat)}</b></td>
          <td>${num(r.totA)}</td><td>${num(r.avgA)}</td>
          <td>${num(r.totB)}</td><td>${num(r.avgB)}</td>
          <td class="${r.diff>0?'neg':'pos'}"><b>${r.diff>=0?'+':''}${num(r.diff)}</b></td>
          <td class="${r.pct>0?'neg':'pos'}"><b>${pctBadge(r.pct)}</b></td>
        </tr>`).join('')}
        <tr class="tot"><td class="l">TOTAL GERAL</td><td>${num(d.A.total)}</td><td>${num(d.A.avgMonth)}</td><td>${num(d.B.total)}</td><td>${num(d.B.avgMonth)}</td><td class="${d.B.avgMonth-d.A.avgMonth>0?'neg':'pos'}">${d.B.avgMonth-d.A.avgMonth>=0?'+':''}${num(d.B.avgMonth-d.A.avgMonth)}</td><td class="${d.inflPct>0?'neg':'pos'}">${pctBadge(d.inflPct)}</td></tr>
      </tbody>
    </table></div>
  </div>`;
}
function drawInfl(){
  const c=document.getElementById('c-infl');if(!c)return;
  const yrs=histYearsList(),curY=S.settings.base.slice(0,4);
  if(!inflBaseYr||!yrs.includes(inflBaseYr))inflBaseYr=yrs.includes(String(+curY-1))?String(+curY-1):(yrs[0]||curY);
  if(!inflCompYr||!yrs.includes(inflCompYr))inflCompYr=yrs.includes(curY)?curY:(yrs[yrs.length-1]||curY);
  const d=calcPersonalInflation(inflBaseYr,inflCompYr),top=d.rows.slice(0,10);
  charts.push(new Chart(c,{type:'bar',data:{labels:top.map(r=>r.cat),datasets:[
    {label:`Média/mês ${inflBaseYr}`,data:top.map(r=>+r.avgA.toFixed(2)),backgroundColor:'#80868f'},
    {label:`Média/mês ${inflCompYr}`,data:top.map(r=>+r.avgB.toFixed(2)),backgroundColor:'#0e6b7c'}]},
    options:{plugins:{tooltip:{callbacks:{label:x=>x.dataset.label+': '+brl(x.parsed.y)}}}}}));
}
function rAuditoria(){
  const list=S.extras.auditLog||[];
  const whos=[...new Set(list.map(x=>x.by).filter(Boolean))];
  const q=norm(auditFilter);
  const filtered=list.filter(x=>(!auditWho||x.by===auditWho)&&(!q||norm(x.acao+' '+x.detalhe+' '+x.by).includes(q)));
  const fd=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  return `${histNav()}
  <div class="panel">
    <div class="bar" style="justify-content:space-between;margin-bottom:8px">
      <div>
        <h2 style="margin:0">🛡️ Auditoria & Linha do Tempo de Atividades</h2>
        <div class="note" style="margin:2px 0 0">Registro transparente das ações críticas do casal (importações, validações, fechamentos, pagamentos e Pix — últimos 120 eventos).</div>
      </div>
      ${list.length?`<button class="b g" data-act="clear-audit">Limpar histórico</button>`:''}
    </div>
    <div class="bar">
      <input id="audit-txt" placeholder="Filtrar ação ou detalhe…" value="${esc(auditFilter)}" style="width:240px">
      <select id="audit-who"><option value="">Todos os usuários</option>${whos.map(w=>`<option value="${esc(w)}" ${auditWho===w?'selected':''}>${esc(w)}</option>`).join('')}</select>
      <span class="note">${filtered.length} registro(s) exibido(s)</span>
    </div>
    ${filtered.length?`<div class="audit-list">${filtered.map(x=>`<div class="audit-item">
      <div>
        <span class="tag t-${x.by==='Pedro'?'Pedro':x.by==='Cristian'?'Cristian':'Conjunto'}" style="margin-right:8px">${esc(x.by||'Local')}</span>
        <b>${esc(x.acao)}</b>${x.detalhe?` — <span>${esc(x.detalhe)}</span>`:''}
      </div>
      <span class="note">${fd(x.at)}</span>
    </div>`).join('')}</div>`:`<div class="note" style="margin-top:8px">Nenhuma atividade registrada ainda para este filtro. Ações como confirmar faturas, marcar contas pagas, registrar Pix ou encerrar mês aparecem automaticamente aqui.</div>`}
  </div>`;
}
function rHist(){
  if(histMode==='inflacao')return rInflacao();
  if(histMode==='auditoria')return rAuditoria();
  const fats=histFats(),sel=fats.includes(F.hf)?F.hf:S.settings.base;
  const grp=f=>{const fr=S.extras.closedMonths?.[f];if(fr?.g)return fr.g;const g={parcelas:0,fixas:0,assinaturas:0,variaveis:0};S.tx.forEach(x=>{if(x.fatura===f&&live(x))g[GROUP[x.tipo]]+=x.valor});return g};
  const cat={};
  const selFr=S.extras.closedMonths?.[sel];
  const selList=selFr?(selFr.items?.card||[]):S.tx.filter(x=>x.fatura===sel&&live(x));
  selList.forEach(x=>{const c=cat[x.cat]=cat[x.cat]||{Cristian:0,Pedro:0,Conjunto:0,t:0};c[x.quem]=(c[x.quem]||0)+x.valor;c.t+=x.valor});
  const catRows=Object.entries(cat).sort((a,b)=>b[1].t-a[1].t);
  return `${histNav()}<div class="panel"><h2>Histórico por fatura</h2><div class="bar">${pctBox()}</div><div class="row" style="margin-bottom:10px"><div style="flex:1;min-width:260px"><canvas id="c3"></canvas></div></div>
  <div class="tw"><table><tr><th class="l">Fatura</th><th>Total</th><th>Indiv. Cristian</th><th>Indiv. Pedro</th><th>Conjuntas (100%)</th><th>50% Conj. (cada)</th><th>Cristian paga</th><th>Pedro paga</th><th>Parcelas</th><th>Fixas</th><th>Assinaturas</th><th>Variáveis</th></tr>
  ${fats.map(f=>{const s=histSplit(f),g=grp(f);return `<tr><td class="l"><a href="#" data-mes="${f}">${lab(f)}</a>${s.frozen?' 🔒':''}</td><td><b>${num(s.total)}</b></td><td>${num(s.Cristian)}</td><td>${num(s.Pedro)}</td><td>${num(s.Conjunto)}</td><td>${num(s.Conjunto*0.5)}</td><td><b>${num(s.payC)}</b></td><td><b>${num(s.payP)}</b></td><td>${num(g.parcelas)}</td><td>${num(g.fixas)}</td><td>${num(g.assinaturas)}</td><td>${num(g.variaveis)}</td></tr>`}).join('')}
  </table></div><div class="note">"Paga" = despesas individuais (100%) + 50% das despesas conjuntas. Itens "Ignorar" ficam de fora. Meses com 🔒 usam o fechamento oficial congelado.</div></div>
  <div class="panel"><h2>Gastos por categoria</h2><div class="bar"><select id="fhf">${fats.map(f=>`<option value="${f}" ${f===sel?'selected':''}>${lab(f)}${S.extras.closedMonths?.[f]?' 🔒':''}</option>`).join('')}</select></div>
  <div class="tw"><table><tr><th class="l">Categoria</th><th>Indiv. Cristian</th><th>Indiv. Pedro</th><th>Conjuntas (100%)</th><th>50% Conj. (cada)</th><th>Total</th></tr>
  ${catRows.map(([c,v])=>`<tr><td class="l">${esc(c)}</td><td>${num(v.Cristian)}</td><td>${num(v.Pedro)}</td><td>${num(v.Conjunto)}</td><td>${num((v.Conjunto||0)*0.5)}</td><td><b>${num(v.t)}</b></td></tr>`).join('')}</table></div></div>`;
}
function drawHist(){
  if(histMode==='inflacao'){drawInfl();return}
  if(histMode==='auditoria')return;
  const fats=histFats(),col={Cristian:'#0e6b7c',Pedro:'#c55a11',Conjunto:'#548235'};
  charts.push(new Chart(document.getElementById('c3'),{type:'bar',data:{labels:fats.map(lab),datasets:PEOPLE.map(q=>({label:q,data:fats.map(f=>histSplit(f)[q]),backgroundColor:col[q]}))},
    options:{scales:{x:{stacked:true},y:{stacked:true}},plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.parsed.y)}}}}}));
}

function setDrawer(open){
  const t=document.getElementById('tabs'),bd=document.getElementById('nav-backdrop'),mb=document.getElementById('menu-btn');
  if(!t)return;
  t.classList.toggle('open',!!open);
  if(bd)bd.hidden=!open;
  if(mb)mb.setAttribute('aria-expanded',open?'true':'false');
}
if(localStorage.getItem('pf-nav-collapsed')==='1'&&document.body)document.body.classList.add('nav-collapsed');
document.getElementById('menu-btn')?.addEventListener('click',()=>{
  if(window.innerWidth<1024){setDrawer(!document.getElementById('tabs')?.classList.contains('open'));return}
  const c=document.body.classList.toggle('nav-collapsed');
  localStorage.setItem('pf-nav-collapsed',c?'1':'0');
});
document.getElementById('mob-menu-btn')?.addEventListener('click',()=>setDrawer(true));
document.getElementById('nav-close')?.addEventListener('click',()=>setDrawer(false));
document.getElementById('nav-backdrop')?.addEventListener('click',()=>setDrawer(false));
document.getElementById('view').addEventListener('change',e=>{view=e.target.value;render()});
document.getElementById('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;SEL.clear();setDrawer(false);render()}});
document.getElementById('mob-nav')?.addEventListener('click',e=>{const b=e.target.closest('[data-mtab]');if(b){tab=b.dataset.mtab;SEL.clear();setDrawer(false);render()}});
document.getElementById('help-btn')?.addEventListener('click',()=>openGuideModal());
document.getElementById('drawer-guide-btn')?.addEventListener('click',()=>{setDrawer(false);openGuideModal()});
document.getElementById('theme-btn')?.addEventListener('click',()=>{
  applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  render();
});
window.addEventListener('keydown',e=>{
  if(e.altKey&&e.key.toLowerCase()==='n'){e.preventDefault();openQuickAdd(tab==='fora'?'fora':tab==='cartao'?'estimativa':'cartao')}
  else if(e.altKey&&e.key.toLowerCase()==='t'){e.preventDefault();applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');render()}
  else if(e.key==='Escape'){
    const qm=document.getElementById('qmodal');
    if(qm&&!qm.hidden){qm.hidden=true}
    else if(document.getElementById('tabs')?.classList.contains('open')){setDrawer(false)}
    else if(SEL.size){SEL.clear();render()}
  }
});
function openQuickAdd(mode='cartao'){
  const qm=document.getElementById('qmodal');if(!qm)return;
  const cats=[...new Set([...OCATS,...S.tx.map(x=>x.cat)])].filter(Boolean).sort();
  const defQuem=currentUser==='Pedro'?'Pedro':currentUser==='Cristian'?'Cristian':'Conjunto';
  qm.hidden=false;
  qm.innerHTML=`<div class="qbox">
    <div class="bar" style="justify-content:space-between;margin-bottom:12px">
      <h2 style="margin:0">Novo lançamento rápido</h2>
      <div class="bar" style="margin:0">
        <button class="b ${mode==='cartao'?'':'g'}" id="qm-c" style="padding:4px 10px;font-size:12px">Cartão</button>
        <button class="b ${mode==='fora'?'':'g'}" id="qm-f" style="padding:4px 10px;font-size:12px">Fora do cartão</button>
        <button class="b ${mode==='estimativa'?'':'g'}" id="qm-e" style="padding:4px 10px;font-size:12px">Estimativa futura</button>
      </div>
    </div>
    <datalist id="qmcats">${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</datalist>
    ${mode==='cartao'?`<div class="qgrid">
      <label>Descrição</label><input id="qd" placeholder="Ex.: Mercado, iFood, Farmácia">
      <label>Valor (R$)</label><input id="qv" type="number" step="0.01" placeholder="0,00">
      <label>Quem</label><select id="qq"><option value="Cristian" ${defQuem==='Cristian'?'selected':''}>Cristian (Individual 100%)</option><option value="Pedro" ${defQuem==='Pedro'?'selected':''}>Pedro (Individual 100%)</option><option value="Conjunto" ${defQuem==='Conjunto'?'selected':''}>Conjunto (50% / 50%)</option></select>
      <label>Tipo</label><select id="qt">${opts(TIPOS,'variavel')}</select>
      <label>Parcelas</label><input id="qp" type="number" min="1" max="48" value="1">
      <label>Categoria</label><input id="qcat" list="qmcats" value="Sem categoria">
      <label>Fatura</label><input id="qfat" type="month" value="${S.settings.base}">
    </div>`:mode==='fora'?`<div class="qgrid">
      <label>Nome</label><input id="qd" placeholder="Ex.: Condomínio, Luz, Pix">
      <label>Valor (R$)</label><input id="qv" type="number" step="0.01" placeholder="0,00">
      <label>Quem</label><select id="qq"><option value="Cristian" ${defQuem==='Cristian'?'selected':''}>Cristian (Individual 100%)</option><option value="Pedro" ${defQuem==='Pedro'?'selected':''}>Pedro (Individual 100%)</option><option value="Conjunto" ${defQuem==='Conjunto'?'selected':''}>Conjunto (50% / 50%)</option></select>
      <label>Natureza</label><select id="qkind"><option value="despesa">Despesa</option><option value="receita">Receita</option></select>
      <label>Vencimento</label><input id="qvenc" type="number" min="1" max="31" placeholder="Dia (1–31)">
      <label>Categoria</label><input id="qcat" list="qmcats" value="Moradia">
      <label>Início</label><input id="qfat" type="month" value="${S.settings.base}">
    </div>`:`<div class="qgrid">
      <label>Estimativa</label><input id="qd" list="qmpresets" placeholder="Ex.: Gasolina, Alimentação fora, Mercado">
      <datalist id="qmpresets">${EST_PRESETS.map(p=>`<option value="${esc(p.nome)}">${esc(p.cat)}</option>`).join('')}</datalist>
      <label>Valor mensal (R$)</label><input id="qv" type="number" step="10" placeholder="0,00">
      <label>Quem</label><select id="qq"><option value="Cristian" ${defQuem==='Cristian'?'selected':''}>Cristian (Individual 100%)</option><option value="Pedro" ${defQuem==='Pedro'?'selected':''}>Pedro (Individual 100%)</option><option value="Conjunto" selected>Conjunto (50% / 50%)</option></select>
      <label>Categoria</label><input id="qcat" list="qmcats" value="Outros">
      <label>Início (mês &gt; base)</label><input id="qfat" type="month" value="${addM(S.settings.base,1)}">
      <label>Até (opcional)</label><input id="qfim" type="month" value="">
    </div>`}
    <div class="bar" style="justify-content:flex-end;margin:0">
      <button class="b g" id="qm-cancel">Cancelar</button>
      <button class="b" id="qm-save">Salvar</button>
    </div>
  </div>`;
  qm.querySelector('#qd')?.focus();
  qm.querySelector('#qm-c').onclick=()=>openQuickAdd('cartao');
  qm.querySelector('#qm-f').onclick=()=>openQuickAdd('fora');
  qm.querySelector('#qm-e').onclick=()=>openQuickAdd('estimativa');
  qm.querySelector('#qm-cancel').onclick=()=>{qm.hidden=true};
  qm.onclick=e=>{if(e.target===qm)qm.hidden=true};
  qm.querySelector('#qd')?.addEventListener('change',e=>{
    const v=e.target.value;
    if(mode==='cartao'){
      const r=S.rules[key(v)];
      if(r){qm.querySelector('#qcat').value=r.cat||'Sem categoria';qm.querySelector('#qt').value=r.tipo||'variavel';qm.querySelector('#qq').value=r.quem||defQuem}
    }else if(mode==='estimativa'){
      const p=EST_PRESETS.find(x=>x.nome.toLowerCase()===v.trim().toLowerCase());
      if(p){qm.querySelector('#qcat').value=p.cat;qm.querySelector('#qq').value=p.quem}
    }
  });
  qm.querySelector('#qm-save').onclick=()=>{
    const desc=qm.querySelector('#qd').value.trim(),val=+qm.querySelector('#qv').value||0;
    if(!desc||!val)return alert('Informe a descrição e o valor.');
    const quem=qm.querySelector('#qq').value,cat=qm.querySelector('#qcat').value.trim()||'Outros',ym=qm.querySelector('#qfat').value||S.settings.base;
    if(mode==='cartao'){
      const np=Math.max(1,+qm.querySelector('#qp').value||1),tipo=np>1?'parcelada':qm.querySelector('#qt').value;
      const o={id:Date.now(),data:new Date().toISOString().slice(0,10),desc,cur:np>1?1:null,tot:np>1?np:null,valor:val,tipo,cat,quem,cartao:'',fim:null,ativo:true,fatura:ym,rev:false};
      S.tx.push(o);remember(o);
    }else if(mode==='fora'){
      const kind=qm.querySelector('#qkind').value,venc=+qm.querySelector('#qvenc').value||null;
      S.off.push({id:Date.now(),nome:desc,quem,kind,valor:val,venc,inicio:ym,fim:null,cat:kind==='receita'?'Renda':cat,freq:'mensal'});
    }else{
      const fim=qm.querySelector('#qfim')?.value||null;
      (S.settings.varItems=S.settings.varItems||[]).push({id:Date.now(),nome:desc,quem,cat,valor:val,inicio:ym,fim,ativo:true});
    }
    logAudit('Lançamento rápido',`${mode}: ${desc} (${brl(val)} · ${quem} · ${lab(ym)})`);
    qm.hidden=true;save();render();
  };
}
document.getElementById('fab-add')?.addEventListener('click',()=>openQuickAdd(tab==='fora'?'fora':tab==='cartao'?'estimativa':'cartao'));
// ---- Sincronização (Supabase) ----
const CFG=window.CONFIG||{},sb=CFG.SUPABASE_URL&&window.supabase?supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
let timer=null,lastRemote=null;
const setSync=t=>{
  const el=document.getElementById('sync');if(el)el.textContent=t;
  const ds=document.getElementById('drawer-sync');if(ds)ds.textContent=t;
};
function push(){
  if(!sb)return;clearTimeout(timer);setSync('salvando…');
  timer=setTimeout(async()=>{
    timer=null;
    if(lastRemote){
      const {data:rem}=await sb.from('household').select('data,updated_at').eq('id',1).maybeSingle();
      if(rem?.updated_at&&rem.updated_at!==lastRemote){
        saveSnap('Conflito de sincronização (versão local)');
        const who=rem.data?.meta?.updatedBy||'outro dispositivo';
        if(!confirm(`A nuvem recebeu uma atualização mais recente (${who} às ${new Date(rem.updated_at).toLocaleTimeString('pt-BR')}).\n\nClique em OK para SOBRESCREVER a nuvem com sua edição atual (sua versão também foi salva nos Pontos de Restauração) ou Cancelar para carregar a versão da nuvem.`)){
          lastRemote=rem.updated_at;S=mig(rem.data);localStorage.setItem(KEY,JSON.stringify(S));setSync('sincronizado');render();return;
        }
      }
    }
    const {data,error}=await sb.from('household').upsert({id:1,data:S,updated_at:new Date().toISOString()}).select('updated_at').single();
    if(error){setSync('erro ao sincronizar: '+error.message)}else{lastRemote=data.updated_at;setSync('sincronizado')}
  },600);
}
async function pull(first){
  if(!sb)return;
  const {data,error}=await sb.from('household').select('data,updated_at').eq('id',1).maybeSingle();
  if(error){setSync('erro: '+error.message);return}
  if(!data){if(S.tx.length||S.off.length)push();return}
  if(data.updated_at===lastRemote)return;
  if(timer&&!first)return;
  const needsMig=data.data?.rulesV!==6;
  lastRemote=data.updated_at;S=mig(data.data);localStorage.setItem(KEY,JSON.stringify(S));setSync('sincronizado');
  if(needsMig)push();
  if(!document.activeElement||!['INPUT','SELECT'].includes(document.activeElement.tagName))render();
}
function loginScreen(msg){
  document.getElementById('main').innerHTML=`<div class="panel" style="max-width:400px;margin:28px auto">
  <h2>Portal Financeiro — Cristian &amp; Pedro</h2>
  <div class="note" style="margin-bottom:12px">Acesse com seu e-mail autorizado para ver e editar os dados sincronizados na nuvem em tempo real entre celular e computador.</div>
  ${msg?`<div class="warn" style="margin-bottom:10px">${esc(msg)}</div>`:''}
  <div class="grid2" style="grid-template-columns:1fr;gap:8px"><input id="em" type="email" autocomplete="email" placeholder="Seu e-mail" style="width:100%"><input id="pw" type="password" autocomplete="current-password" placeholder="Sua senha" style="width:100%">
  <button class="b" id="go">Entrar no portal</button><button class="b g" id="su">Criar conta (primeiro acesso)</button></div></div>`;
  const cred=()=>({email:document.getElementById('em').value.trim(),password:document.getElementById('pw').value});
  document.getElementById('go').onclick=async()=>{const {error}=await sb.auth.signInWithPassword(cred());error?loginScreen(error.message):start()};
  document.getElementById('su').onclick=async()=>{const {error}=await sb.auth.signUp(cred());loginScreen(error?error.message:'Conta criada. Confirme o e-mail (se exigido) e clique em Entrar.')};
}
async function start(){
  const {data}=await sb.auth.getSession();
  if(!data.session)return loginScreen();
  const em=data.session.user?.email||'';
  currentUser=/pedro/i.test(em)?'Pedro':/cristian/i.test(em)?'Cristian':(em.split('@')[0]||'Usuário');
  if(!document.getElementById('usr-exit')){
    const clsTag='tag '+(currentUser==='Pedro'?'t-Pedro':'t-Cristian');
    const u=document.createElement('span');u.className=clsTag;u.textContent=`👤 ${currentUser}`;
    const b=document.createElement('button');b.id='usr-exit';b.textContent='Sair';b.className='b g';b.style.cssText='padding:4px 9px;font-size:12px';b.onclick=async()=>{await sb.auth.signOut();location.reload()};
    document.getElementById('sync').after(u,b);
    const du=document.getElementById('drawer-user');
    if(du){
      du.hidden=false;
      du.innerHTML=`<span class="${clsTag}">👤 ${esc(currentUser)}</span><span id="drawer-sync" class="note" style="margin:0;flex:1">${esc(document.getElementById('sync')?.textContent||'')}</span><button type="button" id="drawer-exit" class="b g" style="padding:3px 9px;font-size:11.5px">Sair</button>`;
      du.querySelector('#drawer-exit').onclick=b.onclick;
    }
  }
  await pull(true);render();
  setInterval(()=>pull(false),15000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pull(false)});
  window.addEventListener('focus',()=>pull(false));
}
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').then(r=>r.update()).catch(()=>{});
sb?start():render();
