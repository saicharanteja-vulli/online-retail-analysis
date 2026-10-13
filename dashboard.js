'use strict';
const priceLabels={'Very Low':'Very Low (£0–2]','Low':'Low (£2–5]','Medium':'Medium (£5–10]','High':'High (£10–50]','Premium':'Premium (over £50)'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function matches(row,f,dict){
 const day=row[4].slice(0,10);
 if(f.country!=='' && dict.Country[row[7]]!==f.country)return false;
 if(f.category!=='' && dict.PriceCategory[row[8]]!==f.category)return false;
 if(f.from && day<f.from || f.to && day>f.to)return false;
 const q=f.query.trim().toLowerCase(); if(!q)return true;
 const values={product:dict.Description[row[2]],stock:dict.StockCode[row[1]],customer:row[6],invoice:row[0]};
 return (f.field==='all'?Object.values(values):[values[f.field]]).some(v=>String(v).toLowerCase().includes(q));
}
function aggregate(rows,dict){
 const a={revenue:0,orders:new Set(),customers:new Map(),countries:new Map(),months:new Map(),products:new Map(),hours:new Map(),days:new Map(),categories:new Map(),quantities:new Map()};
 const add=(map,key,n)=>map.set(key,(map.get(key)||0)+n);
 for(const r of rows){
  const rev=r[3]*r[5], month=r[4].slice(0,7),country=dict.Country[r[7]],stock=dict.StockCode[r[1]];
  a.revenue+=rev;a.orders.add(r[0]);add(a.countries,country,rev);add(a.hours,r[4].slice(11,13),rev);add(a.days,new Date(r[4]+'Z').getUTCDay(),rev);add(a.categories,dict.PriceCategory[r[8]],1);add(a.quantities,r[3]<=2?'1–2':r[3]<=6?'3–6':r[3]<=12?'7–12':'>12',1);
  if(!a.months.has(month))a.months.set(month,{revenue:0,orders:new Set(),customers:new Set()});
  const m=a.months.get(month);m.revenue+=rev;m.orders.add(r[0]);m.customers.add(r[6]);
  if(!a.customers.has(r[6]))a.customers.set(r[6],{revenue:0,orders:new Set(),latest:r[4]});
  const c=a.customers.get(r[6]);c.revenue+=rev;c.orders.add(r[0]);if(r[4]>c.latest)c.latest=r[4];
  if(!a.products.has(stock))a.products.set(stock,{description:dict.Description[r[2]],qty:0,revenue:0});
  const p=a.products.get(stock);p.qty+=r[3];p.revenue+=rev;
 }
 return a;
}
if(typeof module!=='undefined')module.exports={matches,aggregate};
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id),D=window.RETAIL;
 if(!D){$('status').textContent='Data file missing. Keep Dashboard.html, dashboard.js and retail-data.js together.';throw new Error('Missing retail-data.js');}
 let current=D.rows, a,tab='overview',page=0,charts=[];
 const money=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(n);
 const num=n=>n.toLocaleString('en-GB');
 const colors=['#0984e3','#00a88b','#7762c4','#e39b36','#d66b50','#70899c'];
 const ordered=map=>[...map.entries()].sort((x,y)=>y[1]-x[1]);
 const card=(id,title,desc='')=>`<section class="card"><h2 class="card-title">${title}</h2><p class="card-desc">${desc}</p><div class="chart-wrap h300"><canvas id="${id}" aria-label="${title}" role="img"></canvas></div></section>`;
 const table=(heads,rows)=>`<div class="table-scroll"><table class="clean"><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 function chart(id,entries,label,type='bar',opts={}){
  const ch=new Chart($(id),{type,data:{labels:entries.map(x=>x[0]),datasets:[{label,data:entries.map(x=>x[1]),backgroundColor:type==='pie'?colors:colors[0],borderColor:colors[0],borderWidth:2,tension:.2,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:type==='pie',position:'bottom'}},...(type==='pie'?{}:{scales:{y:{beginAtZero:true}}}),...opts}});charts.push(ch);
 }
 function render(){
  charts.forEach(c=>c.destroy());charts=[];
  $('kpis').innerHTML=[['Sales revenue',money(a.revenue),'Sum of matching line amounts'],['Orders',num(a.orders.size),'Distinct matching invoices'],['Customers',num(a.customers.size),'Distinct matching customer IDs'],['Average order value',money(a.orders.size?a.revenue/a.orders.size:0),'Matching revenue ÷ matching invoices']].map(x=>`<div class="kpi-box"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join('');
  $('scope').textContent='Charts and totals reflect the applied filters. When searching a product, order value includes only matching lines within each invoice.';
  if(!current.length){$('content').innerHTML='<div class="card empty">No matching transactions. Change your search or choose Reset All.</div>';return;}
  if(tab==='overview'){
   $('content').innerHTML=`<div class="row row-wide-narrow">${card('monthly','Monthly Revenue Trend','December 2011 includes only the first nine days')}${card('countrychart','Revenue by Country','Top five markets and remaining countries')}</div><div class="row row-2">${card('intl','Top International Markets','Up to 10 countries, excluding the UK')}${card('hour','Hourly Sales Pattern','Invoice timestamps as supplied in the dataset')}</div>`;
   chart('monthly',[...a.months].sort().map(([k,v])=>[k,v.revenue]),'Revenue (£)','line');
   const countries=ordered(a.countries);const top=countries.slice(0,5);if(countries.length>5)top.push(['Others',countries.slice(5).reduce((s,x)=>s+x[1],0)]);chart('countrychart',top,'Revenue (£)','pie');
   chart('intl',countries.filter(x=>x[0]!=='United Kingdom').slice(0,10),'Revenue (£)');chart('hour',[...a.hours].sort(),'Revenue (£)');
  }else if(tab==='transactions')renderTransactions();
 }

 function renderTransactions(){
  const size=25,totalPages=Math.ceil(current.length/size);page=Math.min(page,Math.max(0,totalPages-1));
  $('content').innerHTML=`<section class="card"><h2 class="card-title">Matching Transactions</h2>${table(['Invoice','Product code','Product name','Customer ID','Country','Date','Quantity','Unit price','Line amount'],current.slice(page*size,(page+1)*size).map(r=>[r[0],D.dictionaries.StockCode[r[1]],D.dictionaries.Description[r[2]],r[6],D.dictionaries.Country[r[7]],r[4].replace('T',' '),r[3],money(r[5]),money(r[3]*r[5])]))}<div class="pagination"><button id="prev" class="action secondary" ${page===0?'disabled':''}>Previous</button><span>Page ${page+1} of ${num(totalPages)} · ${num(current.length)} matching lines</span><button id="next" class="action secondary" ${page+1>=totalPages?'disabled':''}>Next</button></div></section>`;
  $('prev').onclick=()=>{if(page>0){page--;renderTransactions();}};$('next').onclick=()=>{if(page+1<totalPages){page++;renderTransactions();}};
 }
 function apply(){
  const f={query:$('query').value,field:$('field').value,country:$('country').value,category:$('category').value,from:$('from').value,to:$('to').value};
  if(f.from && f.to && f.from>f.to){$('status').className='status error';$('status').textContent='From date must be on or before To date. Your previous results are unchanged.';return;}
  $('apply').disabled=true;$('status').className='status';$('status').textContent='Updating results…';
  setTimeout(()=>{try{current=D.rows.filter(r=>matches(r,f,D.dictionaries));a=aggregate(current,D.dictionaries);page=0;render();$('status').textContent=`${num(current.length)} of ${num(D.rows.length)} cleaned transaction lines match the applied search and filters.`;}finally{$('apply').disabled=false;}},20);
 }
 $('country').innerHTML+=[...D.dictionaries.Country].map(c=>`<option>${esc(c)}</option>`).join('');$('category').innerHTML+=Object.entries(priceLabels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
 $('dataset-note').textContent=`${num(D.summary.raw_rows)} original rows · ${num(D.rows.length)} cleaned sales lines · Dec 2010–Dec 2011`;
 $('filters').onsubmit=e=>{e.preventDefault();apply();};$('reset').onclick=()=>{HTMLFormElement.prototype.reset.call($('filters'));apply();};
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-pressed',String(t===b));});if(a)render();});
 if(typeof Chart==='undefined'){$('status').textContent='Chart library missing. Restore chart.umd.min.js to this folder.';}else{Chart.defaults.font.family="'Segoe UI',Arial,sans-serif";apply();}
 window.dashboardState=()=>({count:current.length,revenue:a?.revenue,orders:a?.orders.size,customers:a?.customers.size,tab,page});
}
