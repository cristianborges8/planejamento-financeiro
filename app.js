'use strict';
const KEY='planejamento-financeiro-v1',SNAP_KEY='planejamento-financeiro-snaps-v1';
const TIPOS={parcelada:'Parcelada',fixa:'Fixa',assinatura_mensal:'Assinatura mensal',assinatura_anual:'Assinatura anual',variavel:'Variável',ignorar:'Ignorar'};
const GROUP={parcelada:'parcelas',fixa:'fixas',assinatura_mensal:'assinaturas',assinatura_anual:'assinaturas',variavel:'variaveis'};
const GLAB={parcelas:'Parcelas',fixas:'Despesas fixas',assinaturas:'Assinaturas',variaveis:'Variáveis (estimativa)'};
const GCOL={parcelas:'#0e6b7c',fixas:'#f08c00',assinaturas:'#9775fa',variaveis:'#ced4da'};
const PEOPLE=['Cristian','Pedro','Conjunto'];
const MN=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

const EMPTY={tx:[],off:[],settings:{pctCristian:50,horizon:14,base:new Date().toISOString().slice(0,7),includeVar:true,varAmt:{Cristian:0,Pedro:0,Conjunto:0},saldoIni:{Cristian:0,Pedro:0},faturaOficial:0}};
const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const key=d=>{
  const b=norm(d).replace(/parcela\s*\d+\s*de\s*\d+/g,'').trim();
  const s=b.replace(/^(?:ifd|ifood|uber(?:\s*\*?\s*(?:trip|eats))?|mp|mercadopago|pag|pagseguro|picpay|ebw|ec|htm|dl|paypal|stone|sumup|zp|bck)\s*[\*\-\.\s]+/,'').replace(/[^a-z0-9]/g,'').slice(0,22);
  return s||b.replace(/[^a-z0-9]/g,'').slice(0,22);
};
function splitCasa(d){const o=d.off||[],i=o.findIndex(x=>x.nome==='Aluguel+taxas+IPTU+seguro (casa nova)');if(i<0)return;const b=o[i];let id=Math.max(0,...o.map(x=>x.id))+1;
 const p=(nome,valor)=>({...b,id:id++,nome:nome+' (casa nova)',valor});
 o.splice(i,1,p('Aluguel',2158.18),p('Taxa de serviço',55.90),p('IPTU',161.77),p('Seguro incêndio',28.73))}
function mig(d){splitCasa(d);d.rules=d.rules||{};d.meta=d.meta||{};d.paid=d.paid||{};{const e=d.extras=d.extras||{};e.metas=e.metas||{};e.reserva=e.reserva||{meta:0,saldo:0,aporte:0,rend:0.8};e.inv=e.inv||[];e.saques=e.saques||[];e.compras=e.compras||[];e.cen=e.cen||{moradiaPct:0,rendaPct:0,varPct:0,extra:0,extraDe:'',quitarId:'',quitarMes:''}}const st=d.settings;st.fgts=st.fgts||{Cristian:{ini:0,dep:0},Pedro:{ini:0,dep:0}};if(st.fgtsRate==null)st.fgtsRate=0.25;d.off.forEach(o=>{if(!o.freq)o.freq='mensal'});d.tx.forEach(x=>{if(!x.fatura)x.fatura=d.settings.base});if(d.rulesV!==3){d.rules={};d.rulesV=3;learn(d,d.tx)}return d}
let S=load(),view='casal',tab='geral',MS=null,charts=[],IMP=null,rulesOpen=false,currentUser=null,SEL=new Set();
const F={quem:'',tipo:'',txt:'',fat:null,rev:false,hf:null,rtxt:''};
const cur=x=>x.fatura===S.settings.base;
const live=x=>x.ativo&&!x.rev&&x.tipo!=='ignorar';
const isPaid=(ym,k)=>!!(S.paid?.[ym]?.[k]);
const setPaid=(ym,k,v)=>{S.paid=S.paid||{};S.paid[ym]=S.paid[ym]||{};if(v)S.paid[ym][k]=true;else delete S.paid[ym][k]};

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
const addM=(ym,k)=>{let[y,m]=ym.split('-').map(Number);m+=k;y+=Math.floor((m-1)/12);m=((m-1)%12+12)%12+1;return y+'-'+String(m).padStart(2,'0')};
const diffM=(a,b)=>(+b.slice(0,4)-+a.slice(0,4))*12+(+b.slice(5)-+a.slice(5));
const lab=ym=>MN[+ym.slice(5)-1]+'/'+ym.slice(2,4);
const brl=v=>(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num=v=>(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cls=v=>v<0?'neg':'';
const months=(n=S.settings.horizon)=>Array.from({length:n+1},(_,k)=>addM(S.settings.base,k));

function weight(q){
  const p=S.settings.pctCristian/100;
  switch(view){
    case 'casal':return 1;
    case 'cristian':return q==='Cristian'?1:q==='Pedro'?0:p;
    case 'pedro':return q==='Pedro'?1:q==='Cristian'?0:1-p;
    default:return q==='Conjunto'?1:0;
  }
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
function varAt(q,k){
  if(k===0)return S.tx.filter(x=>live(x)&&x.tipo==='variavel'&&x.quem===q&&cur(x)).reduce((a,x)=>a+x.valor,0);
  return S.settings.includeVar?(S.settings.varAmt[q]||0):0;
}
const offV=(o,ym)=>o.valor*Math.pow(1+(o.reaj||0)/100,Math.floor(diffM(o.inicio,ym)/12));
const offActive=(o,ym)=>o.inicio<=ym&&(!o.fim||ym<=o.fim)&&(o.freq!=='anual'||o.inicio.slice(5)===ym.slice(5));

function compute(n){
  let saldo=PEOPLE.reduce((a,q)=>a+(S.settings.saldoIni[q]||0)*weight(q),0);
  const incP=!!S.settings.includePlans,E=S.extras,rr=(E.reserva?.rend||0)/100;
  let res=E.reserva?.saldo||0;
  return months(n).map((ym,k)=>{
    const g={parcelas:0,fixas:0,assinaturas:0,variaveis:0};
    S.tx.forEach(x=>{const a=txAmount(x,k);if(a)g[GROUP[x.tipo]]+=a*weight(x.quem)});
    if(incP)E.compras.forEach(c=>{const np=Math.max(1,c.np||1),d=diffM(c.mes,ym);if(d>=0&&d<np)g.parcelas+=(c.valor/np)*weight(c.quem)});
    PEOPLE.forEach(q=>g.variaveis+=varAt(q,k)*weight(q));
    let renda=0,fora=0;
    S.off.forEach(o=>{if(!offActive(o,ym))return;const v=offV(o,ym)*weight(o.quem);o.kind==='receita'?renda+=v:fora+=v});
    if(incP){
      const inRes=!(E.reserva.meta&&res>=E.reserva.meta)?(E.reserva.aporte||0):0;
      res=res*(1+rr)+inRes;fora+=inRes*weight('Conjunto');
      E.inv.forEach(i=>{if(i.inicio<=ym&&(!i.fim||ym<=i.fim))fora+=(i.valor||0)*weight(i.quem)});
      E.saques.forEach(x=>{if(x.mes===ym&&x.destino==='caixa')renda+=(x.valor||0)*weight(x.quem)});
    }
    const comprometido=g.parcelas+g.fixas+g.assinaturas,cartao=comprometido+g.variaveis;
    const total=cartao+fora,sobra=renda-total;saldo+=sobra;
    return {ym,k,g,renda,fora,comprometido,cartao,total,sobra,saldo};
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
  const btn=document.getElementById('theme-btn');if(btn)btn.textContent=mode==='dark'?'☀️ Claro':'🌙 Escuro';
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
  const tr=a.closest('tr[data-id]'),trR=a.closest('tr[data-rule]');
  const sel=tr&&a.dataset.f?`tr[data-id="${tr.dataset.id}"]${tr.dataset.list?`[data-list="${tr.dataset.list}"]`:''} [data-f="${a.dataset.f}"]`:
    trR&&a.dataset.rf?`tr[data-rule="${CSS.escape(trR.dataset.rule)}"] [data-rf="${a.dataset.rf}"]`:
    a.id?`#${a.id}`:
    ['s','fg','meta','res','cen','v','si'].map(k=>a.dataset[k]!=null?`[data-${k}="${CSS.escape(a.dataset[k])}"]`:null).find(Boolean);
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
  const base=S.settings.base,k0=compute(1)[0],sp=split(base),p=S.settings.pctCristian/100;
  const offP=S.off.filter(o=>offActive(o,base)&&o.kind!=='receita').reduce((a,o)=>a+offV(o,base)*(o.quem==='Pedro'?1:o.quem==='Conjunto'?1-p:0),0);
  mb.innerHTML=`<span><small>Mês base</small><b>${lab(base)}</b></span>
    <span><small>Fatura atual</small><b>${brl(k0.cartao)}</b></span>
    <span><small>Sobra mês</small><b class="${cls(k0.sobra)}">${brl(k0.sobra)}</b></span>
    <span><small>Pedro → Cristian</small><b>${brl(sp.payP+offP)}</b></span>`;
}
function render(){
  destroyCharts();
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  const m=document.getElementById('main');
  const fc=captureFocus(m),scrolls=[...m.querySelectorAll('.tw')].map(el=>[el.scrollTop,el.scrollLeft]);
  const nr=S.tx.filter(x=>x.rev).length;
  const mt=S.meta||{},fd=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  document.getElementById('meta').textContent=(mt.lastImport?`Última importação: fatura ${lab(mt.lastImport.fatura)} em ${fd(mt.lastImport.at)}`:'Nenhuma importação ainda')+(mt.updatedAt?` · Atualizado em ${fd(mt.updatedAt)}${mt.updatedBy?` por ${mt.updatedBy}`:''}`:'');
  document.querySelector('[data-tab=imp]').textContent='Importar / Revisar'+(nr?` (${nr})`:'');
  updateMobBar();
  m.innerHTML={metas:rMetas,planos:rPlanos,cen:rCen,fluxo:rFluxo,geral:rGeral,mes:rMes,cartao:rCartao,lanc:rLanc,fora:rFora,prem:rPrem,imp:rImp,hist:rHist}[tab]();
  if(tab==='geral')drawGeral();
  if(tab==='fluxo')drawFluxo();
  if(tab==='planos')drawPlanos();
  if(tab==='cen')drawCen();
  if(tab==='hist')drawHist();
  bind(m);
  m.querySelectorAll('.tw').forEach((el,i)=>{if(scrolls[i]){el.scrollTop=scrolls[i][0];el.scrollLeft=scrolls[i][1]}});
  restoreFocus(m,fc);
}

const nextYearDec=()=>`${+S.settings.base.slice(0,4)+1}-12`;
const endMonth=()=>{const e=S.settings.flowEnd;return e&&e>S.settings.base?e:nextYearDec()};
const firstFat=()=>S.tx.map(x=>x.fatura).sort()[0]||S.settings.base;
const allMonths=()=>{const mx=endMonth()>'2028-12'?endMonth():'2028-12';return Array.from({length:diffM(firstFat(),mx)+1},(_,i)=>addM(firstFat(),i))};
const horizonCtrl=()=>{
  const def=nextYearDec(),curEnd=endMonth(),by=+S.settings.base.slice(0,4);
  const optsList=[[ '',`${lab(def)} (dez do ano seguinte – padrão)`],[addM(S.settings.base,12),`${lab(addM(S.settings.base,12))} (+12 meses)`],[`${by}-12`,`${lab(by+'-12')} (fim deste ano)`],[`${by+2}-12`,`${lab((by+2)+'-12')} (dez/${String(by+2).slice(2)})`],[`${by+3}-12`,`${lab((by+3)+'-12')} (dez/${String(by+3).slice(2)})`]].filter(([v])=>!v||v>S.settings.base);
  const raw=S.settings.flowEnd||'';
  return `<label class="note" style="display:inline-flex;align-items:center;gap:6px">Projetar até: <select data-s="flowEnd">${optsList.map(([v,l])=>`<option value="${v}" ${raw===v?'selected':''}>${l}</option>`).join('')}</select> <span class="note">(${diffM(S.settings.base,curEnd)} meses à frente)</span></label>`;
};
function series(){
  const base=S.settings.base,proj=compute(Math.max(1,diffM(base,endMonth())));
  const hist=allMonths().filter(m=>m<base).map(ym=>{
    const g={parcelas:0,fixas:0,assinaturas:0,variaveis:0};
    S.tx.forEach(x=>{if(x.fatura===ym&&live(x))g[GROUP[x.tipo]]+=x.valor*weight(x.quem)});
    let renda=0,fora=0;S.off.forEach(o=>{if(!offActive(o,ym))return;const v=offV(o,ym)*weight(o.quem);o.kind==='receita'?renda+=v:fora+=v});
    const cartao=g.parcelas+g.fixas+g.assinaturas+g.variaveis,total=cartao+fora;
    return {ym,k:-1,g,renda,fora,cartao,total,sobra:renda-total,saldo:null};
  });
  return [...hist,...proj];
}
function rGeral(){
  const R=series(),yrs=[...new Set(R.map(r=>r.ym.slice(0,4)))];
  const sum=(rows,f)=>rows.reduce((a,r)=>a+r[f],0);
  const nrev=S.tx.filter(x=>x.rev).length,base=S.settings.base;
  const C=compute(Math.max(1,diffM(base,endMonth()))),k0=C[0],k1=C[1],parcRest=C.slice(1).reduce((a,r)=>a+r.g.parcelas,0),fim=R[R.length-1],avg=C.slice(1).reduce((a,r)=>a+r.sobra,0)/(C.length-1),sp=split(base);
  const pctRenda=k0.renda?Math.round(k0.cartao/k0.renda*100):0,diffNext=k1.cartao-k0.cartao;
  return `${nrev?`<div class="warn">${nrev} lançamentos aguardando validação: ficam fora dos cálculos até você confirmar (aba Importar / Revisar).</div>`:''}
  <div class="bar" style="justify-content:space-between;margin-bottom:10px">
    ${horizonCtrl()}
    ${S.settings.includePlans?`<span class="note" style="color:var(--accent);font-weight:600">📋 Incluindo itens da aba Planos</span>`:''}
  </div>
  <div class="cards">
    <div class="card"><small>Fatura atual (${lab(k0.ym)})</small><b>${brl(k0.cartao)}</b><small class="sub">${pctRenda}% da renda · comprometido ${brl(k0.comprometido)}</small></div>
    <div class="card"><small>Próxima fatura (${lab(k1.ym)})</small><b>${brl(k1.comprometido)}</b><small class="sub">c/ variáveis: ${brl(k1.cartao)} (${diffNext>=0?'+':''}${brl(diffNext)})</small></div>
    <div class="card c-warn"><small>Parcelas futuras (${C.length-1} meses)</small><b>${brl(parcRest)}</b><small class="sub">até ${lab(fim.ym)}</small></div>
    <div class="card ${avg>=0?'c-pos':'c-neg'}"><small>Sobra média mensal</small><b class="${cls(avg)}">${brl(avg)}</b><small class="sub">${k0.renda?Math.round(avg/k0.renda*100):0}% da renda poupada/mês</small></div>
    <div class="card ${fim.saldo>=0?'c-pos':'c-neg'}"><small>Saldo projetado em ${lab(fim.ym)}</small><b class="${cls(fim.saldo)}">${brl(fim.saldo)}</b><small class="sub">acumulado em conta</small></div>
    <div class="card"><small>Divisão da fatura (${lab(base)})</small><b style="font-size:16px">Cristian: ${brl(sp.payC)}</b><small class="sub"><b>Pedro: ${brl(sp.payP)}</b> (Conjunto ${S.settings.pctCristian}%/${100-S.settings.pctCristian}%)</small></div>
  </div>
  <div class="panel"><h2>Série temporal completa (${lab(R[0].ym)} a ${lab(R[R.length-1].ym)})</h2>
  <div class="note">Meses até ${lab(addM(base,-1))}: faturas reais já importadas. A partir de ${lab(base)}: projeção até ${lab(fim.ym)}. Clique em uma barra para abrir o mês.</div>
  <canvas id="cg" height="110"></canvas></div>
  <div class="panel"><h2>Resumo por ano</h2><div class="tw"><table><tr><th>Ano</th><th>Renda</th><th>Cartão</th><th>Fora do cartão</th><th>Total despesas</th><th>Sobra/falta</th></tr>
  ${yrs.map(y=>{const rs=R.filter(r=>r.ym.startsWith(y));return `<tr><td>${y}</td><td>${num(sum(rs,'renda'))}</td><td>${num(sum(rs,'cartao'))}</td><td>${num(sum(rs,'fora'))}</td><td><b>${num(sum(rs,'total'))}</b></td><td class="${cls(sum(rs,'sobra'))}">${num(sum(rs,'sobra'))}</td></tr>`}).join('')}</table></div></div>
  <div class="panel"><h2>Todos os meses</h2><div class="tw"><table><tr><th>Mês</th><th></th><th>Renda</th><th>Parcelas</th><th>Fixas</th><th>Assinaturas</th><th>Variáveis</th><th>Cartão</th><th>Fora do cartão</th><th>Total</th><th>Sobra/falta</th><th>Saldo</th></tr>
  ${R.map(r=>`<tr class="${r.ym===base?'tot':''}"><td><a href="#" data-mes="${r.ym}">${lab(r.ym)}</a></td><td><small>${r.k<0?'real':r.k===0?'fatura atual':'projeção'}</small></td><td>${num(r.renda)}</td><td>${num(r.g.parcelas)}</td><td>${num(r.g.fixas)}</td><td>${num(r.g.assinaturas)}</td><td>${num(r.g.variaveis)}</td><td><b>${num(r.cartao)}</b></td><td>${num(r.fora)}</td><td><b>${num(r.total)}</b></td><td class="${cls(r.sobra)}">${num(r.sobra)}</td><td class="${cls(r.saldo)}">${r.saldo==null?'':num(r.saldo)}</td></tr>`).join('')}</table></div>
  <div class="bar" style="margin-top:12px"><button class="b g" data-act="export-xlsx">Exportar projeção (xlsx)</button></div></div>`;
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
    PEOPLE.forEach(q=>{const v=varAt(q,k);if(v)items.push({desc:'Variáveis (estimativa) – '+q,quem:q,tipo:'variavel',cat:'Estimativa',valor:v,sub:''})});
  }
  if(withPlans&&ym>=base){
    S.extras.compras.forEach(c=>{const np=Math.max(1,c.np||1),d=diffM(c.mes,ym);if(d>=0&&d<np)items.push({desc:`📋 ${c.nome} (Plano)`,quem:c.quem,tipo:'parcelada',cat:'Planejado',valor:c.valor/np,sub:`${d+1}/${np}`})});
  }
  return items;
}
function rMes(){
  const base=S.settings.base,Ms=allMonths();if(!MS||!Ms.includes(MS))MS=base;
  const ym=MS,rawItems=monthItems(ym),p=S.settings.pctCristian/100;
  const sp={Cristian:0,Pedro:0,Conjunto:0};rawItems.forEach(i=>sp[i.quem]+=i.valor);
  const payC=sp.Cristian+sp.Conjunto*p,payP=sp.Pedro+sp.Conjunto*(1-p);
  const items=rawItems.map(i=>({...i,valor:i.valor*weight(i.quem)})).filter(i=>i.valor>0).sort((a,b)=>b.valor-a.valor);
  const cartao=items.reduce((a,i)=>a+i.valor,0);
  const offAll=S.off.filter(o=>offActive(o,ym)),offs=q=>offAll.filter(o=>o.kind!=='receita').reduce((a,o)=>a+offV(o,ym)*(q==='C'?(o.quem==='Cristian'?1:o.quem==='Conjunto'?p:0):(o.quem==='Pedro'?1:o.quem==='Conjunto'?1-p:0)),0);
  const off=offAll.filter(o=>weight(o.quem)>0).sort((a,b)=>(a.kind==='receita'?0:1)-(b.kind==='receita'?0:1)||(a.venc||99)-(b.venc||99));
  const offDesp=off.filter(o=>o.kind!=='receita'),nPaid=offDesp.filter(o=>isPaid(ym,o.id)).length;
  const renda=off.filter(o=>o.kind==='receita').reduce((a,o)=>a+offV(o,ym)*weight(o.quem),0),fora=offDesp.reduce((a,o)=>a+offV(o,ym)*weight(o.quem),0);
  const cat={};items.forEach(i=>cat[i.cat]=(cat[i.cat]||0)+i.valor);
  const pend=S.tx.filter(x=>x.rev&&x.fatura===ym).length,i=Ms.indexOf(ym);
  const status=ym<base?'fatura real':ym===base?'fatura atual (importada)':'projeção';
  const vLab={casal:'casal',cristian:'Cristian',pedro:'Pedro',conjunto:'Conjunto'}[view];
  const repasseP=payP+offs('P'),fatOk=isPaid(ym,'fatura'),acOk=isPaid(ym,'acerto'),sobraM=renda-cartao-fora;
  return `<div class="panel"><div class="bar"><button class="b g" data-mes="${Ms[Math.max(0,i-1)]}">◀</button>
  <select id="msel">${Ms.map(m=>`<option value="${m}" ${m===ym?'selected':''}>${lab(m)}</option>`).join('')}</select>
  <button class="b g" data-mes="${Ms[Math.min(Ms.length-1,i+1)]}">▶</button><b style="margin-left:10px">${lab(ym)} – ${status}</b></div>
  <div class="bar">${pctBox(ym)}</div>
  ${pend?`<div class="warn">${pend} lançamentos desta fatura ainda não validados e fora dos números abaixo.</div>`:''}
  <div class="cards">
    <div class="card"><small>Renda (${vLab})</small><b>${brl(renda)}</b><small class="sub">comprometido: ${renda?Math.round((cartao+fora)/renda*100):0}%</small></div>
    <div class="card"><small>Cartão (${vLab})</small><b>${brl(cartao)}</b><label class="note" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;margin-top:4px"><input type="checkbox" data-paid="fatura" data-ym="${ym}" ${fatOk?'checked':''}><span class="${fatOk?'pos':''}">${fatOk?'Fatura paga ✓':'Fatura em aberto'}</span></label></div>
    <div class="card"><small>Fora do cartão (${vLab})</small><b>${brl(fora)}</b><small class="sub">${offDesp.length?`${nPaid}/${offDesp.length} contas pagas`:'Sem contas'}</small></div>
    <div class="card ${sobraM>=0?'c-pos':'c-neg'}"><small>Sobra/falta (${vLab})</small><b class="${cls(sobraM)}">${brl(sobraM)}</b><small class="sub">${renda?Math.round(sobraM/renda*100):0}% da renda</small></div>
    <div class="card"><small>Parte do Cristian (total)</small><b>${brl(payC+offs('C'))}</b><small class="sub">Cartão ${brl(payC)} + Fora ${brl(offs('C'))}</small></div>
    <div class="card" style="border-top:3px solid #d9480f"><small>Pedro repassa p/ Cristian</small><b>${brl(repasseP)}</b><small class="sub">Cartão ${brl(payP)} + Fora ${brl(offs('P'))}</small><label class="note" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;margin-top:4px"><input type="checkbox" data-paid="acerto" data-ym="${ym}" ${acOk?'checked':''}><span class="${acOk?'pos':''}">${acOk?'Repasse recebido ✓':'Repasse pendente'}</span></label></div>
  </div></div>
  <div class="row"><div class="panel" style="flex:2;min-width:420px"><h2>Cartão no mês (${vLab})</h2><div class="tw"><table><tr><th class="l">Descrição</th><th class="l">Quem</th><th class="l">Tipo</th><th class="l">Categoria</th><th>Parcela</th><th>Valor</th></tr>
  ${items.map(x=>`<tr><td class="l">${esc(x.desc.slice(0,44))}</td><td class="l"><span class="tag t-${x.quem}">${x.quem}</span></td><td class="l">${TIPOS[x.tipo]}</td><td class="l">${esc(x.cat)}</td><td>${x.sub}</td><td>${num(x.valor)}</td></tr>`).join('')||'<tr><td class="l" colspan="6">Sem lançamentos validados.</td></tr>'}
  <tr class="tot"><td class="l">Total</td><td></td><td></td><td></td><td></td><td>${num(cartao)}</td></tr></table></div></div>
  <div class="panel" style="flex:1;min-width:320px"><h2>Por categoria (${vLab})</h2><div class="tw"><table>${Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<tr><td class="l">${esc(c)}</td><td>${num(v)}</td></tr>`).join('')}</table></div>
  <h2 style="margin-top:14px">Fora do cartão (${vLab}) <span class="note">· ${nPaid}/${offDesp.length} pagas</span></h2><div class="tw"><table><tr><th class="l">Pago</th><th class="l">Item</th><th>Venc.</th><th>Valor</th></tr>${off.map(o=>{const ok=isPaid(ym,o.id);return `<tr style="${ok?'opacity:.65':''}"><td class="l">${o.kind==='receita'?'<span class="pos">✓</span>':`<input type="checkbox" data-paid="${o.id}" data-ym="${ym}" ${ok?'checked':''}>`}</td><td class="l">${esc(o.nome)} <small>(${o.quem})</small></td><td>${o.venc?'dia '+o.venc:'–'}</td><td class="${o.kind==='receita'?'pos':'neg'}">${o.kind==='receita'?'+':'-'}${num(offV(o,ym)*weight(o.quem))}</td></tr>`}).join('')}</table></div></div></div>`;
}

function flow(withPlans=S.settings.includePlans){
  const st=S.settings,base=st.base,p=st.pctCristian/100,n=Math.max(1,diffM(base,endMonth())),r=(st.fgtsRate||0)/100,E=S.extras,rr=(E.reserva?.rend||0)/100;
  let saldo=(st.saldoIni.Cristian||0)+(st.saldoIni.Pedro||0),res=E.reserva?.saldo||0;
  const inv=(E.inv||[]).map(i=>i.saldo||0),fg={Cristian:st.fgts.Cristian.ini,Pedro:st.fgts.Pedro.ini};
  return months(n).map((ym,k)=>{
    const inc={Cristian:0,Pedro:0},card={Cristian:0,Pedro:0},offP={Cristian:0,Pedro:0},offc={};
    const sh=q=>({Cristian:{Cristian:1,Pedro:0},Pedro:{Cristian:0,Pedro:1},Conjunto:{Cristian:p,Pedro:1-p}}[q]);
    S.off.forEach(o=>{if(!offActive(o,ym))return;const w=sh(o.quem);
      ['Cristian','Pedro'].forEach(q=>{const v=offV(o,ym)*w[q];o.kind==='receita'?inc[q]+=v:offP[q]+=v});
      if(o.kind!=='receita'){const c=o.cat||'Outros';offc[c]=(offc[c]||0)+offV(o,ym)}});
    monthItems(ym,withPlans).forEach(i=>{const w=sh(i.quem);card.Cristian+=i.valor*w.Cristian;card.Pedro+=i.valor*w.Pedro});
    ['Cristian','Pedro'].forEach(q=>fg[q]=fg[q]*(1+r)+st.fgts[q].dep);
    let invT=0;
    if(withPlans){
      const inRes=!(E.reserva.meta&&res>=E.reserva.meta)?(E.reserva.aporte||0):0;
      res=res*(1+rr)+inRes;
      if(inRes){const w=sh('Conjunto');offP.Cristian+=inRes*w.Cristian;offP.Pedro+=inRes*w.Pedro;offc['Planos (aportes)']=(offc['Planos (aportes)']||0)+inRes}
      E.inv.forEach((i,j)=>{const on=i.inicio<=ym&&(!i.fim||ym<=i.fim),ap=on?(i.valor||0):0;inv[j]=inv[j]*(1+(i.rend||0)/100)+ap;
        if(ap){const w=sh(i.quem);offP.Cristian+=ap*w.Cristian;offP.Pedro+=ap*w.Pedro;offc['Planos (aportes)']=(offc['Planos (aportes)']||0)+ap}});
      invT=inv.reduce((a,v)=>a+v,0);
      E.saques.forEach(x=>{if(x.mes===ym){const v=Math.min(x.valor,fg[x.quem]||0);fg[x.quem]-=v;if(x.destino==='caixa')inc[x.quem]+=v}});
    }
    const renda=inc.Cristian+inc.Pedro,cartao=card.Cristian+card.Pedro,fora=offP.Cristian+offP.Pedro,sobra=renda-cartao-fora;saldo+=sobra;
    const fgT=fg.Cristian+fg.Pedro,patr=saldo+fgT+(withPlans?res+invT:0);
    return {ym,k,inc,card,offP,offc,renda,cartao,fora,sobra,sobraC:inc.Cristian-card.Cristian-offP.Cristian,sobraP:inc.Pedro-card.Pedro-offP.Pedro,saldo,fg:{...fg},fgT,patr};
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
    <div class="card"><small>Renda Cristian (${lab(f0.ym)})</small><b>${brl(f0.inc.Cristian)}</b><small class="sub">sobra no mês: ${brl(f0.sobraC)}</small></div>
    <div class="card"><small>Renda Pedro (${lab(f0.ym)})</small><b>${brl(f0.inc.Pedro)}</b><small class="sub">sobra no mês: ${brl(f0.sobraP)}</small></div>
    <div class="card ${fl.saldo>=0?'c-pos':'c-neg'}"><small>Saldo em conta (${lab(fl.ym)})</small><b class="${cls(fl.saldo)}">${brl(fl.saldo)}</b><small class="sub">${dSaldo>=0?'+':''}${brl(dSaldo)} no período</small></div>
    <div class="card"><small>FGTS Cristian (${lab(fl.ym)})</small><b>${brl(fl.fg.Cristian)}</b><small class="sub">atual: ${brl(S.settings.fgts.Cristian.ini)} (+${brl(S.settings.fgts.Cristian.dep)}/mês)</small></div>
    <div class="card"><small>FGTS Pedro (${lab(fl.ym)})</small><b>${brl(fl.fg.Pedro)}</b><small class="sub">atual: ${brl(S.settings.fgts.Pedro.ini)} (+${brl(S.settings.fgts.Pedro.dep)}/mês)</small></div>
    <div class="card c-pos"><small>Patrimônio líquido (${lab(fl.ym)})</small><b>${brl(fl.patr)}</b><small class="sub">FGTS total: ${brl(fl.fgT)} (${dFg>=0?'+':''}${brl(dFg)})</small></div>
  </div>
  <div class="panel"><h2>Saldo e FGTS</h2><div class="bar">
   ${['Cristian','Pedro'].map(q=>`<label class="note">Saldo inicial ${q} <input type="number" step="0.01" data-si="${q}" value="${S.settings.saldoIni[q]||0}"></label>`).join('')}</div>
  <div class="bar">${['Cristian','Pedro'].map(q=>`<label class="note">FGTS ${q}: saldo <input type="number" step="0.01" data-fg="${q}.ini" value="${S.settings.fgts[q].ini}"></label><label class="note">depósito/mês <input type="number" step="0.01" data-fg="${q}.dep" value="${S.settings.fgts[q].dep}"></label>`).join('')}
   <label class="note">rendimento <input type="number" step="0.01" data-s="fgtsRate" value="${S.settings.fgtsRate}" style="width:70px">% a.m.</label></div>
  <div class="note">Valem para todos os meses. FGTS = saldo atual + depósito mensal, com rendimento mensal.</div></div>
  <div class="row"><div class="panel"><h2>Entradas por pessoa x saídas</h2><canvas id="cf1"></canvas></div>
  <div class="panel"><h2>Saldo em conta e FGTS acumulado</h2><canvas id="cf2"></canvas></div></div>
  <div class="panel"><h2>Fluxo mensal da família (${lab(f0.ym)} a ${lab(fl.ym)})</h2><div class="tw"><table><tr><th>Mês</th><th>Renda Cristian</th><th>Renda Pedro</th><th>Renda total</th><th>Cartão</th><th>Fora do cartão</th><th>Sobra</th><th>Sobra Cristian</th><th>Sobra Pedro</th><th>Saldo em conta</th><th>FGTS Cristian</th><th>FGTS Pedro</th><th>FGTS total</th><th>Patrimônio</th></tr>
  ${R.map(r=>`<tr><td><a href="#" data-mes="${r.ym}">${lab(r.ym)}</a></td><td>${num(r.inc.Cristian)}</td><td>${num(r.inc.Pedro)}</td><td><b>${num(r.renda)}</b></td><td>${num(r.cartao)}</td><td>${num(r.fora)}</td><td class="${cls(r.sobra)}"><b>${num(r.sobra)}</b></td><td class="${cls(r.sobraC)}">${num(r.sobraC)}</td><td class="${cls(r.sobraP)}">${num(r.sobraP)}</td><td class="${cls(r.saldo)}">${num(r.saldo)}</td><td>${num(r.fg.Cristian)}</td><td>${num(r.fg.Pedro)}</td><td>${num(r.fgT)}</td><td><b>${num(r.patr)}</b></td></tr>`).join('')}</table></div>
  <div class="note">Parte do Conjunto dividida pelo percentual de Premissas. Saldo em conta = saldo inicial + sobras acumuladas. FGTS = saldo atual + depósito mensal, com rendimento mensal.</div></div>
  <div class="panel"><h2>Despesas fora do cartão por categoria</h2><div class="tw"><table><tr><th>Mês</th>${cats.map(c=>`<th>${esc(c)}</th>`).join('')}<th>Total</th></tr>
  ${R.map(r=>`<tr><td>${lab(r.ym)}</td>${cats.map(c=>`<td>${r.offc[c]?num(r.offc[c]):''}</td>`).join('')}<td><b>${num(r.fora)}</b></td></tr>`).join('')}</table></div></div>`;
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
  <div class="note">Compara o gasto do mês (cartão validado + fora do cartão) com o limite que você definir. Deixe em branco para não ter meta. Itens "Estimativa" são as variáveis projetadas.</div>
  <div class="tw"><table><tr><th class="l">Categoria</th><th>Gasto no mês</th><th>Meta mensal</th><th>Uso</th><th class="l" style="width:220px"></th></tr>
  ${cats.map(c=>{const m=M[c],p=m?sp[c]/m*100:0;return `<tr><td class="l">${esc(c)}</td><td>${num(sp[c]||0)}</td><td><input type="number" step="10" data-meta="${esc(c)}" value="${m||''}" placeholder="–"></td><td class="${p>100?'neg':''}">${m?Math.round(p)+'%':''}</td><td class="l">${m?`<div style="background:var(--line);border-radius:6px;height:8px"><div style="width:${Math.min(100,p)}%;height:8px;border-radius:6px;background:${p>100?'var(--neg)':p>80?'#f08c00':'var(--accent)'}"></div></div>`:''}</td></tr>`}).join('')}</table></div></div>`;
}

function plans(){
  const E=S.extras,R=flow(false),st=S.settings,r=(st.fgtsRate||0)/100,rr=(E.reserva.rend||0)/100;
  let res=E.reserva.saldo||0,saldo=(st.saldoIni.Cristian||0)+(st.saldoIni.Pedro||0);
  const inv=E.inv.map(i=>i.saldo||0),fg={Cristian:st.fgts.Cristian.ini,Pedro:st.fgts.Pedro.ini};
  return R.map((b,k)=>{
    const ym=b.ym;let out=0,inRes=0,invT=0,cashIn=0;
    if(!(E.reserva.meta&&res>=E.reserva.meta))inRes=E.reserva.aporte||0;
    res=res*(1+rr)+inRes;out+=inRes;
    E.inv.forEach((i,j)=>{const on=i.inicio<=ym&&(!i.fim||ym<=i.fim);const ap=on?i.valor:0;inv[j]=inv[j]*(1+(i.rend||0)/100)+ap;out+=ap});
    invT=inv.reduce((a,v)=>a+v,0);
    E.compras.forEach(c=>{const n=Math.max(1,c.np||1),d=diffM(c.mes,ym);if(d>=0&&d<n)out+=c.valor/n});
    ['Cristian','Pedro'].forEach(q=>fg[q]=fg[q]*(1+r)+st.fgts[q].dep);
    E.saques.forEach(x=>{if(x.mes===ym){const v=Math.min(x.valor,fg[x.quem]||0);fg[x.quem]-=v;if(x.destino==='caixa')cashIn+=v}});
    const sobra=b.sobra-out+cashIn;saldo+=sobra;const fgT=fg.Cristian+fg.Pedro;
    return {ym,sobra,saldo,res,invT,fgT,fgC:fg.Cristian,fgP:fg.Pedro,patr:saldo+res+invT+fgT,out,base:b};
  });
}
function rPlanos(){
  const E=S.extras,R=plans(),L=R[R.length-1],hit=E.reserva.meta?R.find(r=>r.res>=E.reserva.meta):null;
  const tbl=(l,head,rows)=>`<div class="tw"><table><tr>${head}<th></th></tr>${rows}</table></div><div class="bar" style="margin-top:8px"><button class="b g" data-act="add-x" data-list="${l}">+ Adicionar</button></div>`;
  return `<div class="panel" style="padding:12px 18px"><div class="bar" style="margin:0;justify-content:space-between">
   <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" data-s="includePlans" ${S.settings.includePlans?'checked':''}> <b>Refletir planos nas projeções globais (Visão geral, Visão mensal e Fluxo de caixa)</b></label>
   <span class="note">Quando desmarcado, os planos ficam restritos apenas a esta aba.</span></div></div>
  <div class="cards"><div class="card"><small>Reserva de emergência (${lab(L.ym)})</small><b>${brl(L.res)}</b><small>${E.reserva.meta?(hit?'meta atingida em '+lab(hit.ym):'meta não atingida até '+lab(L.ym)):'sem meta definida'}</small></div>
   <div class="card"><small>Investimentos (${lab(L.ym)})</small><b>${brl(L.invT)}</b></div>
   <div class="card"><small>FGTS após saques</small><b>${brl(L.fgT)}</b></div>
   <div class="card"><small>Saldo em conta ajustado</small><b class="${cls(L.saldo)}">${brl(L.saldo)}</b></div>
   <div class="card"><small>Patrimônio total</small><b>${brl(L.patr)}</b></div></div>
  <div class="panel"><h2>Reserva de emergência</h2><div class="bar">
   <label class="note">Meta (R$) <input type="number" data-res="meta" value="${E.reserva.meta||''}"></label>
   <label class="note">Saldo atual <input type="number" data-res="saldo" value="${E.reserva.saldo||''}"></label>
   <label class="note">Aporte mensal <input type="number" data-res="aporte" value="${E.reserva.aporte||''}"></label>
   <label class="note">Rendimento <input type="number" step="0.01" data-res="rend" value="${E.reserva.rend}" style="width:70px">% a.m.</label></div>
   <div class="note">O aporte para quando a meta é atingida. Sugestão: 6 meses de despesas.</div></div>
  <div class="panel"><h2>Investimentos</h2>${tbl('inv','<th class="l">Nome</th><th class="l">Quem</th><th>Aporte mensal</th><th>Saldo atual</th><th>Rend. % a.m.</th><th class="l">Início</th><th class="l">Fim</th>',E.inv.map(x=>`<tr data-id="${x.id}" data-list="inv">${xin('inv',x,'nome','text',170)}${xsel(x,'quem',{Cristian:'Cristian',Pedro:'Pedro',Conjunto:'Conjunto'})}${xin('inv',x,'valor')}${xin('inv',x,'saldo')}${xin('inv',x,'rend',undefined,70)}${xin('inv',x,'inicio','month',122)}${xin('inv',x,'fim','month',122)}<td><button class="b r" data-act="del-x">×</button></td></tr>`).join(''))}</div>
  <div class="panel"><h2>Saques do FGTS</h2>${tbl('saques','<th class="l">Descrição</th><th class="l">Quem</th><th class="l">Mês</th><th>Valor</th><th class="l">Destino</th>',E.saques.map(x=>`<tr data-id="${x.id}" data-list="saques">${xin('saques',x,'nome','text',170)}${xsel(x,'quem',{Cristian:'Cristian',Pedro:'Pedro'})}${xin('saques',x,'mes','month',122)}${xin('saques',x,'valor')}${xsel(x,'destino',{caixa:'Entra no saldo em conta',externo:'Uso direto (imóvel/financiamento)'})}<td><button class="b r" data-act="del-x">×</button></td></tr>`).join(''))}</div>
  <div class="panel"><h2>Compras planejadas</h2>${tbl('compras','<th class="l">Descrição</th><th class="l">Quem</th><th class="l">1º mês</th><th>Valor total</th><th>Parcelas</th>',E.compras.map(x=>`<tr data-id="${x.id}" data-list="compras">${xin('compras',x,'nome','text',170)}${xsel(x,'quem',{Cristian:'Cristian',Pedro:'Pedro',Conjunto:'Conjunto'})}${xin('compras',x,'mes','month',122)}${xin('compras',x,'valor')}${xin('compras',x,'np',undefined,60,'1')}<td><button class="b r" data-act="del-x">×</button></td></tr>`).join(''))}<div class="note">Viagem, móveis, reforma etc. Com parcelas, o valor é dividido entre os meses.</div></div>
  <div class="panel"><h2>Patrimônio com os planos</h2><canvas id="cp"></canvas>
  <div class="tw" style="margin-top:10px"><table><tr><th>Mês</th><th>Sobra ajustada</th><th>Saldo em conta</th><th>Reserva</th><th>Investimentos</th><th>FGTS</th><th>Patrimônio</th></tr>
  ${R.map(r=>`<tr><td>${lab(r.ym)}</td><td class="${cls(r.sobra)}">${num(r.sobra)}</td><td class="${cls(r.saldo)}">${num(r.saldo)}</td><td>${num(r.res)}</td><td>${num(r.invT)}</td><td>${num(r.fgT)}</td><td><b>${num(r.patr)}</b></td></tr>`).join('')}</table></div></div>`;
}
function drawPlanos(){
  const R=plans(),c=document.getElementById('cp');if(!c)return;
  charts.push(new Chart(c,{type:'line',data:{labels:R.map(r=>lab(r.ym)),datasets:[
    {label:'Saldo em conta',data:R.map(r=>r.saldo),borderColor:'#0e6b7c',pointRadius:0,tension:.2},
    {label:'Reserva',data:R.map(r=>r.res),borderColor:'#f08c00',pointRadius:0,tension:.2},
    {label:'Investimentos',data:R.map(r=>r.invT),borderColor:'#9775fa',pointRadius:0,tension:.2},
    {label:'FGTS',data:R.map(r=>r.fgT),borderColor:'#2b8a3e',pointRadius:0,tension:.2},
    {label:'Patrimônio',data:R.map(r=>r.patr),borderColor:'#16181d',borderDash:[5,4],pointRadius:0,tension:.2}]},
    options:{plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.parsed.y)}}}}}));
}

function scenario(){
  const c=S.extras.cen,bak=S;let R;
  S=structuredClone(bak);
  try{
    S.off.forEach(o=>{if(o.kind==='receita')o.valor*=1+(c.rendaPct||0)/100;else if((o.cat||'')==='Moradia')o.valor*=1+(c.moradiaPct||0)/100});
    PEOPLE.forEach(q=>S.settings.varAmt[q]*=1+(c.varPct||0)/100);
    if(c.quitarId&&c.quitarMes){const o=S.off.find(x=>String(x.id)===String(c.quitarId));if(o){o.fim=addM(c.quitarMes,-1);o.np=0}}
    if(c.extra)S.off.push({id:1,nome:'Despesa extra',quem:'Conjunto',kind:'despesa',valor:c.extra,inicio:c.extraDe||S.settings.base,fim:null,cat:'Cenário',freq:'mensal'});
    R=flow();
  }finally{S=bak}
  return R;
}
function rCen(){
  const c=S.extras.cen,B=flow(),Sc=scenario(),b=B[B.length-1],s=Sc[Sc.length-1],Ms=allMonths();
  const avg=R=>R.reduce((a,r)=>a+r.sobra,0)/R.length;
  const dl=(v)=>`<small class="${v<0?'neg':'pos'}">${v>=0?'+':''}${brl(v)}</small>`;
  const rows=[['Simulação de renda (%)','rendaPct'],['Moradia reajustada em (%)','moradiaPct'],['Variáveis do cartão (%)','varPct'],['Despesa extra mensal (R$)','extra']];
  return `<div class="note" style="margin-bottom:12px">Simulador: compara o cenário com a base sem alterar seus dados reais.</div>
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
  const B=flow(),Sc=scenario(),c=document.getElementById('cc');if(!c)return;
  charts.push(new Chart(c,{type:'line',data:{labels:B.map(r=>lab(r.ym)),datasets:[
    {label:'Base',data:B.map(r=>r.saldo),borderColor:'#80868f',pointRadius:0,tension:.2},
    {label:'Cenário',data:Sc.map(r=>r.saldo),borderColor:'#0e6b7c',borderWidth:3,pointRadius:0,tension:.2}]},
    options:{plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.parsed.y)}}}}}));
}

function rCartao(){
  const Ms=months();
  const groups=['parcelas','fixas','assinaturas'];
  const sections=groups.map(g=>{
    const items=S.tx.filter(x=>GROUP[x.tipo]===g&&live(x)).map(x=>({x,vals:Ms.map((_,k)=>txAmount(x,k)*weight(x.quem))})).filter(i=>i.vals.some(v=>v));
    items.sort((a,b)=>b.vals[1]-a.vals[1]||b.vals[0]-a.vals[0]);
    const tot=Ms.map((_,k)=>items.reduce((a,i)=>a+i.vals[k],0));
    return `<tr class="sec"><td colspan="${Ms.length+3}">${GLAB[g]}</td></tr>`+
      items.map(i=>`<tr><td class="l">${esc(i.x.desc.slice(0,42))}${i.x.tipo==='parcelada'?` <small>(${i.x.cur}/${i.x.tot})</small>`:''}</td><td class="l"><span class="tag t-${i.x.quem}">${i.x.quem}</span></td><td class="l">${i.x.fim?lab(i.x.fim):''}</td>${i.vals.map(v=>`<td>${v?num(v):''}</td>`).join('')}</tr>`).join('')+
      `<tr class="tot"><td class="l">Total ${GLAB[g]}</td><td></td><td></td>${tot.map(v=>`<td>${num(v)}</td>`).join('')}</tr>`;
  }).join('');
  const comp=Ms.map((_,k)=>S.tx.reduce((a,x)=>a+txAmount(x,k)*weight(x.quem),0));
  const vr=PEOPLE.map(q=>({q,vals:Ms.map((_,k)=>varAt(q,k)*weight(q))})).filter(r=>r.vals.some(v=>v));
  const vt=Ms.map((_,k)=>vr.reduce((a,r)=>a+r.vals[k],0));
  const s=S.settings,varPanel=`<div class="panel"><h2>Variáveis estimadas por mês</h2><div class="bar">
   ${PEOPLE.map(q=>`<label class="note">${q} <input type="number" step="0.01" data-v="${q}" value="${s.varAmt[q]||0}"></label>`).join('')}
   <label class="note"><input type="checkbox" data-s="includeVar" ${s.includeVar?'checked':''}> incluir nos totais</label>
   <button class="b g" data-act="var-avg">Média dos últimos 3 meses</button><button class="b g" data-act="var-from-tx">Usar fatura atual</button></div>
   <div class="note">Gastos do cartão sem repetição garantida (mercado, restaurantes, combustível...). Valem para todos os meses projetados.</div></div>`;
  return varPanel+`<div class="panel"><h2>Cartão – visão: ${esc(document.getElementById('view').selectedOptions[0].text)}</h2>
  <div class="note">Parcelas, despesas fixas e assinaturas são valores já assumidos. Variáveis são estimativa (Premissas). Mês fechado (${lab(Ms[0])}) mostra a fatura real.</div>
  <div class="tw"><table><tr><th class="l">Item</th><th class="l">Quem</th><th class="l">Até</th>${Ms.map(m=>`<th>${lab(m)}</th>`).join('')}</tr>
  ${sections}
  <tr class="tot"><td class="l">COMPROMETIDO NO CARTÃO</td><td></td><td></td>${comp.map(v=>`<td>${num(v)}</td>`).join('')}</tr>
  <tr class="sec"><td colspan="${Ms.length+3}">Variáveis (estimativa; mês fechado = real)</td></tr>
  ${vr.map(r=>`<tr><td class="l">Variáveis ${r.q}</td><td class="l"><span class="tag t-${r.q}">${r.q}</span></td><td></td>${r.vals.map(v=>`<td>${num(v)}</td>`).join('')}</tr>`).join('')}
  <tr class="tot"><td class="l">TOTAL DO CARTÃO (com variáveis)</td><td></td><td></td>${comp.map((v,k)=>`<td>${num(v+vt[k])}</td>`).join('')}</tr>
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
  const byTipo={};rows.filter(x=>x.ativo&&x.tipo!=='ignorar').forEach(x=>byTipo[x.tipo]=(byTipo[x.tipo]||0)+x.valor);
  const allChecked=rows.length>0&&rows.every(x=>SEL.has(x.id));
  return `<div class="panel"><h2>Lançamentos da fatura</h2>
  <div class="bar">
    <input id="ftxt" placeholder="Buscar descrição" value="${esc(F.txt)}">
    <select id="fquem"><option value="">Todos</option>${quemOpts(F.quem)}</select>
    <select id="ffat"><option value="all" ${fsel==='all'?'selected':''}>Todas as faturas</option>${fats.map(f=>`<option value="${f}" ${f===fsel?'selected':''}>${lab(f)}</option>`).join('')}</select>
    <label><input type="checkbox" id="frev" ${F.rev?'checked':''}> só pendentes</label>
    <select id="ftipo"><option value="">Todos os tipos</option>${opts(TIPOS,F.tipo)}</select>
    <button class="b" data-act="add-tx">+ Lançamento</button>
    <span class="note">${rows.length} itens · total ativo ${brl(tot)} · ${Object.entries(byTipo).map(([t,v])=>TIPOS[t]+': '+brl(v)).join(' · ')}</span>
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
  <div class="note">Dica: selecione múltiplos itens na 1ª coluna para alterar Quem, Tipo, Categoria ou excluir em lote. Itens "Ignorar" não entram em nenhuma conta.</div></div>`;
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
  const row=(o,isRec)=>{const[t,bg,fg]=st(o),ok=isPaid(ref,o.id),active=act(o);return `<tr data-id="${o.id}" style="${t==='encerrado'?'opacity:.55':''}">
   <td class="l"><input class="d" data-f="nome" value="${esc(o.nome)}"></td>
   ${isRec?'':`<td class="l">${active?`<input type="checkbox" data-paid="${o.id}" data-ym="${ref}" ${ok?'checked':''} title="Marcar como pago em ${lab(ref)}">`:'–'}</td>`}
   <td class="l"><select data-f="quem">${quemOpts(o.quem)}</select></td>
   <td><input type="number" step="0.01" data-f="valor" value="${o.valor}"></td>
   <td><input type="number" min="1" max="31" data-f="venc" value="${o.venc||''}" placeholder="dia" style="width:54px"></td>
   <td class="l"><select data-f="freq"><option value="mensal" ${o.freq!=='anual'?'selected':''}>Mensal</option><option value="anual" ${o.freq==='anual'?'selected':''}>Anual</option></select></td>
   <td class="l"><input type="month" data-f="inicio" value="${o.inicio}"></td>
   <td class="l"><input type="month" data-f="fim" value="${o.fim||''}"></td>
   <td><input type="number" data-f="np" value="${o.np||''}" placeholder="–" style="width:56px"></td>
   <td><input type="number" step="0.1" data-f="reaj" value="${o.reaj||''}" placeholder="0" style="width:60px"></td>
   <td><span class="tag" style="background:${bg};color:${fg}">${t}</span></td>
   <td><button class="b r" data-act="del-off">×</button></td></tr>`};
  const group=(title,list,cat,kind)=>{const isRec=kind==='receita',sorted=[...list].sort((a,b)=>(a.venc||99)-(b.venc||99));return `<div class="panel"><div class="bar" style="justify-content:space-between"><h2 style="margin:0">${esc(title)} <span class="note">· ${brl(tot(list))} em ${lab(ref)}</span></h2>
   <button class="b g" data-act="add-off" data-cat="${esc(cat)}" data-kind="${kind}" ${isRec?'data-quem="Cristian"':''}>+ Adicionar</button></div>
   ${sorted.length?`<div class="tw"><table><tr><th class="l">Nome</th>${isRec?'':'<th class="l">Pago</th>'}<th class="l">Quem</th><th>Valor</th><th>Venc.</th><th class="l">Frequência</th><th class="l">Início</th><th class="l">Fim</th><th>Parcelas</th><th>Reajuste % a.a.</th><th></th><th></th></tr>${sorted.map(o=>row(o,isRec)).join('')}</table></div>`:'<div class="note">Nenhum item.</div>'}</div>`};
  return `<div class="bar"><b>Mês de referência</b><select id="fom">${Ms.map(m=>`<option value="${m}" ${m===ref?'selected':''}>${lab(m)}</option>`).join('')}</select>
   <button class="b g" data-act="add-cat">+ Nova categoria</button></div>
  <div class="cards"><div class="card c-pos"><small>Renda no mês</small><b>${brl(renda)}</b><span class="sub">${lab(ref)}</span></div>
   <div class="card"><small>Despesas fora do cartão</small><b>${brl(fora)}</b><span class="sub">${renda?Math.round(fora/renda*100):0}% da renda</span></div>
   <div class="card ${paidDes.length===actDes.length&&actDes.length?'c-pos':'c-warn'}"><small>Contas pagas (${lab(ref)})</small><b>${paidDes.length}/${actDes.length}</b><span class="sub">${brl(pagoVal)} pagos · faltam ${brl(Math.max(0,fora-pagoVal))}</span></div>
   <div class="card ${renda-fora>=0?'c-pos':'c-neg'}"><small>Sobra antes do cartão</small><b class="${cls(renda-fora)}">${brl(renda-fora)}</b><span class="sub">Disponível p/ cartão e caixa</span></div></div>
  <div class="note">Marque "Pago" para controlar as contas quitadas em ${lab(ref)}. Informe "Venc." (dia 1–31) para ordenar por vencimento. Preencha "Parcelas" para calcular o fim automaticamente, e "Reajuste" para corrigir a cada 12 meses.</div>
  ${group('Rendas',rec,'Renda','receita')}
  ${cats.map(c=>({c,l:des.filter(o=>(o.cat||'Outros')===c)})).filter(g=>g.l.length||OCATS.includes(g.c)).map(g=>group(g.c,g.l,g.c,'despesa')).join('')}`;
}
function rPrem(){
  const s=S.settings,snaps=loadSnaps(),fd=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  return `<div class="panel"><h2>Premissas gerais</h2><div class="grid2">
   <label>Mês da fatura atual (base)</label><input type="month" data-s="base" value="${s.base}">
   <label>Meses projetados no Cartão</label><input type="number" data-s="horizon" value="${s.horizon}" min="1" max="36">
  </div>
  <div class="note">No Fluxo de caixa, Visão Geral e Visão Mensal, o horizonte padrão acompanha sempre <b>dezembro do ano seguinte ao mês base</b> (${lab(nextYearDec())}), podendo ser ajustado no seletor "Projetar até" do topo da aba.</div></div>
  <div class="panel"><h2>Atalhos de teclado</h2>
   <div class="note">• <code>Alt + N</code>: Abrir modal de novo lançamento rápido<br>• <code>Alt + T</code>: Alternar entre modo claro e modo escuro<br>• <code>Esc</code>: Fechar modal rápido ou limpar seleção em lote</div></div>
  <div class="panel"><h2>Dados e backups</h2><div class="bar">
   <button class="b g" data-act="export-json">Exportar backup (json)</button>
   <label class="b g">Importar backup<input type="file" accept=".json" id="impj" hidden></label>
   <button class="b" data-act="add-snap">+ Criar ponto de restauração</button>
   <button class="b r" data-act="reset">Restaurar dados originais</button></div>
   <div class="note">Os dados ficam salvos no Supabase e neste navegador.</div></div>
  <div class="panel"><h2>Pontos de restauração automáticos (últimos 5)</h2>
   <div class="note">Criados automaticamente antes de importar faturas, importar backups ou restaurar dados.</div>
   ${snaps.length?`<div class="tw" style="margin-top:8px"><table><tr><th class="l">Data/Hora</th><th class="l">Motivo</th><th class="l">Por</th><th>Lançamentos</th><th>Fora do cartão</th><th></th></tr>
   ${snaps.map(sn=>`<tr data-snap="${sn.id}"><td class="l">${fd(sn.at)}</td><td class="l"><b>${esc(sn.motivo)}</b></td><td class="l">${esc(sn.by||'Local')}</td><td>${sn.txCount}</td><td>${sn.offCount}</td>
   <td><button class="b g" data-act="restore-snap">Restaurar</button> <button class="b r" data-act="del-snap" title="Excluir ponto">×</button></td></tr>`).join('')}</table></div>`:'<div class="note" style="margin-top:8px">Nenhum ponto de restauração salvo ainda.</div>'}</div>`;
}
function rendaPct(ym=S.settings.base){
  let c=0,p=0;
  S.off.forEach(o=>{if(o.kind==='receita'&&offActive(o,ym)){const v=offV(o,ym);if(o.quem==='Cristian')c+=v;else if(o.quem==='Pedro')p+=v;else{c+=v/2;p+=v/2}}});
  return c+p>0?+(c/(c+p)*100).toFixed(1):50;
}
const pctBox=(ym=S.settings.base)=>{
  const rp=rendaPct(ym);
  return `<label class="note">Cristian paga <input type="number" step="0.1" data-s="pctCristian" value="${S.settings.pctCristian}" min="0" max="100" style="width:68px">% do Conjunto (Pedro ${+(100-S.settings.pctCristian).toFixed(1)}%)</label>
  ${S.settings.pctCristian!==rp?`<button class="b g" data-act="pct-renda" data-ym="${ym}" style="padding:4px 9px;font-size:12px">Proporcional à renda (${rp}% / ${+(100-rp).toFixed(1)}%)</button>`:''}
  ${S.settings.pctCristian!==50?`<button class="b g" data-act="pct-50" style="padding:4px 9px;font-size:12px">50 / 50</button>`:''}`;
};

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
    setPaid(el.dataset.ym||S.settings.base,el.dataset.paid,el.checked);saveRender();
  }));
  m.querySelectorAll('[data-s]').forEach(el=>el.addEventListener('change',()=>{
    const f=el.dataset.s;S.settings[f]=el.type==='checkbox'?el.checked:(el.type==='number'?+el.value:el.value);saveRender();
  }));
  m.querySelectorAll('[data-fg]').forEach(el=>el.addEventListener('change',()=>{const[q,f]=el.dataset.fg.split('.');S.settings.fgts[q][f]=+el.value||0;saveRender()}));
  m.querySelectorAll('[data-meta]').forEach(el=>el.addEventListener('change',()=>{const v=+el.value||0;v?S.extras.metas[el.dataset.meta]=v:delete S.extras.metas[el.dataset.meta];saveRender()}));
  m.querySelectorAll('[data-res]').forEach(el=>el.addEventListener('change',()=>{S.extras.reserva[el.dataset.res]=+el.value||0;saveRender()}));
  m.querySelectorAll('[data-cen]').forEach(el=>el.addEventListener('change',()=>{const f=el.dataset.cen;S.extras.cen[f]=el.type==='number'?(+el.value||0):el.value;saveRender()}));
  m.querySelectorAll('[data-v]').forEach(el=>el.addEventListener('change',()=>{S.settings.varAmt[el.dataset.v]=+el.value;saveRender()}));
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
  const rdet=m.querySelector('#rdet');if(rdet)rdet.addEventListener('toggle',()=>{rulesOpen=rdet.open});
  m.querySelectorAll('[data-mes]').forEach(el=>el.addEventListener('click',ev=>{ev.preventDefault();MS=el.dataset.mes;tab='mes';render()}));
  const ms=m.querySelector('#msel');if(ms)ms.addEventListener('change',()=>{MS=ms.value;render()});
  const cr=m.querySelector('#cenreset');if(cr)cr.addEventListener('click',()=>{S.extras.cen={moradiaPct:0,rendaPct:0,varPct:0,extra:0,extraDe:'',quitarId:'',quitarMes:''};save();render()});
  const ij=m.querySelector('#impj');if(ij)ij.addEventListener('change',()=>ij.files[0].text().then(t=>{saveSnap('Antes de importar backup JSON');S=mig(JSON.parse(t));save();render()}));
}
function act(el){
  const a=el.dataset.act,id=+(el.closest('tr')?.dataset.id||0),snapId=+(el.closest('tr')?.dataset.snap||0);
  if(a==='del-tx'){S.tx=S.tx.filter(x=>x.id!==id);SEL.delete(id)}
  else if(a==='del-off'){S.off=S.off.filter(x=>x.id!==id)}
  else if(a==='del-rule'){delete S.rules[el.closest('tr').dataset.rule]}
  else if(a==='batch-cat'){const c=document.getElementById('bcat')?.value.trim();if(!c)return;S.tx.forEach(x=>{if(SEL.has(x.id)){x.cat=c;if(!x.rev)remember(x,'cat')}})}
  else if(a==='batch-ok'){S.tx.forEach(x=>{if(SEL.has(x.id)){x.rev=false;remember(x)}});SEL.clear()}
  else if(a==='batch-del'){if(!confirm(`Excluir ${SEL.size} lançamento(s) selecionado(s)?`))return;S.tx=S.tx.filter(x=>!SEL.has(x.id));SEL.clear()}
  else if(a==='batch-clear'){SEL.clear();render();return}
  else if(a==='pct-renda'){S.settings.pctCristian=rendaPct(el.dataset.ym||S.settings.base)}
  else if(a==='pct-50'){S.settings.pctCristian=50}
  else if(a==='add-tx'){S.tx.push({id:Date.now(),data:new Date().toISOString().slice(0,10),desc:'Novo lançamento',cur:null,tot:null,valor:0,tipo:'variavel',cat:'Sem categoria',quem:'Cristian',cartao:'',fim:null,ativo:true,fatura:S.settings.base,rev:false})}
  else if(a==='add-x'){const l=el.dataset.list,b=S.settings.base,def={inv:{nome:'Novo investimento',quem:'Conjunto',valor:0,saldo:0,rend:0.8,inicio:b,fim:null},saques:{quem:'Cristian',mes:b,valor:0,destino:'caixa',nome:'Saque FGTS'},compras:{nome:'Nova compra',quem:'Conjunto',mes:b,valor:0,np:1}}[l];S.extras[l].push({id:Date.now(),...def})}
  else if(a==='del-x'){const l=el.closest('tr').dataset.list;S.extras[l]=S.extras[l].filter(x=>x.id!==id)}
  else if(a==='add-cat'){const n=prompt('Nome da nova categoria:');if(!n)return;S.off.push({id:Date.now(),nome:'Novo item',quem:'Conjunto',kind:'despesa',valor:0,inicio:S.settings.base,fim:null,cat:n.trim(),freq:'mensal'})}
  else if(a==='add-off'){const d=el.dataset;S.off.push({id:Date.now(),nome:d.nome||'Novo item',quem:d.quem||'Conjunto',kind:d.kind||'despesa',valor:0,inicio:S.settings.base,fim:null,cat:d.cat||'',freq:d.freq||'mensal'})}
  else if(a==='var-from-tx'){PEOPLE.forEach(q=>S.settings.varAmt[q]=+varAt(q,0).toFixed(2))}
  else if(a==='var-avg'){varAvg()}
  else if(a==='imp-merge'){if(!confirmImport('merge'))return}
  else if(a==='imp-replace'){if(!confirmImport('replace'))return}
  else if(a==='imp-cancel'){IMP=null}
  else if(a==='ok-tx'){const o=S.tx.find(x=>x.id===id);o.rev=false;SEL.delete(id);remember(o)}
  else if(a==='ok-all'){S.tx.filter(x=>x.rev).forEach(x=>{x.rev=false;SEL.delete(x.id);remember(x)})}
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
  const R=compute(),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Mês','Renda','Parcelas','Fixas','Assinaturas','Comprometido no cartão','Variáveis (est.)','Fora do cartão','Total despesas','Sobra','Saldo'],
   ...R.map(r=>[r.ym,r.renda,r.g.parcelas,r.g.fixas,r.g.assinaturas,r.comprometido,r.g.variaveis,r.fora,r.total,r.sobra,r.saldo].map(v=>typeof v==='number'?+v.toFixed(2):v))]),'Projeção');
  const Ms=months();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Descrição','Tipo','Quem',...Ms],
   ...S.tx.filter(x=>x.ativo&&!['variavel','ignorar'].includes(x.tipo)).map(x=>[x.desc,TIPOS[x.tipo],x.quem,...Ms.map((_,k)=>+(txAmount(x,k)*weight(x.quem)).toFixed(2))])]),'Cartão comprometido');
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
  x.tipo=x.tot?'parcelada':(r.tipo==='parcelada'?'variavel':r.tipo);
  if(forceQuem||!x.portador)x.quem=r.quem;
  x.cat=r.cat;x.fim=r.fim||null;
}
function remember(o,changedField){
  const k=key(o.desc);if(!k)return;
  S.rules[k]={tipo:o.tipo,quem:o.quem,cat:o.cat,fim:o.fim||null,exemplo:o.desc};
  S.tx.forEach(y=>{if(y.rev&&y!==o&&key(y.desc)===k)applyRule(y,S.rules[k],changedField==='quem')});
}
function split(fat){
  const p=S.settings.pctCristian/100,s={Cristian:0,Pedro:0,Conjunto:0};
  S.tx.forEach(x=>{if(x.fatura===fat&&live(x))s[x.quem]=(s[x.quem]||0)+x.valor});
  return {...s,total:s.Cristian+s.Pedro+s.Conjunto,payC:s.Cristian+s.Conjunto*p,payP:s.Pedro+s.Conjunto*(1-p)};
}
function varAvg(){
  const fats=[...new Set(S.tx.map(x=>x.fatura))].filter(f=>f<=S.settings.base).sort().slice(-3);
  PEOPLE.forEach(q=>S.settings.varAmt[q]=+(fats.reduce((a,f)=>a+S.tx.filter(x=>x.fatura===f&&live(x)&&x.tipo==='variavel'&&x.quem===q).reduce((b,x)=>b+x.valor,0),0)/(fats.length||1)).toFixed(2));
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
      const nomeRaw=String(get(r,'nome')??get(r,'portador')??get(r,'titular')??get(r,'nome no cartao')??'').trim();
      const cartaoRaw=String(get(r,'numero do cartao')??get(r,'final do cartao')??get(r,'cartao')??'').trim();
      const tipoRaw=norm(get(r,'tipo de despesa')),parc=get(r,'parcelamento');
      let fTipo=TPMAP[tipoRaw]||null,fFim=null;
      const mf=tipoRaw.match(/fixa ate (\w+) de (\d{4})/);if(mf){fTipo='fixa';fFim=ym2(mf[2],MESES[mf[1]]||1)}
      const pessoa=/pedro/i.test(nomeRaw)?'Pedro':/cristian/i.test(nomeRaw)?'Cristian':/conjunto/i.test(nomeRaw)?'Conjunto':null;
      const fCat=get(r,'categoria')?capital(get(r,'categoria')):null;
      const mp=parc&&String(parc).match(/(\d+)\s*de\s*(\d+)/);
      const ru=S.rules[key(desc)]||null;
      const x={id:0,data,desc:String(desc).replace(/\s+/g,' ').trim(),cur:mp?+mp[1]:null,tot:mp?+mp[2]:null,valor:+v.toFixed(2),
        quem:pessoa||ru?.quem||'Conjunto',cat:fCat||ru?.cat||'Sem categoria',fim:fFim||(ru&&!fTipo?ru.fim:null)||null,
        portador:nomeRaw,cartao:cartaoRaw,ativo:true,rev:true,sug:!!ru||!!pessoa};
      let t=fTipo||ru?.tipo||'variavel';
      if(mp)t='parcelada';else if(t==='parcelada')t='variavel';
      if(/quintoandar/i.test(desc))t='ignorar';
      x.tipo=t;tx.push(x);
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
  IMP=null;return true;
}

function rImp(){
  const rev=S.tx.filter(x=>x.rev).sort((a,b)=>b.fatura.localeCompare(a.fatura)||b.data.localeCompare(a.data));
  const cats=[...new Set(S.tx.map(x=>x.cat))].sort();
  const allChecked=rev.length>0&&rev.every(x=>SEL.has(x.id));
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
  const rulesList=Object.entries(S.rules).filter(([k,r])=>!F.rtxt||k.includes(norm(F.rtxt))||norm(r.exemplo||'').includes(norm(F.rtxt))||norm(r.cat||'').includes(norm(F.rtxt))).sort((a,b)=>(a[1].exemplo||a[0]).localeCompare(b[1].exemplo||b[0]));
  return `<div class="panel" id="dropzone"><h2>1. Importar fatura do Itaú</h2>
  <div class="note">Baixe a planilha da fatura no app do Itaú e envie (ou arraste) aqui. O app importa automaticamente o <b>Nome do portador</b> da planilha e sugere categoria/tipo a partir de <b>${Object.keys(S.rules).length}</b> estabelecimentos memorizados. Nada entra nos cálculos até você revisar e validar (✓).</div>
  <div class="bar"><label class="b">Escolher arquivo (xlsx)<input type="file" accept=".xlsx,.xls" id="impx" hidden></label><span class="note">ou solte o arquivo .xlsx aqui</span></div></div>
  ${pre}
  <div class="panel"><h2>2. Revisar lançamentos (${rev.length})</h2>
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
  <div class="panel"><details id="rdet" ${rulesOpen?'open':''}><summary style="cursor:pointer;font-weight:600;color:var(--petrol-dark)">3. Regras de estabelecimentos memorizados (${Object.keys(S.rules).length})</summary>
  <div class="note" style="margin-top:8px">Prefixos de maquininhas/apps (IFD*, UBER*, MP*, PAG*) são limpos automaticamente. Edite ou exclua qualquer regra abaixo.</div>
  <div class="bar"><input id="frtxt" placeholder="Buscar estabelecimento ou categoria" value="${esc(F.rtxt)}" style="width:260px"><span class="note">${rulesList.length} regra(s) exibida(s)</span></div>
  <div class="tw" style="max-height:45vh"><table><tr><th class="l">Chave</th><th class="l">Exemplo de descrição</th><th class="l">Tipo padrão</th><th class="l">Categoria</th><th class="l">Quem (se s/ portador)</th><th class="l">Até (mês)</th><th></th></tr>
  ${rulesList.map(([k,r])=>`<tr data-rule="${esc(k)}"><td class="l"><code>${esc(k)}</code></td><td class="l">${esc(r.exemplo||k)}</td>
   <td class="l"><select data-rf="tipo">${opts(TIPOS,r.tipo)}</select></td>
   <td class="l"><input list="cats" data-rf="cat" value="${esc(r.cat||'')}"></td>
   <td class="l"><select data-rf="quem">${quemOpts(r.quem)}</select></td>
   <td class="l">${['fixa','assinatura_mensal','assinatura_anual'].includes(r.tipo)?`<input type="month" data-rf="fim" value="${r.fim||''}">`:''}</td>
   <td><button class="b r" data-act="del-rule" title="Excluir regra">×</button></td></tr>`).join('')}
  </table></div></details></div>`;
}

function rHist(){
  const fats=[...new Set(S.tx.map(x=>x.fatura))].sort(),sel=fats.includes(F.hf)?F.hf:S.settings.base;
  const grp=f=>{const g={parcelas:0,fixas:0,assinaturas:0,variaveis:0};S.tx.forEach(x=>{if(x.fatura===f&&live(x))g[GROUP[x.tipo]]+=x.valor});return g};
  const cat={};S.tx.filter(x=>x.fatura===sel&&live(x)).forEach(x=>{const c=cat[x.cat]=cat[x.cat]||{Cristian:0,Pedro:0,Conjunto:0,t:0};c[x.quem]=(c[x.quem]||0)+x.valor;c.t+=x.valor});
  const catRows=Object.entries(cat).sort((a,b)=>b[1].t-a[1].t);
  return `<div class="panel"><h2>Histórico por fatura</h2><div class="bar">${pctBox()}</div><div class="row" style="margin-bottom:10px"><div style="flex:1;min-width:420px"><canvas id="c3"></canvas></div></div>
  <div class="tw"><table><tr><th class="l">Fatura</th><th>Total</th><th>Cristian</th><th>Pedro</th><th>Conjunto</th><th>Cristian paga</th><th>Pedro paga</th><th>Parcelas</th><th>Fixas</th><th>Assinaturas</th><th>Variáveis</th></tr>
  ${fats.map(f=>{const s=split(f),g=grp(f);return `<tr><td class="l">${lab(f)}</td><td><b>${num(s.total)}</b></td><td>${num(s.Cristian)}</td><td>${num(s.Pedro)}</td><td>${num(s.Conjunto)}</td><td><b>${num(s.payC)}</b></td><td><b>${num(s.payP)}</b></td><td>${num(g.parcelas)}</td><td>${num(g.fixas)}</td><td>${num(g.assinaturas)}</td><td>${num(g.variaveis)}</td></tr>`}).join('')}
  </table></div><div class="note">"Paga" = lançamentos próprios + parte do Conjunto (${S.settings.pctCristian}% Cristian). Itens "Ignorar" ficam de fora.</div></div>
  <div class="panel"><h2>Gastos por categoria</h2><div class="bar"><select id="fhf">${fats.map(f=>`<option value="${f}" ${f===sel?'selected':''}>${lab(f)}</option>`).join('')}</select></div>
  <div class="tw"><table><tr><th class="l">Categoria</th><th>Cristian</th><th>Pedro</th><th>Conjunto</th><th>Total</th></tr>
  ${catRows.map(([c,v])=>`<tr><td class="l">${esc(c)}</td><td>${num(v.Cristian)}</td><td>${num(v.Pedro)}</td><td>${num(v.Conjunto)}</td><td><b>${num(v.t)}</b></td></tr>`).join('')}</table></div></div>`;
}
function drawHist(){
  const fats=[...new Set(S.tx.map(x=>x.fatura))].sort(),col={Cristian:'#0e6b7c',Pedro:'#c55a11',Conjunto:'#548235'};
  charts.push(new Chart(document.getElementById('c3'),{type:'bar',data:{labels:fats.map(lab),datasets:PEOPLE.map(q=>({label:q,data:fats.map(f=>split(f)[q]),backgroundColor:col[q]}))},
    options:{scales:{x:{stacked:true},y:{stacked:true}},plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+brl(c.parsed.y)}}}}}));
}

document.getElementById('view').addEventListener('change',e=>{view=e.target.value;render()});
document.getElementById('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;SEL.clear();render()}});
document.getElementById('theme-btn')?.addEventListener('click',()=>{
  applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  render();
});
window.addEventListener('keydown',e=>{
  if(e.altKey&&e.key.toLowerCase()==='n'){e.preventDefault();openQuickAdd(tab==='fora'?'fora':'cartao')}
  else if(e.altKey&&e.key.toLowerCase()==='t'){e.preventDefault();applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');render()}
  else if(e.key==='Escape'){
    const qm=document.getElementById('qmodal');
    if(qm&&!qm.hidden){qm.hidden=true}
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
      </div>
    </div>
    <datalist id="qmcats">${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</datalist>
    ${mode==='cartao'?`<div class="qgrid">
      <label>Descrição</label><input id="qd" placeholder="Ex.: Mercado, iFood, Farmácia">
      <label>Valor (R$)</label><input id="qv" type="number" step="0.01" placeholder="0,00">
      <label>Quem</label><select id="qq">${quemOpts(defQuem)}</select>
      <label>Tipo</label><select id="qt">${opts(TIPOS,'variavel')}</select>
      <label>Parcelas</label><input id="qp" type="number" min="1" max="48" value="1">
      <label>Categoria</label><input id="qcat" list="qmcats" value="Sem categoria">
      <label>Fatura</label><input id="qfat" type="month" value="${S.settings.base}">
    </div>`:`<div class="qgrid">
      <label>Nome</label><input id="qd" placeholder="Ex.: Condomínio, Luz, Pix">
      <label>Valor (R$)</label><input id="qv" type="number" step="0.01" placeholder="0,00">
      <label>Quem</label><select id="qq">${quemOpts(defQuem)}</select>
      <label>Natureza</label><select id="qkind"><option value="despesa">Despesa</option><option value="receita">Receita</option></select>
      <label>Vencimento</label><input id="qvenc" type="number" min="1" max="31" placeholder="Dia (1–31)">
      <label>Categoria</label><input id="qcat" list="qmcats" value="Moradia">
      <label>Início</label><input id="qfat" type="month" value="${S.settings.base}">
    </div>`}
    <div class="bar" style="justify-content:flex-end;margin:0">
      <button class="b g" id="qm-cancel">Cancelar</button>
      <button class="b" id="qm-save">Salvar</button>
    </div>
  </div>`;
  qm.querySelector('#qd')?.focus();
  qm.querySelector('#qm-c').onclick=()=>openQuickAdd('cartao');
  qm.querySelector('#qm-f').onclick=()=>openQuickAdd('fora');
  qm.querySelector('#qm-cancel').onclick=()=>{qm.hidden=true};
  qm.onclick=e=>{if(e.target===qm)qm.hidden=true};
  qm.querySelector('#qd')?.addEventListener('change',e=>{
    const r=S.rules[key(e.target.value)];
    if(r&&mode==='cartao'){qm.querySelector('#qcat').value=r.cat||'Sem categoria';qm.querySelector('#qt').value=r.tipo||'variavel';qm.querySelector('#qq').value=r.quem||defQuem}
  });
  qm.querySelector('#qm-save').onclick=()=>{
    const desc=qm.querySelector('#qd').value.trim(),val=+qm.querySelector('#qv').value||0;
    if(!desc||!val)return alert('Informe a descrição e o valor.');
    const quem=qm.querySelector('#qq').value,cat=qm.querySelector('#qcat').value.trim()||'Outros',ym=qm.querySelector('#qfat').value||S.settings.base;
    if(mode==='cartao'){
      const np=Math.max(1,+qm.querySelector('#qp').value||1),tipo=np>1?'parcelada':qm.querySelector('#qt').value;
      const o={id:Date.now(),data:new Date().toISOString().slice(0,10),desc,cur:np>1?1:null,tot:np>1?np:null,valor:val,tipo,cat,quem,cartao:'',fim:null,ativo:true,fatura:ym,rev:false};
      S.tx.push(o);remember(o);
    }else{
      const kind=qm.querySelector('#qkind').value,venc=+qm.querySelector('#qvenc').value||null;
      S.off.push({id:Date.now(),nome:desc,quem,kind,valor:val,venc,inicio:ym,fim:null,cat:kind==='receita'?'Renda':cat,freq:'mensal'});
    }
    qm.hidden=true;save();render();
  };
}
document.getElementById('fab-add')?.addEventListener('click',()=>openQuickAdd(tab==='fora'?'fora':'cartao'));
// ---- Sincronização (Supabase) ----
const CFG=window.CONFIG||{},sb=CFG.SUPABASE_URL&&window.supabase?supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
let timer=null,lastRemote=null;
const setSync=t=>{document.getElementById('sync').textContent=t};
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
  lastRemote=data.updated_at;S=mig(data.data);localStorage.setItem(KEY,JSON.stringify(S));setSync('sincronizado');
  if(!document.activeElement||!['INPUT','SELECT'].includes(document.activeElement.tagName))render();
}
function loginScreen(msg){
  document.getElementById('main').innerHTML=`<div class="panel" style="max-width:360px;margin:60px auto"><h2>Entrar</h2>
  ${msg?`<div class="warn">${esc(msg)}</div>`:''}
  <div class="grid2" style="grid-template-columns:1fr"><input id="em" type="email" placeholder="E-mail" style="width:100%"><input id="pw" type="password" placeholder="Senha" style="width:100%">
  <button class="b" id="go">Entrar</button><button class="b g" id="su">Criar conta</button></div></div>`;
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
    const u=document.createElement('span');u.className='note';u.style.color='#cfe0f1';u.textContent=`👤 ${currentUser}`;
    const b=document.createElement('button');b.id='usr-exit';b.textContent='Sair';b.className='b g';b.onclick=async()=>{await sb.auth.signOut();location.reload()};
    document.getElementById('sync').after(u,b);
  }
  await pull(true);render();
  setInterval(()=>pull(false),15000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pull(false)});
  window.addEventListener('focus',()=>pull(false));
}
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').then(r=>r.update()).catch(()=>{});
sb?start():render();
