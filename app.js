const $=id=>document.getElementById(id);
const fmt=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
let ownerType="pj",seq=0,currentLogo=null;

function d(s){return(s||"").replace(/\D/g,"")}
function v(i){const e=$(i);return e?(e.value||"").trim():""}
function cpfMask(s){let x=d(s).slice(0,11);return x.length>9?x.slice(0,3)+"."+x.slice(3,6)+"."+x.slice(6,9)+"-"+x.slice(9):x.length>6?x.slice(0,3)+"."+x.slice(3,6)+"."+x.slice(6):x.length>3?x.slice(0,3)+"."+x.slice(3):x}
function cpfOk(s){let x=d(s);if(x.length!==11||/^([0-9])\1{10}$/.test(x))return false;let z=0;for(let i=0;i<9;i++)z+=+x[i]*(10-i);let a=z*10%11;a=a===10?0:a;if(a!==+x[9])return false;z=0;for(let i=0;i<10;i++)z+=+x[i]*(11-i);a=z*10%11;a=a===10?0:a;return a===+x[10]}

[["ownerCpf","ownerCpfStatus"],["ownerPfCpf","ownerPfCpfStatus"],["tenantCpf","tenantCpfStatus"]].forEach(([i,s])=>{
  $(i).oninput=()=>$(i).value=cpfMask($(i).value);
  $(i).onblur=()=>{const ok=cpfOk($(i).value),e=$(s);e.textContent=$(i).value?(ok?"✓ CPF válido":"✕ CPF inválido"):"";e.className="status "+(ok?"ok":"bad")}
});
["w1Cpf","w2Cpf"].forEach(i=>$(i).oninput=()=>$(i).value=cpfMask($(i).value));

function cepMask(s){let x=d(s).slice(0,8);return x.length>5?x.slice(0,5)+"-"+x.slice(5):x}
function cep(prefix,id){
  $(id).oninput=()=>$(id).value=cepMask($(id).value);
  $(id).onblur=()=>{
    const x=d($(id).value); if(x.length!==8)return;
    fetch("https://viacep.com.br/ws/"+x+"/json/").then(r=>r.json()).then(o=>{
      if(o.erro)return;
      [prefix+"Street",prefix+"Bairro",prefix+"City",prefix+"Uf"].forEach((k,j)=>$(k).value=[o.logradouro,o.bairro,o.localidade,o.uf][j]||"");
    }).catch(()=>{});
  };
}
cep("owner","ownerCep");cep("tenant","tenantCep");cep("property","propertyCep");

document.querySelectorAll("[data-owner-type]").forEach(b=>b.onclick=()=>{
  ownerType=b.dataset.ownerType;
  document.querySelectorAll(".pill").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  $("ownerPJ").classList.toggle("hidden",ownerType!=="pj");
  $("ownerPF").classList.toggle("hidden",ownerType!=="pf");
});

function dates(){
  const a=$("checkin").value,b=$("checkout").value,s=$("dateStatus");
  if(!a||!b){$("nights").value="";s.textContent="";return true}
  const n=(new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000;
  if(n<=0){$("nights").value="";s.textContent="✕ Check-out precisa ser posterior ao check-in.";s.className="status bad";return false}
  $("nights").value=n;s.textContent="✓ "+n+" diária(s).";s.className="status ok";return true
}
$("checkin").onchange=()=>{$("checkout").min=$("checkin").value;dates()};
$("checkout").onchange=dates;

function money(){
  const r=+$("rentValue").value||0,c=+$("cleanValue").value||0,q=+$("commissionPct").value||0,s=(+$("reservationOwnerValue").value||0)+(+$("reservationBrokerValue").value||0);
  $("totalValue").textContent=fmt.format(r+c);
  $("commissionValue").textContent=fmt.format(r*q/100);
  $("balanceValue").textContent=fmt.format(Math.max(0,r+c-s));
  $("reservationTotalValue").textContent=fmt.format(s);
  updateInstallmentBalances();
}
["rentValue","cleanValue","commissionPct","reservationOwnerValue","reservationBrokerValue"].forEach(i=>$(i).oninput=money);money();

$("btnAddInstallment").onclick=()=>{
  seq++;
  const x=document.createElement("div");
  x.className="installment";
  x.innerHTML='<div class="installment-title"><b>PARCELA '+seq+'</b><span class="installment-balance">Saldo após esta parcela: R$ 0,00</span><button type="button" class="remove">Remover</button></div><div class="grid"><div class="field c4"><label>Vencimento</label><input class="pdate" type="date"></div><div class="field c4"><label>Valor (R$)</label><input class="pvalue" type="number" step="0.01" min="0"></div><div class="field c4"><label>Conta do locador</label><select class="ptarget"><option value="owner">Locador</option><option value="broker">Imobiliária</option></select></div></div>';
  x.querySelector(".remove").onclick=()=>{x.remove();renum();updateInstallmentBalances()};
  x.querySelector(".pvalue").oninput=updateInstallmentBalances;
  $("installments").appendChild(x);renum();updateInstallmentBalances();
};
function renum(){
  const xs=document.querySelectorAll(".installment");
  $("installmentCount").textContent=xs.length;
  xs.forEach((x,i)=>x.querySelector("b").textContent="PARCELA "+(i+1));
}

function updateInstallmentBalances(){
  const base=(+$("rentValue").value||0)+(+$("cleanValue").value||0)-(+$("reservationOwnerValue").value||0)-(+$("reservationBrokerValue").value||0);
  let saldo=base;
  document.querySelectorAll(".installment").forEach(x=>{
    saldo=Math.max(0,saldo-(+x.querySelector(".pvalue").value||0));
    const e=x.querySelector(".installment-balance");
    if(e)e.textContent="Saldo após esta parcela: "+fmt.format(saldo);
  });
}
function br(s){if(!s)return"";const p=s.split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:s}
function addr(p){return[v(p+"Street"),v(p+"Number"),v(p+"Comp"),v(p+"Bairro"),v(p+"City"),v(p+"Uf"),v(p+"Cep")].filter(Boolean).join(", ")}
function owner(){
  return ownerType==="pf"
    ? v("ownerPfName")+", "+v("ownerPfCivil")+", "+v("ownerPfJob")+", RG "+v("ownerPfRg")+" e CPF "+v("ownerPfCpf")
    : v("ownerName")+", CNPJ "+v("ownerCnpj")+" Representante legal: "+v("ownerRep")+" RG "+v("ownerRg")+" e inscrito no CPF "+v("ownerCpf");
}
function longDate(s){
  if(!s)return longToday();
  const p=s.split("-"); if(p.length!==3)return longToday();
  const m=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return +p[2]+" de "+m[+p[1]-1]+" de "+p[0];
}
function longToday(){return longDate(new Date().toISOString().slice(0,10))}
function moneyText(n){return fmt.format(n||0)}
function numText(n){return (n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}
const units=["zero","um","dois","três","quatro","cinco","seis","sete","oito","nove"],teens=["dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"],tens=["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"],hundreds=["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
function words1000(n){
  if(n<10)return units[n];
  if(n<20)return teens[n-10];
  if(n<100)return tens[Math.floor(n/10)]+(n%10?" e "+units[n%10]:"");
  if(n===100)return"cem";
  return hundreds[Math.floor(n/100)]+(n%100?" e "+words1000(n%100):"");
}
function words(n){
  n=Math.round(Number(n)||0);
  if(n<1000)return words1000(n);
  const groups=[];
  const mil=Math.floor(n/1000),rest=n%1000;
  if(mil===1)groups.push("mil"); else groups.push(words1000(mil)+" mil");
  if(rest)groups.push(words1000(rest));
  return groups.join(" e ");
}
function moneyWords(n){
  n=Number(n)||0;
  const reais=Math.floor(n),cent=Math.round((n-reais)*100);
  let s=(reais===1?"um real":words(reais)+" reais");
  if(cent)s+=" e "+words(cent)+" centavos";
  return s;
}

function ensureSpace(doc,state,need){
  if(state.y+need>268){doc.addPage();state.y=35;pageHeader(doc,currentLogo)}
}
function richText(doc,label,runs,state){
  const width=172,lineH=5,x=20,tokens=[];
  const push=(t,b)=>String(t??"").split(/(\s+)/).forEach(q=>{if(q)tokens.push({t:q,b})});
  push(label,true);runs.forEach(r=>push(r.text,r.bold));
  const lines=[],line=[];let w=0;
  for(const tok of tokens){
    const space=/^\s+$/.test(tok.t);
    doc.setFont("helvetica",tok.b?"bold":"normal");
    const tw=doc.getTextWidth(tok.t);
    if(space&&line.length===0)continue;
    if(!space&&line.length&&w+tw>width){lines.push([...line]);line.length=0;w=0}
    if(line.length===0&&space)continue;
    line.push(tok);w+=tw;
  }
  if(line.length)lines.push(line);
  const need=lines.length*lineH+3;ensureSpace(doc,state,need);
  lines.forEach((ln,i)=>{let xx=x;ln.forEach(tok=>{doc.setFont("helvetica",tok.b?"bold":"normal");doc.text(tok.t,xx,state.y+i*lineH);xx+=doc.getTextWidth(tok.t)})});
  state.y+=need;
}
function paragraph(doc,label,text,state,opt={}){
  const width=172,lineH=5,x=20;
  doc.setFont("helvetica","bold");
  const labelW=label?doc.getTextWidth(label):0;
  doc.setFont("helvetica",opt.boldAll?"bold":"normal");
  const lines=label?doc.splitTextToSize(text,width-labelW):doc.splitTextToSize(text,width);
  const need=lines.length*lineH+3;
  ensureSpace(doc,state,need);
  if(label){
    doc.setFont("helvetica","bold");doc.text(label,x,state.y);
    doc.setFont("helvetica",opt.boldAll?"bold":"normal");
    if(lines.length){
      doc.text(lines[0],x+labelW,state.y);
      for(let i=1;i<lines.length;i++)doc.text(lines[i],x,state.y+i*lineH);
    }
  }else{
    doc.text(lines,x,state.y,{lineHeightFactor:1});
  }
  state.y+=need;
}
function richParagraph(doc,label,boldPrefix,text,state){
  const width=172,lineH=5,x=20,prefix=boldPrefix||"";
  doc.setFont("helvetica","bold");
  const labelW=doc.getTextWidth(label),prefixW=doc.getTextWidth(prefix);
  doc.setFont("helvetica","normal");
  const first=prefix+text,firstLines=doc.splitTextToSize(first,width-labelW),need=firstLines.length*lineH+3;
  ensureSpace(doc,state,need);
  doc.setFont("helvetica","bold");doc.text(label,x,state.y);
  doc.setFont("helvetica","bold");doc.text(prefix,x+labelW,state.y);
  doc.setFont("helvetica","normal");
  const restLines=doc.splitTextToSize(text,width-labelW-prefixW);
  if(restLines.length){
    doc.text(restLines[0],x+labelW+prefixW,state.y);
    for(let i=1;i<restLines.length;i++)doc.text(restLines[i],x,state.y+i*lineH);
  }
  state.y+=need;
}
let logoCache;
function loadLogo(){
  if(logoCache)return Promise.resolve(logoCache);
  return new Promise(resolve=>{
    const i=new Image();
    i.onload=()=>{logoCache=i;resolve(i)};
    i.onerror=()=>resolve(null);
    i.src="8cfe7577-9f1e-4c6e-b5e7-e9bb65569ef7.png";
  });
}
function bankText(prefix){
  const bank=$(prefix+"BankCode")?.selectedOptions[0]?.textContent||"",agency=v(prefix+"Agency"),account=v(prefix+"Account"),type=$(prefix+"AccountType")?.selectedOptions[0]?.textContent||"",pix=v(prefix+"Pix");
  return [bank&&bank!=="Selecione o banco"?bank:"",agency?"Agência "+agency:"",account?"Conta "+type.toLowerCase()+" "+account:"",pix?"PIX "+pix:""].filter(Boolean).join(", ");
}
function bankParts(prefix){
  const bank=$(prefix+"BankCode")?.selectedOptions[0]?.textContent||"",agency=v(prefix+"Agency"),account=v(prefix+"Account"),type=$(prefix+"AccountType")?.selectedOptions[0]?.textContent||"",pix=v(prefix+"Pix"),a=[];
  if(bank&&bank!=="Selecione o banco")a.push({text:bank,bold:true});
  if(agency)a.push({text:(a.length?", ":"")+"Agência ",bold:false},{text:agency,bold:true});
  if(account)a.push({text:(a.length?", ":"")+"Conta "+type.toLowerCase()+" ",bold:false},{text:account,bold:true});
  if(pix)a.push({text:(a.length?", ":"")+"PIX ",bold:false},{text:pix,bold:true});
  return a.length?a:[{text:"",bold:false}];
}
function pageHeader(doc,logo){
  if(logo)doc.addImage(logo,"PNG",92,5,26,20);
  doc.setFont("helvetica","bold");doc.setFontSize(8);
  doc.text("Erica",105,29,{align:"center"});
  doc.text("Bronca Creci : 199.167-F",105,33,{align:"center"});
}
async function pdf(previewOnly=false){
  if(!previewOnly&&$("checkin").value&&$("checkout").value&&!dates())return alert("Corrija as datas antes de gerar.");
  if(!window.jspdf||!window.jspdf.jsPDF)return alert("O motor de PDF não foi carregado. No navegador, permita o script externo usado pelo gerador (jsDelivr) para gerar o arquivo PDF.");
  if(!previewOnly&&v("tenantCpf")&&!cpfOk(v("tenantCpf")))return alert("CPF do locatário inválido.");
  if(!previewOnly&&(!v("tenantName")||!v("propertyStreet")||!v("checkin")||!v("checkout")))return alert("Preencha nome do locatário, imóvel e datas.");

  const J=window.jspdf.jsPDF,doc=new J({unit:"mm",format:"a4"}),logo=await loadLogo();
  currentLogo=logo;
  const s={y:49}; pageHeader(doc,logo);
  doc.setFont("helvetica","bold");doc.setFontSize(16);
  doc.text("CONTRATO DE ALUGUEL DE TEMPORADA",105,s.y,{align:"center"});
  s.y+=12;doc.setFontSize(10.5);

  richText(doc,"LOCADOR: ",[{text:owner(),bold:true},{text:" domiciliado em ",bold:false},{text:addr("owner"),bold:true},{text:".",bold:false}],s);
  richText(doc,"LOCATÁRIO: ",[{text:v("tenantName")+", "+v("tenantCivil")+", "+v("tenantJob"),bold:true},{text:", portador do RG ",bold:false},{text:v("tenantRg"),bold:true},{text:" inscrito no CPF: ",bold:false},{text:v("tenantCpf"),bold:true},{text:", residente e domiciliado à ",bold:false},{text:addr("tenant"),bold:true},{text:".",bold:false}],s);
  richText(doc,"IMÓVEL: ",[{text:addr("property")+(v("propertyCondo")?" "+v("propertyCondo"):""),bold:true},{text:".",bold:false}],s);
  const nights=+$("nights").value||0,clean=+$("cleanValue").value||0,rent=+$("rentValue").value||0,total=rent+clean;
  richText(doc,"PRAZO: ",[
    {text:nights+" ("+words(nights)+" diárias)",bold:true},
    {text:" Iniciando a partir das ",bold:false},{text:v("checkinTime")+" horas",bold:true},
    {text:" do dia ",bold:false},{text:br(v("checkin")),bold:true},
    {text:" sendo a saída no dia ",bold:false},{text:br(v("checkout")),bold:true},
    {text:" até as ",bold:false},{text:v("checkoutTime")+" horas",bold:true},
    {text:", oportunidade em que o LOCATÁRIO devolverá as chaves na ",bold:false},{text:v("keyPlace"),bold:true},
    {text:", obrigando-se a restituir o imóvel locado no perfeito estado de conservação em que o recebeu. Será incluso no valor total desta locação, a taxa de limpeza de ",bold:false},
    {text:moneyText(clean),bold:true},{text:" que serão depositados juntos com o valor de reserve do imovel.",bold:false}
  ],s);
  const ro=+$("reservationOwnerValue").value||0,rb=+$("reservationBrokerValue").value||0;
  const installments=[...document.querySelectorAll(".installment")];
  paragraph(doc,"VALOR: ","R$ "+numText(total)+" ("+moneyWords(total)+")",s,{boldAll:true});
  paragraph(doc,"QUANTIDADE DE PARCELAS: ",String(installments.length),s,{boldAll:true});
  if(ro)richText(doc,"Reserva: ",[
    {text:"a) R$ "+numText(ro)+" ("+moneyWords(ro)+")",bold:true},
    {text:" pagos na data de assinatura deste contrato na conta do locador ",bold:false},
    {text:bankText("owner"),bold:true},{text:".",bold:false}
  ],s);
  if(rb)richText(doc,"",[
    {text:"b) R$ "+numText(rb)+" ("+moneyWords(rb)+")",bold:true},
    {text:" pagos na data de assinatura deste contrato na conta da imobiliária, mediante depósito, transferência bancária ou PIX para a conta ",bold:false},
    {text:bankText("broker"),bold:true},{text:".",bold:false}
  ],s);
  installments.forEach((x,i)=>{
    const pv=+(x.querySelector(".pvalue").value)||0,pd=x.querySelector(".pdate").value,target=x.querySelector(".ptarget").value;
    const account=target==="broker"?bankText("broker"):bankText("owner");
    const who=target==="broker"?"conta do corretor":"conta do locador";
    richParagraph(doc,"PARCELA "+(i+1)+": ","R$ "+numText(pv)+" ("+moneyWords(pv)+") ","pagos até data "+br(pd)+" na "+who+" "+account+".",s);
    paragraph(doc,"","A conta do locador: "+bankText("owner")+". A conta da imobiliária: "+bankText("broker")+".",s,{boldAll:true});
  });
  paragraph(doc,"","Os comprovantes dos depósitos servirão como recibo do pagamento.",s,{boldAll:true});
  paragraph(doc,"Parágrafo 1: ","Não cumprido pagamento nas datas estabelecidas acima ensejará uma multa de "+v("lateFinePct")+"% do valor da parcela inadimplida.",s);
  paragraph(doc,"CAUÇÃO: ","Desde já, fica estabelecido que ao efetuar o check-in a locatária deixara em responsabilidade do corretor um cheque caução de "+moneyText(+$("cautionValue").value||0)+" que será devolvido após vistoria do imóvel e constatação da integridade do imóvel.",s);
  paragraph(doc,"Parágrafo 1: ","deve ser enviado uma foto do cheque que será dado como caução no ato da assinatura desse contrato para consulta e análise, que poderá ser recusado caso, o CPF esteja com restrição nos órgão de defesa do consumidor.",s);
  paragraph(doc,"RESCISÃO: ","O presente contrato destina-se única e exclusivamente para fins de aluguel de temporada, sendo intransferível, não podendo o imóvel ser sublocado, cedido ou emprestado, sob qualquer pretexto, tendo a sua rescisão automática no dies a quo.",s);
  paragraph(doc,"DESISTÊNCIA: ","Em caso de desistência do LOCATÁRIO, a título de ressarcimento pelos danos oriundos da desistência, o mesmo perderá os valores que já pagou, comprometendo-se a efetuar o pagamento do valor integral do contrato, caso o LOCADOR não consiga alugar o imóvel para o mesmo período.",s);
  paragraph(doc,"CAPACIDADE: ","O imóvel locado, pelo seu sistema hidráulico, comporta a habitação máxima de "+v("capacity")+" pessoas. Se o LOCATÁRIO exceder a este número, os que excederem pagará uma multa diária de "+moneyText(+$("excessPersonFine").value||0)+" por pessoa, independente das providências de desocupação imediata que poderão ser tomadas a critério do LOCADOR.",s);
  paragraph(doc,"CLAUSULA PENAL: ","A permanência no imóvel após o dies a quo implicará no pagamento em dobro do aluguel, por dia que exceder, até a sua efetiva desocupação. Neste caso, todos os outros gastos que se fizerem necessários com relação à acomodação dos inquilinos que ocupariam o imóvel, mas foram impedidos de fazê-lo devido a sua permanência abusiva no imóvel, correrão por conta do LOCATÁRIO. Em casos supervenientes que determinem a antecipação da saída do imóvel pelo LOCATÁRIO, de nenhuma forma será devolvida a quantia já paga.",s);
  paragraph(doc,"RESPONSABILIDADE: ","O LOCATÁRIO será responsável por qualquer multa que der causa, seja por desrespeito às leis federais, estaduais, municipais, e condominiais. A responsabilidade do LOCATÁRIO também se estende aos danos que causar ao imóvel, que deverão ser imediatamente reparados pelo mesmo. Em não cumprindo esta determinação, o LOCADOR fica autorizado a executar os reparos, independentemente de orçamento, à custa do LOCATÁRIO.",s);
  paragraph(doc,"","O LOCATÁRIO deve manter o imóvel (instalações sanitárias e elétricas, fechos, vidros, torneiras, ralos, pisos e calçadas, bem como os demais acessórios), os móveis e os utensílios em perfeito estado de conservação, e em boas condições de higiene, para assim restituí-los, quando findo ou rescindido este contrato. Havendo qualquer tipo de dano no imóvel, utensílios, moveis, piscina etc, período em que o locatário encontra-se na posse do imóvel, o locador imediatamente fará 3 orçamentos, optando pelo serviço de menor valor, que deverá ser ressarcido de pronto pelo locatário.",s,{boldAll:true});
  paragraph(doc,"","Fica expressmente proibido trocar os moveis dos lugares, forçar a abertura dos armarios de uso pessoal os quais estarão trancados, sendo passivel de multa no valor de R$ "+numText(+$("furnitureFine").value||2000)+" + reparação dos danos. É imprescindivel que o locatario não deixe louças e lixos na casa na sua desocupação.",s,{boldAll:true});
  paragraph(doc,"CONDIÇÕES LEGAIS: ","Rege-se o presente contrato, naquilo em que for omisso, pela Lei n° 8245/91 e lei 12.112/2009 (lei do inquilinato), Código Civil e demais disposições pertinentes à locação de imóveis, direito de vizinhança e etc.",s);
  richText(doc,"CORRETAGEM E COMISSÃO DE CORRETAGEM: ",[
    {text:"O valor pago a título de comissão de corretagem, de ",bold:false},{text:v("commissionPct")+"%",bold:true},
    {text:" do valor total de locação, é de responsabilidade do proprietário do imóvel, que será descontado da primeira parcela que sera depositado na conta indicada do corretor (",bold:false},
    {text:bankText("broker"),bold:true},{text:") na data da assinatura do contrato",bold:false}
  ],s);
  paragraph(doc,"Parágrafo 1: ","O serviço de corretagem se resume ao estabelecido no artigo 722 do Código Civil e assim, a titulo de cortesia, qualquer intermediação posterior poderá ser realizada pelo corretor.",s);
  paragraph(doc,"FORO: ","Para dirimir eventuais controvérsias relacionadas a este contrato, elegem as partes o fórum da "+v("forum")+", renunciando a qualquer outro, por mais especial que seja.",s);
  paragraph(doc,"DESPESAS JUDICIAIS: ","Se em razão do descumprimento de uma das cláusulas do presente contrato o LOCADOR fique obrigado a recorrer à tutela do Poder Judiciário, o LOCATÁRIO arcará com o pagamento integral das despesas e custas judiciais, assim como honorários advocatícios, na base de "+v("lawyerPct")+"% sob o valor da causa.",s);

  if(s.y<215){s.y+=18}else{doc.addPage();s.y=51;pageHeader(doc,logo);}
  s.y+=10;paragraph(doc,"","São Sebastião /SP, "+longDate(v("contractDate"))+".",s);
  s.y+=14;doc.setFont("helvetica","normal");doc.setFontSize(10);
  doc.text("LOCADOR:",76,s.y,{align:"center"});doc.text("LOCATÁRIO:",137,s.y,{align:"center"});s.y+=15;
  doc.text("________________________",52,s.y);doc.text("________________________",126,s.y);s.y+=12;
  doc.setFont("helvetica","bold");doc.text("TESTEMUNHAS:",31,s.y);s.y+=12;doc.setFont("helvetica","normal");
  doc.text("1ª____________________",31,s.y);doc.text("2ª____________________",128,s.y);

  if(previewOnly)return doc.output("blob");
  doc.save("Contrato_Temporada_"+(v("tenantName").replace(/\s+/g,"_")||"EBIMOB")+".pdf");
}

async function docxRuns(D,runs){return runs.map(r=>new D.TextRun({text:r.text,bold:!!r.bold,font:"Arial",size:21}));}
function docxParagraph(D,label,runs,spacing=120){
  return new D.Paragraph({children:[new D.TextRun({text:label||"",bold:true,font:"Arial",size:21}),...docxRuns(D,runs)],spacing:{after:spacing,line:276}});
}
async function saveDocx(){
  if(!window.docx)return alert("O motor de DOCX não foi carregado. Permita o script externo usado pelo gerador.");
  const D=window.docx;
  const nights=+$("nights").value||0,clean=+$("cleanValue").value||0,rent=+$("rentValue").value||0,total=rent+clean;
  const ro=+$("reservationOwnerValue").value||0,rb=+$("reservationBrokerValue").value||0;
  const installments=[...document.querySelectorAll(".installment")];
  const children=[];
  children.push(new D.Paragraph({alignment:D.AlignmentType.CENTER,spacing:{after:180},children:[new D.TextRun({text:"CONTRATO DE ALUGUEL DE TEMPORADA",bold:true,font:"Arial",size:28})]}));
  children.push(docxParagraph(D,"LOCADOR: ",[{text:owner(),bold:true},{text:" domiciliado em ",bold:false},{text:addr("owner"),bold:true},{text:".",bold:false}]));
  children.push(docxParagraph(D,"LOCATÁRIO: ",[{text:v("tenantName")+", "+v("tenantCivil")+", "+v("tenantJob"),bold:true},{text:", portador do RG ",bold:false},{text:v("tenantRg"),bold:true},{text:" inscrito no CPF: ",bold:false},{text:v("tenantCpf"),bold:true},{text:", residente e domiciliado à ",bold:false},{text:addr("tenant"),bold:true},{text:".",bold:false}]));
  children.push(docxParagraph(D,"IMÓVEL: ",[{text:addr("property")+(v("propertyCondo")?" "+v("propertyCondo"):""),bold:true},{text:".",bold:false}]));
  children.push(docxParagraph(D,"PRAZO: ",[
    {text:nights+" ("+words(nights)+" diárias)",bold:true},{text:" Iniciando a partir das ",bold:false},{text:v("checkinTime")+" horas",bold:true},
    {text:" do dia ",bold:false},{text:br(v("checkin")),bold:true},{text:" sendo a saída no dia ",bold:false},{text:br(v("checkout")),bold:true},
    {text:" até as ",bold:false},{text:v("checkoutTime")+" horas",bold:true},{text:", oportunidade em que o LOCATÁRIO devolverá as chaves na ",bold:false},
    {text:v("keyPlace"),bold:true},{text:", obrigando-se a restituir o imóvel locado no perfeito estado de conservação em que o recebeu. Será incluso no valor total desta locação, a taxa de limpeza de ",bold:false},
    {text:moneyText(clean),bold:true},{text:" que serão depositados juntos com o valor de reserve do imovel.",bold:false}
  ]));
  children.push(docxParagraph(D,"VALOR: ",[{text:"R$ "+numText(total)+" ("+moneyWords(total)+")",bold:true}]));
  children.push(docxParagraph(D,"QUANTIDADE DE PARCELAS: ",[{text:String(installments.length),bold:true}]));
  if(ro)children.push(docxParagraph(D,"Reserva: ",[{text:"a) R$ "+numText(ro)+" ("+moneyWords(ro)+")",bold:true},{text:" pagos na data de assinatura deste contrato na conta do locador ",bold:false},{text:bankText("owner"),bold:true},{text:".",bold:false}]));
  if(rb)children.push(docxParagraph(D,"",[...[
    {text:"b) R$ "+numText(rb)+" ("+moneyWords(rb)+")",bold:true},{text:" pagos na data de assinatura deste contrato na conta da imobiliária, mediante depósito, transferência bancária ou PIX para a conta ",bold:false},{text:bankText("broker"),bold:true},{text:".",bold:false}
  ]]));
  installments.forEach((x,i)=>{
    const pv=+(x.querySelector(".pvalue").value)||0,pd=x.querySelector(".pdate").value,target=x.querySelector(".ptarget").value;
    const account=bankText(target==="broker"?"broker":"owner"),who=target==="broker"?"conta do corretor":"conta do locador";
    children.push(docxParagraph(D,"PARCELA "+(i+1)+": ",[{text:"R$ "+numText(pv)+" ("+moneyWords(pv)+")",bold:true},{text:" pagos até data ",bold:false},{text:br(pd),bold:true},{text:" na "+who+" ",bold:false},{text:account,bold:true},{text:".",bold:false}]));
    children.push(docxParagraph(D,"",[{text:"A conta do locador: ",bold:false},{text:bankText("owner"),bold:true},{text:". A conta da imobiliária: ",bold:false},{text:bankText("broker"),bold:true},{text:".",bold:false}]));
  });
  children.push(docxParagraph(D,"",[{text:"Os comprovantes dos depósitos servirão como recibo do pagamento.",bold:false}]));
  children.push(docxParagraph(D,"Parágrafo 1: ",[{text:"Não cumprido pagamento nas datas estabelecidas acima ensejará uma multa de ",bold:false},{text:v("lateFinePct")+"%",bold:true},{text:" do valor da parcela inadimplida.",bold:false}]));
  children.push(docxParagraph(D,"CAUÇÃO: ",[{text:"Desde já, fica estabelecido que ao efetuar o check-in a locatária deixara em responsabilidade do corretor um cheque caução de ",bold:false},{text:moneyText(+$("cautionValue").value||0),bold:true},{text:" que será devolvido após vistoria do imóvel e constatação da integridade do imóvel.",bold:false}]));
  children.push(docxParagraph(D,"Parágrafo 1: ",[{text:"deve ser enviado uma foto do cheque que será dado como caução no ato da assinatura desse contrato para consulta e análise, que poderá ser recusado caso, o CPF esteja com restrição nos órgão de defesa do consumidor.",bold:false}]));
  children.push(docxParagraph(D,"RESCISÃO: ",[{text:"O presente contrato destina-se única e exclusivamente para fins de aluguel de temporada, sendo intransferível, não podendo o imóvel ser sublocado, cedido ou emprestado, sob qualquer pretexto, tendo a sua rescisão automática no dies a quo.",bold:false}]));
  children.push(docxParagraph(D,"DESISTÊNCIA: ",[{text:"Em caso de desistência do LOCATÁRIO, a título de ressarcimento pelos danos oriundos da desistência, o mesmo perderá os valores que já pagou, comprometendo-se a efetuar o pagamento do valor integral do contrato, caso o LOCADOR não consiga alugar o imóvel para o mesmo período.",bold:false}]));
  children.push(docxParagraph(D,"CAPACIDADE: ",[{text:"O imóvel locado, pelo seu sistema hidráulico, comporta a habitação máxima de ",bold:false},{text:v("capacity"),bold:true},{text:" pessoas. Se o LOCATÁRIO exceder a este número, os que excederem pagará uma multa diária de ",bold:false},{text:moneyText(+$("excessPersonFine").value||0),bold:true},{text:" por pessoa, independente das providências de desocupação imediata que poderão ser tomadas a critério do LOCADOR.",bold:false}]));
  children.push(docxParagraph(D,"CLAUSULA PENAL: ",[{text:"A permanência no imóvel após o dies a quo implicará no pagamento em dobro do aluguel, por dia que exceder, até a sua efetiva desocupação. Neste caso, todos os outros gastos que se fizerem necessários com relação à acomodação dos inquilinos que ocupariam o imóvel, mas foram impedidos de fazê-lo devido a sua permanência abusiva no imóvel, correrão por conta do LOCATÁRIO. Em casos supervenientes que determinem a antecipação da saída do imóvel pelo LOCATÁRIO, de nenhuma forma será devolvida a quantia já paga.",bold:false}]));
  children.push(docxParagraph(D,"RESPONSABILIDADE: ",[{text:"O LOCATÁRIO será responsável por qualquer multa que der causa, seja por desrespeito às leis federais, estaduais, municipais, e condominiais. A responsabilidade do LOCATÁRIO também se estende aos danos que causar ao imóvel, que deverão ser imediatamente reparados pelo mesmo. Em não cumprindo esta determinação, o LOCADOR fica autorizado a executar os reparos, independentemente de orçamento, à custa do LOCATÁRIO.",bold:false}]));
  children.push(docxParagraph(D,"",[{text:"O LOCATÁRIO deve manter o imóvel (instalações sanitárias e elétricas, fechos, vidros, torneiras, ralos, pisos e calçadas, bem como os demais acessórios), os móveis e os utensílios em perfeito estado de conservação, e em boas condições de higiene, para assim restituí-los, quando findo ou rescindido este contrato. Havendo qualquer tipo de dano no imóvel, utensílios, moveis, piscina etc, período em que o locatário encontra-se na posse do imóvel, o locador imediatamente fará 3 orçamentos, optando pelo serviço de menor valor, que deverá ser ressarcido de pronto pelo locatário.",bold:false}]));
  children.push(docxParagraph(D,"",[{text:"Fica expressmente proibido trocar os moveis dos lugares, forçar a abertura dos armarios de uso pessoal os quais estarão trancados, sendo passivel de multa no valor de R$ "+numText(+$("furnitureFine").value||2000)+" + reparação dos danos. É imprescindivel que o locatario não deixe louças e lixos na casa na sua desocupação.",bold:false}]));
  children.push(docxParagraph(D,"CONDIÇÕES LEGAIS: ",[{text:"Rege-se o presente contrato, naquilo em que for omisso, pela Lei n° 8245/91 e lei 12.112/2009 (lei do inquilinato), Código Civil e demais disposições pertinentes à locação de imóveis, direito de vizinhança e etc.",bold:false}]));
  children.push(docxParagraph(D,"CORRETAGEM E COMISSÃO DE CORRETAGEM: ",[{text:"O valor pago a título de comissão de corretagem, de ",bold:false},{text:v("commissionPct")+"%",bold:true},{text:" do valor total de locação, é de responsabilidade do proprietário do imóvel, que será descontado da primeira parcela que sera depositado na conta indicada do corretor (",bold:false},{text:bankText("broker"),bold:true},{text:") na data da assinatura do contrato",bold:false}]));
  children.push(docxParagraph(D,"Parágrafo 1: ",[{text:"O serviço de corretagem se resume ao estabelecido no artigo 722 do Código Civil e assim, a titulo de cortesia, qualquer intermediação posterior poderá ser realizada pelo corretor.",bold:false}]));
  children.push(docxParagraph(D,"FORO: ",[{text:"Para dirimir eventuais controvérsias relacionadas a este contrato, elegem as partes o fórum da ",bold:false},{text:v("forum"),bold:true},{text:", renunciando a qualquer outro, por mais especial que seja.",bold:false}]));
  children.push(docxParagraph(D,"DESPESAS JUDICIAIS: ",[{text:"Se em razão do descumprimento de uma das cláusulas do presente contrato o LOCADOR fique obrigado a recorrer à tutela do Poder Judiciário, o LOCATÁRIO arcará com o pagamento integral das despesas e custas judiciais, assim como honorários advocatícios, na base de ",bold:false},{text:v("lawyerPct")+"%",bold:true},{text:" sob o valor da causa.",bold:false}]));
  children.push(new D.Paragraph({spacing:{before:240,after:120},children:[new D.TextRun({text:"São Sebastião /SP, "+longDate(v("contractDate"))+".",font:"Arial",size:21})]}));
  children.push(new D.Paragraph({spacing:{before:240,after:120},children:[new D.TextRun({text:"LOCADOR:                                      LOCATÁRIO:",font:"Arial",size:21,bold:true})]}));
  children.push(new D.Paragraph({spacing:{after:160},children:[new D.TextRun({text:"________________________                    ________________________",font:"Arial",size:21})]}));
  children.push(new D.Paragraph({children:[new D.TextRun({text:"TESTEMUNHAS:",font:"Arial",size:21,bold:true})]}));
  children.push(new D.Paragraph({spacing:{after:100},children:[new D.TextRun({text:"1ª____________________                         2ª____________________",font:"Arial",size:21})]}));

  let headerChildren=[new D.Paragraph({alignment:D.AlignmentType.CENTER,children:[new D.TextRun({text:"Erica",bold:true,font:"Arial",size:16})]}),new D.Paragraph({alignment:D.AlignmentType.CENTER,spacing:{after:60},children:[new D.TextRun({text:"Bronca Creci : 199.167-F",bold:true,font:"Arial",size:16})]})];
  const doc=new D.Document({creator:"EBIMOB",sections:[{headers:{default:new D.Header({children:headerChildren})},properties:{page:{margin:{top:1200,right:1134,bottom:1200,left:1134}}},children}]});
  const blob=await D.Packer.toBlob(doc);
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="Contrato_Temporada_"+(v("tenantName").replace(/\s+/g,"_")||"EBIMOB")+".docx";a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),60000);
}
function preview(){
  if(!window.jspdf||!window.jspdf.jsPDF)return alert("O motor de PDF não foi carregado.");
  const w=window.open("about:blank","_blank");
  if(!w)return alert("Permita pop-ups para visualizar o contrato.");
  try{
    const blob=await pdf(true),url=URL.createObjectURL(blob);
    w.location.href=url;
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){w.close();alert(e.message||"Não foi possível gerar a pré-visualização.")}
}
["btnGerarTop","btnGerarBottom"].forEach(id=>$(id).onclick=pdf);
$("btnPreview").onclick=preview;
$("btnGerarDocx").onclick=saveDocx;
$("btnLimpar").onclick=()=>{if(confirm("Limpar todos os campos?"))location.reload()};
