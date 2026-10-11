'use strict';
const $ = id => document.getElementById(id);
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const TEMPLATE_URL = 'https://raw.githubusercontent.com/andrebroncadev/autorizacao-locacao/main/modelo%20autoriza%C3%A7%C3%A3o%20de%20divulga%C3%A7%C3%A3o%20LOCAC%C3%83O%20REMAX%20SOUL%20sem%20exclusividade.docx';
let templateBytes = null;
let xmlDoc = null;
let templateName = 'modelo-original.docx';

function value(id){return ($(id)?.value || '').trim();}
function localToday(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function checked(name){return document.querySelector('input[name="'+name+'"]:checked')?.value || '';}
function allTextNodes(el){return Array.from(el.getElementsByTagNameNS(W,'t'));}
function direct(el,local){return Array.from(el.children).filter(n=>n.localName===local);}
function tablesOf(xml){return Array.from(xml.getElementsByTagNameNS(W,'tbl'));}
function rowsOf(table){return Array.from(table.getElementsByTagNameNS(W,'tr'));}
function cellsOf(row){return Array.from(row.getElementsByTagNameNS(W,'tc'));}
function paragraphsOf(el){return Array.from(el.getElementsByTagNameNS(W,'p'));}
function flatText(el){return allTextNodes(el).map(n=>n.textContent).join('');}

function insertAtGlobal(el,index,text){
  const nodes=allTextNodes(el);let pos=0;
  for(const n of nodes){const s=n.textContent;if(index<=pos+s.length){const at=Math.max(0,index-pos);n.textContent=s.slice(0,at)+text+s.slice(at);n.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');return true}pos+=s.length}
  if(nodes.length && index===pos){nodes[nodes.length-1].textContent+=text;return true}
  return false;
}
function putAfter(el,label,val){
  if(!val)return;
  const txt=flatText(el),i=txt.indexOf(label);
  if(i>=0)insertAtGlobal(el,i+label.length,' '+val);
}
function replaceInContainer(el,needle,replacement){
  const nodes=allTextNodes(el);
  for(const n of nodes){if(n.textContent.includes(needle)){n.textContent=n.textContent.replace(needle,replacement);n.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');return true}}
  const txt=flatText(el),i=txt.indexOf(needle);
  if(i<0)return false;
  const start=nodes;let pos=0;
  for(let a=0;a<start.length;a++){
    const n=start[a],s=n.textContent,next=pos+s.length;
    if(i>=pos && i<next){
      const local=i-pos,remain=needle.length;
      if(i+remain<=next){n.textContent=s.slice(0,local)+replacement+s.slice(local+remain);n.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');return true}
      let left=remain-(s.length-local);n.textContent=s.slice(0,local)+replacement;
      let j=a+1;while(j<start.length&&left>0){const old=start[j].textContent;if(left>=old.length){start[j].textContent='';left-=old.length;j++}else{start[j].textContent=old.slice(left);left=0}}
      return true
    }pos=next
  }return false;
}
function markGlobalChar(el,index,char){
  const nodes=allTextNodes(el);let pos=0;
  for(const n of nodes){const s=n.textContent,next=pos+s.length;if(index>=pos&&index<next){const at=index-pos;n.textContent=s.slice(0,at)+char+s.slice(at+1);return true}pos=next}
  return false;
}
function markCheckboxAfter(el,label,on){
  const s=flatText(el),start=s.indexOf(label);if(start<0)return;
  const open=s.indexOf('(',start+label.length),close=open>=0?s.indexOf(')',open+1):-1;
  if(open>=0&&close>open)markGlobalChar(el,open+1,on?'X':' ');
}
function markCheckboxBeforeWord(el,section,word,on){
  const s=flatText(el),start=s.indexOf(section);if(start<0)return;
  const endSection=s.indexOf('\n',start);const end=endSection<0?s.length:endSection;
  const wordAt=s.toLowerCase().indexOf(word.toLowerCase(),start);
  if(wordAt<start||wordAt>=end)return;
  const open=s.lastIndexOf('(',wordAt),close=s.lastIndexOf(')',wordAt);
  if(open>=start&&close>open)markGlobalChar(el,open+1,on?'X':' ');
}
function setCellLines(cell,text){
  if(!text)return;
  const lines=String(text).split(/\r?\n/);
  let p=paragraphsOf(cell)[0];
  if(!p){p=xmlDoc.createElementNS(W,'w:p');cell.appendChild(p)}
  let run=p.getElementsByTagNameNS(W,'r')[0];
  if(!run){run=xmlDoc.createElementNS(W,'w:r');p.appendChild(run)}
  const rPr=run.getElementsByTagNameNS(W,'rPr')[0];
  Array.from(run.childNodes).forEach(n=>{if(n!==rPr)run.removeChild(n)});
  lines.forEach((line,i)=>{
    if(i){run.appendChild(xmlDoc.createElementNS(W,'w:br'))}
    const t=xmlDoc.createElementNS(W,'w:t');t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');t.textContent=line;run.appendChild(t);
  });
}
function setDate(xml){
  const p=paragraphsOf(xml).find(p=>flatText(p).includes('DATA:'));
  if(!p)return;
  const d=value('data');if(!d)return;
  const [y,m,day]=d.split('-'),nodes=allTextNodes(p);
  if(nodes.length){nodes[0].textContent='DATA: '+day+'/'+m+'/'+y;for(let i=1;i<nodes.length;i++)nodes[i].textContent=''}
}
function fillUnderlinedTab(paragraph,label,val){
  if(!val)return;
  const runs=Array.from(paragraph.getElementsByTagNameNS(W,'r'));
  const text=flatText(paragraph),labelAt=text.indexOf(label);if(labelAt<0)return;
  let count=0,labelRun=-1;
  for(let i=0;i<runs.length;i++){
    const rt=allTextNodes(runs[i]).map(n=>n.textContent).join('');
    if(labelAt+label.length<=count+rt.length){labelRun=i;break}
    count+=rt.length;
  }
  let target=null;
  for(let i=Math.max(0,labelRun+1);i<runs.length;i++){
    if(runs[i].getElementsByTagNameNS(W,'tab').length){target=runs[i];break}
  }
  if(!target){putAfter(paragraph,label,val);return}
  const tab=target.getElementsByTagNameNS(W,'tab')[0];
  const t=xmlDoc.createElementNS(W,'w:t');t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');t.textContent=' '+val;
  target.insertBefore(t,tab);
}
function fillDocx(xml){
  const tables=tablesOf(xml);if(tables.length<3)throw new Error('O DOCX selecionado não corresponde ao modelo da autorização.');
  const propertyRows=rowsOf(tables[0]),pc=propertyRows.map(r=>cellsOf(r)[0]);
  if(value('tipo')){markCheckboxAfter(pc[0],'SOBRADO',value('tipo')==='SOBRADO');markCheckboxAfter(pc[0],'TÉRREA',value('tipo')==='TÉRREA')}
  putAfter(pc[0],'PRAIA:',value('praia'));
  putAfter(pc[1],'DISTÂNCIA DA PRAIA:',value('distancia'));
  putAfter(pc[2],'ENDEREÇO DO IMÓVEL:',value('endereco'));
  putAfter(pc[3],'CONDOMÍNIO:',value('condominio'));
  putAfter(pc[3],'Nº UNIDADE:',value('unidade'));
  putAfter(pc[4],'ÁREA TOTAL:',value('areaTotal'));
  putAfter(pc[4],'ÁREA CONSTRUÍDA:',value('areaConstruida'));
  putAfter(pc[4],'IDADE DO IMÓVEL:',value('idade'));
  const rentP=paragraphsOf(pc[5]).find(p=>flatText(p).includes('VALOR DA LOCAÇÃO'));
  const iptuP=paragraphsOf(pc[5]).find(p=>flatText(p).includes('IPTU'));
  const condP=paragraphsOf(pc[5]).find(p=>flatText(p).includes('CONDOMÍNIO'));
  if(rentP)replaceInContainer(rentP,'R$              ','R$ '+value('valorLocacao')+' ');
  if(iptuP){
    replaceInContainer(iptuP,'R$              /MÊS','R$ '+value('iptuValor')+' /MÊS');
    const v=checked('iptuIncluso');if(v){markCheckboxBeforeWord(iptuP,'IPTU','não',v==='não');markCheckboxBeforeWord(iptuP,'IPTU','sim',v==='sim')}
  }
  if(condP){
    replaceInContainer(condP,'R$              /MÊS','R$ '+value('condValor')+' /MÊS');
    const v=checked('condIncluso');if(v){markCheckboxBeforeWord(condP,'CONDOMÍNIO','não',v==='não');markCheckboxBeforeWord(condP,'CONDOMÍNIO','sim',v==='sim')}
  }
  setCellLines(pc[7],value('descricao'));
  [['mobiliado',8],['eletro',10],['lazer',12],['piscina',14],['churrasqueira',16],['servicoPraia',18],['chaves',20]].forEach(([name,row])=>{
    const v=checked(name);if(!v)return;
    markCheckboxAfter(pc[row],'NÃO',v==='não');markCheckboxAfter(pc[row],'SIM',v==='sim');
  });
  if(value('telVisita'))replaceInContainer(pc[22],'(  )','('+value('telVisita')+')');
  const obsRows=rowsOf(tables[1]);
  const noteLines=value('observacoes').split(/\r?\n/);
  noteLines.slice(0,3).forEach((line,i)=>{if(line&&obsRows[i+1])setCellLines(cellsOf(obsRows[i+1])[0],line)});
  if(noteLines.length>3&&obsRows[3])setCellLines(cellsOf(obsRows[3])[0],noteLines.slice(2).join('\n'));
  const ownerRows=rowsOf(tables[2]),oc=ownerRows.map(r=>cellsOf(r)[0]);
  putAfter(oc[0],'NOME:',value('nome'));
  putAfter(oc[1],'ENDEREÇO RESIDENCIAL:',value('endResidencial'));
  putAfter(oc[2],'CIDADE:',value('cidade'));putAfter(oc[2],'ESTADO:',value('estado'));putAfter(oc[2],'CEP:',value('cep'));
  putAfter(oc[3],'CPF:',value('cpf'));putAfter(oc[4],'TELEFONE:',value('telefone'));putAfter(oc[5],'E-MAIL:',value('email'));
  setDate(xml);
  const auth=paragraphsOf(xml).find(p=>flatText(p).includes('AUTORIZO A RE/MAX SOUL'));
  if(auth){fillUnderlinedTab(auth,'CORRETOR(A)',value('corretor'));fillUnderlinedTab(auth,'CRECI',value('creci'))}
}
function getData(){
  const data={};document.querySelectorAll('#authForm input,#authForm select,#authForm textarea').forEach(el=>{
    if(el.type==='radio'){if(el.checked)data[el.name]=el.value}
    else if(el.id)data[el.id]=el.value.trim();
  });return data;
}
function e(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function radioText(n){return checked(n)}
function yn(n){return checked(n)==='sim'?'X':''}
function datePt(s){if(!s)return '';const [y,m,d]=s.split('-');return d+'/'+m+'/'+y}
function fmtText(v){return e(v).replace(/\r?\n/g,'<br>')}
function logoData(zip){
  return zip.file('word/media/image1.jpeg')?.async('base64').then(b=>'data:image/jpeg;base64,'+b).catch(()=> '') || Promise.resolve('');
}
function printPageHtml(data,logo){
  const noteLines=value('observacoes').split(/\r?\n/);
  const noteRows=[0,1,2].map(i=>'<tr><td>'+fmtText(noteLines[i]||'')+'</td></tr>').join('');
  const mark=(name)=>radioText(name)==='sim'?'X':' ';
  const markNo=(name)=>radioText(name)==='não'?'X':' ';
  const box=(x)=>'('+x+')';
  const field=(label,val)=>'<span>'+label+'</span> '+e(val||'');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Autorização de divulgação de locação</title><style>
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font:10pt Arial,sans-serif;color:#000}.page{width:210mm;height:297mm;padding:13mm 13mm 10mm;position:relative;page-break-after:always;overflow:hidden}.page:last-child{page-break-after:auto}.logo{height:25mm;display:flex;align-items:center;justify-content:center;margin:0 0 2mm}.logo img{max-width:145mm;max-height:25mm;object-fit:contain}.title{text-align:center;text-decoration:underline;font-weight:bold;font-size:11pt;margin:1mm 0 8mm;line-height:1.5}.section{font-weight:bold;text-decoration:underline;margin:0 0 7mm;font-size:10pt}.tbl{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.2pt}.tbl td{border:1px solid #222;padding:1mm 1.5mm;vertical-align:top;overflow-wrap:anywhere}.r{height:5mm}.description{height:58mm}.description td{vertical-align:top}.options{height:5mm}.notes td{height:5mm}.owner td{height:5mm}.date{text-align:center;margin:6mm 0 7mm}.auth{font-size:9pt;line-height:2.05;text-align:justify;margin:0 3mm}.signature{margin:13mm auto 0;border-top:1px solid #000;width:62%;text-align:center;padding-top:1mm;font-size:8pt}.page2 .logo{margin-bottom:5mm}.page2 .section{margin-top:6mm;margin-bottom:7mm}
@media screen{body{background:#e5e7eb;padding:12px}.page{background:#fff;margin:0 auto 12px;box-shadow:0 2px 15px #0002}}@media print{body{background:white}.page{margin:0;box-shadow:none}}
</style></head><body>
<section class="page"><div class="logo">${logo?'<img src="'+logo+'" alt="RE/MAX SOUL">':''}</div><div class="title">AUTORIZAÇÃO PARA DIVULGAÇÃO DE ANÚNCIO DE LOCAÇÃO<br>DE IMÓVEL SEM EXCLUSIVIDADE</div><div class="section">II. DADOS DO IMÓVEL</div>
<table class="tbl"><tr class="r"><td colspan="2">TIPO: SOBRADO ${box(value('tipo')==='SOBRADO'?'X':' ')} &nbsp; TÉRREA ${box(value('tipo')==='TÉRREA'?'X':' ')}<span style="float:right">PRAIA: ${e(value('praia'))}</span></td></tr>
<tr class="r"><td colspan="2">DISTÂNCIA DA PRAIA: ${e(value('distancia'))} METROS</td></tr><tr class="r"><td colspan="2">ENDEREÇO DO IMÓVEL: ${e(value('endereco'))}</td></tr>
<tr class="r"><td>CONDOMÍNIO: ${e(value('condominio'))}</td><td>Nº UNIDADE: ${e(value('unidade'))}</td></tr>
<tr class="r"><td colspan="2">ÁREA TOTAL: ${e(value('areaTotal'))} &nbsp;&nbsp;&nbsp; ÁREA CONSTRUÍDA: ${e(value('areaConstruida'))}<span style="float:right">IDADE DO IMÓVEL: ${e(value('idade'))}</span></td></tr>
<tr><td colspan="2">VALOR DA LOCAÇÃO: R$ ${e(value('valorLocacao'))} /MÊS<br>INCLUSO no valor anunciado da locação:<br>IPTU ${box(markNo('iptuIncluso'))}não &nbsp; ${box(mark('iptuIncluso'))}sim &nbsp; R$ ${e(value('iptuValor'))} /MÊS<br>CONDOMÍNIO ${box(markNo('condIncluso'))}não &nbsp; ${box(mark('condIncluso'))}sim &nbsp; R$ ${e(value('condValor'))} /MÊS</td></tr>
<tr><td colspan="2" style="height:7mm">DESCRIÇÃO DO IMÓVEL:</td></tr><tr class="description"><td colspan="2">${fmtText(value('descricao'))}</td></tr>
<tr class="options"><td colspan="2">MOBILIADO: NÃO ${box(markNo('mobiliado'))} &nbsp; SIM ${box(mark('mobiliado'))}</td></tr><tr class="r"><td colspan="2"></td></tr>
<tr class="options"><td colspan="2">ELETRODOMÉSTICOS: NÃO ${box(markNo('eletro'))} &nbsp; SIM ${box(mark('eletro'))}</td></tr><tr class="r"><td colspan="2"></td></tr>
<tr class="options"><td colspan="2">POSSUI ÁREA DE LAZER: NÃO ${box(markNo('lazer'))} &nbsp; SIM ${box(mark('lazer'))}</td></tr><tr class="r"><td colspan="2"></td></tr>
<tr class="options"><td colspan="2">PISCINA PRIVATIVA: NÃO ${box(markNo('piscina'))} &nbsp; SIM ${box(mark('piscina'))}</td></tr><tr class="r"><td colspan="2"></td></tr>
<tr class="options"><td colspan="2">CHURRASQUEIRA PRIVATIVA: NÃO ${box(markNo('churrasqueira'))} &nbsp; SIM ${box(mark('churrasqueira'))}</td></tr><tr class="r"><td colspan="2"></td></tr>
<tr class="options"><td colspan="2">SERVIÇO DE PRAIA: NÃO ${box(markNo('servicoPraia'))} &nbsp; SIM ${box(mark('servicoPraia'))}</td></tr><tr class="r"><td colspan="2"></td></tr>
<tr class="options"><td colspan="2">CHAVES NO LOCAL NÃO ${box(markNo('chaves'))} SIM ${box(mark('chaves'))}</td></tr><tr class="r"><td colspan="2"></td></tr>
<tr class="r"><td colspan="2">SEMPRE AVISAR O(A) PROPRIETÁRIO(A) QUANDO FOR VISITAR ATRAVÉS DO TEL: (${e(value('telVisita'))})</td></tr></table></section>
<section class="page page2"><div class="logo">${logo?'<img src="'+logo+'" alt="RE/MAX SOUL">':''}</div>
<table class="tbl notes"><tr><td>OBSERVAÇÕES:</td></tr>${noteRows}</table>
<div class="section">II. DADOS DO(A) PROPRIETÁRIO(A)/LOCADOR(A)</div>
<table class="tbl owner"><tr><td>NOME: ${e(value('nome'))}</td></tr><tr><td>ENDEREÇO RESIDENCIAL: ${e(value('endResidencial'))}</td></tr>
<tr><td>CIDADE: ${e(value('cidade'))}<span style="margin-left:26mm">ESTADO: ${e(value('estado'))}</span><span style="float:right">CEP: ${e(value('cep'))}</span></td></tr>
<tr><td>CPF: ${e(value('cpf'))}</td></tr><tr><td>TELEFONE: ${e(value('telefone'))}</td></tr><tr><td>E-MAIL: ${e(value('email'))}</td></tr></table>
<div class="date">DATA: ${e(datePt(value('data')))}</div>
<p class="auth">AUTORIZO A <b>RE/MAX SOUL</b>, ATRAVÉS DO(A) CORRETOR(A) <u>${e(value('corretor'))}</u>, CRECI <u>${e(value('creci'))}</u> A DIVULGAR INCLUINDO ONLINE MEU IMÓVEL PARA LOCAÇÃO, <b><u>SEM EXCLUSIVIDADE</u></b>.</p>
<div class="signature">PROPRIETÁRIO(A)</div></section>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));<\/script></body></html>`;
}
async function makeDocx(){
  if(!templateBytes)throw new Error('O modelo original não foi carregado. Recarregue a página ou selecione o DOCX.');
  if(!window.JSZip)throw new Error('A biblioteca de documentos não carregou. Confira a conexão e tente novamente.');
  const zip=await JSZip.loadAsync(templateBytes.slice(0));
  const file=zip.file('word/document.xml');if(!file)throw new Error('O modelo não contém word/document.xml.');
  const parser=new DOMParser();xmlDoc=parser.parseFromString(await file.async('string'),'application/xml');
  if(xmlDoc.getElementsByTagName('parsererror').length)throw new Error('Não foi possível ler o XML do modelo.');
  fillDocx(xmlDoc);
  const result=new XMLSerializer().serializeToString(xmlDoc.documentElement);
  zip.file('word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+result);
  const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  const name=value('nome').replace(/[^a-z0-9À-ÿ -]/gi,'').trim().replace(/\s+/g,'-');
  a.href=url;a.download='autorizacao-locacao'+(name?'-'+name:'')+'.docx';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function makePdf(){
  if(!templateBytes)throw new Error('O modelo original não foi carregado. Recarregue a página.');
  const win=window.open('','_blank');if(!win)throw new Error('O navegador bloqueou a janela de impressão. Permita pop-ups para este site.');
  try{const zip=await JSZip.loadAsync(templateBytes.slice(0));const logo=await logoData(zip);win.document.open();win.document.write(printPageHtml(getData(),logo));win.document.close()}
  catch(err){win.close();throw err}
}
function status(message,type='ok'){$('actionStatus').textContent=message;$('actionStatus').style.color=type==='bad'?'var(--theme-red)':'var(--theme-green)'}
function setTemplateStatus(message,type){const el=$('templateStatus');el.className='template-status '+type;el.innerHTML='<span class="dot"></span> '+e(message)}
function addPicker(){
  if($('modelPicker'))return;
  const label=document.createElement('label');label.className='model-picker';label.innerHTML='Selecionar modelo DOCX <input id="modelPicker" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document">';
  $('templateStatus').appendChild(label);
  $('modelPicker').addEventListener('change',async ev=>{const f=ev.target.files?.[0];if(!f)return;templateBytes=await f.arrayBuffer();templateName=f.name;setTemplateStatus('Modelo carregado: '+f.name,'ok')});
}
async function loadTemplate(){
  try{const res=await fetch(TEMPLATE_URL,{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);templateBytes=await res.arrayBuffer();setTemplateStatus('Modelo original carregado automaticamente. Pronto para gerar.','ok')}
  catch(err){setTemplateStatus('Não foi possível carregar automaticamente o DOCX. Selecione o modelo abaixo.','bad');addPicker()}
}
function clearForm(){ $('authForm').reset();$('data').value=localToday();status('Formulário limpo.');}
$('btnLimpar').addEventListener('click',clearForm);
$('btnDocx').addEventListener('click',async()=>{try{status('Gerando DOCX…');await makeDocx();status('DOCX gerado. Abra e confira antes de utilizar.')}catch(err){status(err.message,'bad')}});
$('btnDocxTop').addEventListener('click',()=>$('btnDocx').click());
$('btnPdf').addEventListener('click',async()=>{try{status('Preparando visualização…');await makePdf();status('Visualização aberta. Use a opção de imprimir/salvar em PDF.')}catch(err){status(err.message,'bad')}});
$('btnPdfTop').addEventListener('click',()=>$('btnPdf').click());
$('data').value=localToday();
(function theme(){let t='light';try{t=localStorage.getItem('remax-unified-theme')||'light'}catch(_){}document.documentElement.dataset.theme=t;const b=document.createElement('button');b.className='theme-toggle no-print';b.type='button';function apply(){b.textContent=document.documentElement.dataset.theme==='dark'?'☀ Modo claro':'☾ Modo escuro';b.setAttribute('aria-pressed',String(document.documentElement.dataset.theme==='dark'))}b.onclick=()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;try{localStorage.setItem('remax-unified-theme',n)}catch(_){}apply()};apply();document.body.appendChild(b)})();
loadTemplate();