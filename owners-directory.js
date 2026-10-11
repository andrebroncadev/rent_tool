(function(){
const client=window.supabaseClient;
if(!client)return;
const fields={
 owner_type:"", owner_name:"ownerName", cnpj:"ownerCnpj", representative_name:"ownerRep", representative_rg:"ownerRg", representative_cpf:"ownerCpf",
 pf_name:"ownerPfName", pf_job:"ownerPfJob", pf_civil_status:"ownerPfCivil", pf_rg:"ownerPfRg", pf_cpf:"ownerPfCpf",
 cep:"ownerCep",street:"ownerStreet",number:"ownerNumber",complement:"ownerComp",neighborhood:"ownerBairro",city:"ownerCity",uf:"ownerUf",
 bank_code:"ownerBankCode",bank_agency:"ownerAgency",bank_account_type:"ownerAccountType",bank_account:"ownerAccount",pix:"ownerPix"
};
const propFields={cep:"propertyCep",street:"propertyStreet",number:"propertyNumber",complement:"propertyComp",condominium:"propertyCondo",neighborhood:"propertyBairro",city:"propertyCity",uf:"propertyUf",capacity:"capacity"};
const val=id=>document.getElementById(id)?.value?.trim()||"";
const set=(id,value)=>{const e=document.getElementById(id);if(e&&value!==null&&value!==undefined)e.value=String(value)};
function mount(){
 const ownerCard=document.getElementById("ownerPJ")?.closest(".card");
 const propertyCard=document.getElementById("propertyStreet")?.closest(".card");
 if(!ownerCard||!propertyCard)return;
 const panel=document.createElement("div");panel.className="card-body no-print";panel.id="savedDirectory";
 panel.innerHTML='<div class="grid"><div class="field c6"><label for="savedOwnerSelect">Proprietário salvo</label><select id="savedOwnerSelect"><option value="">Novo proprietário / preencher manualmente</option></select></div><div class="field c6"><label for="savedPropertySelect">Imóvel salvo deste proprietário</label><select id="savedPropertySelect" disabled><option value="">Selecione um proprietário primeiro</option></select></div><div class="field c12" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn secondary" type="button" id="saveOwnerBtn">Salvar proprietário</button><button class="btn secondary" type="button" id="savePropertyBtn">Salvar imóvel para este proprietário</button><span id="directoryStatus" class="hint" role="status"></span></div></div>';
 ownerCard.insertBefore(panel,ownerCard.children[1]||null);
 const ownerSelect=panel.querySelector("#savedOwnerSelect"),propSelect=panel.querySelector("#savedPropertySelect"),status=panel.querySelector("#directoryStatus");
 let owners=[],properties=[];
 const say=t=>status.textContent=t;
 async function loadOwners(selectedId=""){
  const {data,error}=await client.from("owners").select("*").order("owner_name");
  if(error){say("Erro ao carregar proprietários. Confira a conexão e a conta.");return}
  owners=data||[];ownerSelect.innerHTML='<option value="">Novo proprietário / preencher manualmente</option>';
  owners.forEach(o=>{const opt=document.createElement("option");opt.value=o.id;opt.textContent=o.owner_type==="pf"?(o.pf_name||"Pessoa física"):(o.owner_name||"Pessoa jurídica");ownerSelect.appendChild(opt)});
  ownerSelect.value=selectedId; if(selectedId)await selectOwner();
 }
 function fillOwner(o){document.querySelectorAll("[data-owner-type]").forEach(b=>{if(b.dataset.ownerType===o.owner_type)b.click()});Object.entries(fields).forEach(([k,id])=>{if(id)set(id,o[k]??"")});}
 function fillProperty(p){Object.entries(propFields).forEach(([k,id])=>set(id,p[k]??""))}
 async function selectOwner(){
  const o=owners.find(x=>x.id===ownerSelect.value);propSelect.innerHTML='<option value="">Selecione um imóvel salvo ou deixe em branco</option>';
  if(!o){propSelect.disabled=true;return}
  fillOwner(o);const {data,error}=await client.from("properties").select("*").eq("owner_id",o.id).order("created_at");
  if(error){say("Proprietário carregado, mas não foi possível carregar os imóveis.");return}
  properties=data||[];propSelect.disabled=false;
  properties.forEach((p,i)=>{const opt=document.createElement("option");opt.value=p.id;opt.textContent=[p.street,p.number,p.neighborhood,p.city].filter(Boolean).join(", ")||("Imóvel "+(i+1));propSelect.appendChild(opt)});
  say("Dados do proprietário carregados.");
 }
 ownerSelect.addEventListener("change",async()=>{await selectOwner()});
 propSelect.addEventListener("change",()=>{const p=properties.find(x=>x.id===propSelect.value);if(p){fillProperty(p);say("Dados do imóvel carregados.")}});
 panel.querySelector("#saveOwnerBtn").addEventListener("click",async()=>{
  const {data:{user}}=await client.auth.getUser();if(!user){say("Faça login novamente.");return}
  const type=document.querySelector('[data-owner-type].active')?.dataset.ownerType||"pj";
  const row={user_id:user.id,owner_type:type};
  Object.entries(fields).forEach(([k,id])=>{if(id)row[k]=val(id)||null});
  say("Salvando proprietário…");
  let req=ownerSelect.value?client.from("owners").update(row).eq("id",ownerSelect.value).select().single():client.from("owners").insert(row).select().single();
  const {data,error}=await req;if(error){say("Erro ao salvar proprietário. Verifique os campos e tente novamente.");return}
  await loadOwners(data.id);say("Proprietário salvo.");
 });
 panel.querySelector("#savePropertyBtn").addEventListener("click",async()=>{
  const ownerId=ownerSelect.value;if(!ownerId){say("Salve ou selecione um proprietário antes de salvar o imóvel.");return}
  const {data:{user}}=await client.auth.getUser();if(!user){say("Faça login novamente.");return}
  const row={user_id:user.id,owner_id:ownerId};Object.entries(propFields).forEach(([k,id])=>{if(id)row[k]=val(id)||null});
  if(row.capacity!==null){row.capacity=Number(row.capacity);if(!Number.isFinite(row.capacity))row.capacity=null}
  say("Salvando imóvel…");
  const {data,error}=await client.from("properties").insert(row).select().single();
  if(error){say("Erro ao salvar imóvel. Confira os dados e tente novamente.");return}
  await selectOwner();propSelect.value=data.id;fillProperty(data);say("Imóvel salvo e vinculado ao proprietário.");
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();