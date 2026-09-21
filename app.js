const $=id=>document.getElementById(id);
const fmt=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
let ownerType="pj",seq=0;

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
  const r=+$("rentValue").value||0,c=+$("cleanValue").value||0,q=+$("commissionPct").value||0,s=+$("reservationValue").value||0;
  $("totalValue").textContent=fmt.format(r+c);
  $("commissionValue").textContent=fmt.format(r*q/100);
  $("balanceValue").textContent=fmt.format(Math.max(0,r+c-s));
}
["rentValue","cleanValue","commissionPct","reservationValue"].forEach(i=>$(i).oninput=money);money();

$("btnAddInstallment").onclick=()=>{
  seq++;
  const x=document.createElement("div");
  x.className="installment";
  x.innerHTML='<div class="installment-title"><b>PARCELA '+seq+'</b><button type="button" class="remove">Remover</button></div><div class="grid"><div class="field c6"><label>Vencimento</label><input class="pdate" type="date"></div><div class="field c6"><label>Valor (R$)</label><input class="pvalue" type="number" step="0.01" min="0"></div></div>';
  x.querySelector(".remove").onclick=()=>{x.remove();renum()};
  $("installments").appendChild(x);
};
function renum(){document.querySelectorAll(".installment").forEach((x,i)=>x.querySelector("b").textContent="PARCELA "+(i+1))}

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

function ensureSpace(doc,state,need){
  if(state.y+need>268){doc.addPage();state.y=35}
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
  const labelW=doc.getTextWidth(label);
  const prefixW=doc.getTextWidth(prefix);
  doc.setFont("helvetica","normal");
  const lines=doc.splitTextToSize(text,width-labelW-prefixW);
  const need=lines.length*lineH+3;
  ensureSpace(doc,state,need);
  doc.setFont("helvetica","bold");doc.text(label,x,state.y);
  let xx=x+labelW;
  doc.text(prefix,xx,state.y);
  for(let i=0;i<lines.length;i++)doc.text(lines[i],i?x:xx+prefixW,state.y+i*lineH);
  state.y+=need;
}
function pageHeader(doc){
  doc.setFont("helvetica","bold");doc.setFontSize(8);
  doc.text("Erica",105,18,{align:"center"});
  doc.text("Bronca Creci : 199.167-F",105,22,{align:"center"});
}
function pdf(){
  if(!dates())return alert("Corrija as datas antes de gerar.");
  if(!window.jspdf||!window.jspdf.jsPDF)return alert("O motor de PDF não foi carregado. No Brave, permita o script externo usado pelo gerador (jsDelivr) para gerar o arquivo PDF.");
  if(v("tenantCpf")&&!cpfOk(v("tenantCpf")))return alert("CPF do locatário inválido.");
  if(!v("tenantName")||!v("propertyStreet")||!v("checkin")||!v("checkout"))return alert("Preencha nome do locatário, imóvel e datas.");

  const J=window.jspdf.jsPDF,doc=new J({unit:"mm",format:"a4"});
  const s={y:49}; pageHeader(doc);
  doc.setFont("helvetica","bold");doc.setFontSize(16);
  doc.text("CONTRATO DE ALUGUEL DE TEMPORADA",105,s.y,{align:"center"});
  s.y+=12;doc.setFontSize(10.5);

  paragraph(doc,"LOCADOR: ",owner()+" domiciliado em "+addr("owner")+".",s);
  paragraph(doc,"LOCATÁRIO: ",v("tenantName")+", "+v("tenantCivil")+", "+v("tenantJob")+", portador do RG "+v("tenantRg")+" inscrito no CPF: "+v("tenantCpf")+", residente e domiciliado à "+addr("tenant")+".",s);
  paragraph(doc,"IMÓVEL: ",addr("property")+(v("propertyCondo")?" "+v("propertyCondo"):"")+".",s);
  const nights=+$("nights").value||0,clean=+$("cleanValue").value||0,rent=+$("rentValue").value||0,total=rent+clean;
  paragraph(doc,"PRAZO: ",nights+" ("+nights+") diárias, iniciando a partir das "+v("checkinTime")+" horas do dia "+br(v("checkin"))+" sendo a saída no dia "+br(v("checkout"))+" até as "+v("checkoutTime")+" horas, oportunidade em que o LOCATÁRIO devolverá as chaves na "+v("keyPlace")+", obrigando-se a restituir o imóvel locado no perfeito estado de conservação em que o recebeu. Será incluso no valor total desta locação, a taxa de limpeza de "+moneyText(clean)+" que serão depositados juntos com o valor de reserve do imovel.",s);
  paragraph(doc,"VALOR: ","R$ "+numText(total)+".",s,{boldAll:true});
  richParagraph(doc,"Reserva: ","R$ "+numText(+$("reservationValue").value||0)+" ","pagos na data de assinatura deste contrato na conta do locador "+v("ownerPayment")+".",s);
  document.querySelectorAll(".installment").forEach((x,i)=>{const pv=+x.querySelector(".pvalue").value||0,pd=x.querySelector(".pdate").value;richParagraph(doc,"PARCELA "+(i+1)+": ","R$ "+numText(pv)+" ","pagos ate data "+br(pd)+" na conta do locador "+v("ownerPayment")+".",s)});
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
  paragraph(doc,"CORRETAGEM E COMISSÃO DE CORRETAGEM: ","O valor pago a título de comissão de corretagem, de "+v("commissionPct")+"% do valor total de locação, é de responsabilidade do proprietário do imóvel, que será descontado da primeira parcela que sera depositado na conta indicada do corretor",s);
  paragraph(doc,"","("+v("brokerPayment")+")",s,{boldAll:true});
  paragraph(doc,"","na data da assinatura do contrato.",s);
  paragraph(doc,"Parágrafo 1: ","O serviço de corretagem se resume ao estabelecido no artigo 722 do Código Civil e assim, a titulo de cortesia, qualquer intermediação posterior poderá ser realizada pelo corretor.",s);
  paragraph(doc,"FORO: ","Para dirimir eventuais controvérsias relacionadas a este contrato, elegem as partes o fórum da "+v("forum")+", renunciando a qualquer outro, por mais especial que seja.",s);
  paragraph(doc,"DESPESAS JUDICIAIS: ","Se em razão do descumprimento de uma das cláusulas do presente contrato o LOCADOR fique obrigado a recorrer à tutela do Poder Judiciário, o LOCATÁRIO arcará com o pagamento integral das despesas e custas judiciais, assim como honorários advocatícios, na base de "+v("lawyerPct")+"% sob o valor da causa.",s);

  doc.addPage();s.y=51;pageHeader(doc);
  s.y+=10;paragraph(doc,"","São Sebastião /SP, "+longDate(v("contractDate"))+".",s);
  s.y+=14;doc.setFont("helvetica","normal");doc.setFontSize(10);
  doc.text("LOCADOR:",76,s.y,{align:"center"});doc.text("LOCATÁRIO:",137,s.y,{align:"center"});s.y+=15;
  doc.text("________________________",52,s.y);doc.text("________________________",126,s.y);s.y+=12;
  doc.setFont("helvetica","bold");doc.text("TESTEMUNHAS:",31,s.y);s.y+=12;doc.setFont("helvetica","normal");
  doc.text("1ª____________________",31,s.y);doc.text("2ª____________________",128,s.y);

  doc.save("Contrato_Temporada_"+(v("tenantName").replace(/\s+/g,"_")||"EBIMOB")+".pdf");
}

function preview(){alert("Pré-visualização rápida: revise os campos e clique em Gerar PDF.")}
["btnGerarTop","btnGerarBottom"].forEach(id=>$(id).onclick=pdf);
$("btnPreview").onclick=preview;
$("btnLimpar").onclick=()=>{if(confirm("Limpar todos os campos?"))location.reload()};
