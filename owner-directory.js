(() => {
  "use strict";
  const SUPABASE_URL = "https://vqenzubwfzwwndgjucim.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_s4o-wW-rdUbEesSKe6NhNg_u7gzYeCf";
  const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const $ = (id) => document.getElementById(id);
  if (!client) {
    const status = $("directoryStatus");
    if (status) status.textContent = "Não foi possível carregar o serviço de login. Atualize a página e tente novamente.";
    return;
  }
  let sessionUser = null;
  let ownerId = null;
  let propertyId = null;
  const ownerFields = {
    owner_name: "ownerName", cnpj: "ownerCnpj", representative_name: "ownerRep",
    representative_rg: "ownerRg", representative_cpf: "ownerCpf", pf_name: "ownerPfName",
    pf_job: "ownerPfJob", pf_civil_status: "ownerPfCivil", pf_rg: "ownerPfRg", pf_cpf: "ownerPfCpf",
    cep: "ownerCep", street: "ownerStreet", number: "ownerNumber", complement: "ownerComp",
    neighborhood: "ownerBairro", city: "ownerCity", uf: "ownerUf", bank_code: "ownerBankCode",
    bank_agency: "ownerAgency", bank_account_type: "ownerAccountType", bank_account: "ownerAccount", pix: "ownerPix"
  };
  const propertyFields = {
    cep: "propertyCep", street: "propertyStreet", number: "propertyNumber", complement: "propertyComp",
    condominium: "propertyCondo", neighborhood: "propertyBairro", city: "propertyCity", uf: "propertyUf", capacity: "capacity"
  };
  function status(message, isError = false, area = "directoryDataStatus") {
    const el = $(area);
    if (!el) return;
    el.textContent = message;
    el.className = "status " + (message ? (isError ? "bad" : "ok") : "");
  }
  function setValue(id, value) {
    const el = $(id);
    if (!el) return;
    el.value = value == null ? "" : String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function clearFields(map) { Object.values(map).forEach(id => setValue(id, "")); }
  function fillFields(map, row) { Object.entries(map).forEach(([column, id]) => setValue(id, row[column])); }
  function currentOwnerName(row) {
    return row.owner_type === "pf" ? (row.pf_name || "Pessoa física sem nome") : (row.owner_name || "Pessoa jurídica sem nome");
  }
  function resetOwnerForm() {
    ownerId = null;
    $("savedOwnerSelect").value = "";
    $("savedPropertySelect").innerHTML = '<option value="">Selecione um imóvel</option>';
    propertyId = null;
    clearFields(ownerFields);
    clearFields(propertyFields);
    document.querySelector('[data-owner-type="pj"]')?.click();
    status("Novo proprietário: preencha os campos e clique em “Salvar proprietário”.");
  }
  function resetPropertyForm() {
    propertyId = null;
    $("savedPropertySelect").value = "";
    clearFields(propertyFields);
    status(ownerId ? "Novo imóvel: preencha o endereço e clique em “Salvar imóvel”." : "Selecione ou salve um proprietário antes de cadastrar um imóvel.", !ownerId);
  }
  async function loadOwners(selectId = "") {
    const { data, error } = await client.from("owners")
      .select("id,owner_type,owner_name,cnpj,representative_name,representative_rg,representative_cpf,pf_name,pf_job,pf_civil_status,pf_rg,pf_cpf,cep,street,number,complement,neighborhood,city,uf,bank_code,bank_agency,bank_account_type,bank_account,pix,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const select = $("savedOwnerSelect");
    select.innerHTML = '<option value="">Selecione um proprietário</option>';
    (data || []).forEach(row => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = currentOwnerName(row) + (row.city ? " — " + row.city : "");
      select.appendChild(option);
    });
    if (selectId) {
      select.value = selectId;
      if (select.value) await loadOwner(selectId);
    }
  }
  async function loadOwner(id) {
    ownerId = id || null;
    propertyId = null;
    $("savedPropertySelect").innerHTML = '<option value="">Selecione um imóvel</option>';
    if (!id) return;
    const { data: owner, error } = await client.from("owners").select("*").eq("id", id).single();
    if (error) throw error;
    document.querySelector('[data-owner-type="' + owner.owner_type + '"]')?.click();
    fillFields(ownerFields, owner);
    const { data: properties, error: pError } = await client.from("properties")
      .select("*").eq("owner_id", id).order("created_at", { ascending: false });
    if (pError) throw pError;
    (properties || []).forEach(row => {
      const option = document.createElement("option");
      option.value = row.id;
      const address = [row.street, row.number, row.neighborhood, row.city].filter(Boolean).join(", ");
      option.textContent = address || "Imóvel sem endereço";
      $("savedPropertySelect").appendChild(option);
    });
    status("Proprietário carregado. Selecione um imóvel ou cadastre outro.");
  }
  async function loadProperty(id) {
    propertyId = id || null;
    if (!id) return;
    const { data, error } = await client.from("properties").select("*").eq("id", id).single();
    if (error) throw error;
    fillFields(propertyFields, data);
    status("Dados do imóvel carregados no formulário.");
  }
  function ownerPayload() {
    const row = { owner_type: document.querySelector("[data-owner-type].active")?.dataset.ownerType || "pj" };
    Object.entries(ownerFields).forEach(([column, id]) => { row[column] = $(id)?.value?.trim() || null; });
    return row;
  }
  function propertyPayload() {
    const row = { owner_id: ownerId, capacity: $("capacity").value === "" ? null : Number($("capacity").value) };
    Object.entries(propertyFields).forEach(([column, id]) => {
      if (column !== "capacity") row[column] = $(id)?.value?.trim() || null;
    });
    return row;
  }
  async function saveOwner() {
    if (!sessionUser) throw new Error("Entre no diretório antes de salvar.");
    const row = { ...ownerPayload(), user_id: sessionUser.id };
    if (row.owner_type === "pf" && !row.pf_name) throw new Error("Informe o nome completo do proprietário pessoa física.");
    if (row.owner_type === "pj" && !row.owner_name) throw new Error("Informe a razão social/nome do proprietário pessoa jurídica.");
    let result;
    if (ownerId) result = await client.from("owners").update(row).eq("id", ownerId).select("id").single();
    else result = await client.from("owners").insert(row).select("id").single();
    if (result.error) throw result.error;
    ownerId = result.data.id;
    await loadOwners(ownerId);
    status("Proprietário salvo no diretório compartilhado.");
  }
  async function saveProperty() {
    if (!sessionUser) throw new Error("Entre no diretório antes de salvar.");
    if (!ownerId) throw new Error("Selecione ou salve um proprietário antes de salvar o imóvel.");
    const row = { ...propertyPayload(), user_id: sessionUser.id };
    if (!row.street && !row.condominium && !row.city) throw new Error("Informe ao menos o endereço, condomínio ou cidade do imóvel.");
    let result;
    if (propertyId) result = await client.from("properties").update(row).eq("id", propertyId).select("id").single();
    else result = await client.from("properties").insert(row).select("id").single();
    if (result.error) throw result.error;
    propertyId = result.data.id;
    await loadOwner(ownerId);
    $("savedPropertySelect").value = propertyId;
    status("Imóvel salvo e vinculado ao proprietário.");
  }
  async function showSession(session) {
    sessionUser = session?.user || null;
    $("directoryLogin").classList.toggle("hidden", !!sessionUser);
    $("directoryContent").classList.toggle("hidden", !sessionUser);
    if (sessionUser) {
      try { await loadOwners(); status("Conectado ao diretório compartilhado."); }
      catch (e) { status("Não foi possível carregar os proprietários: " + (e.message || "erro desconhecido"), true); }
    } else {
      ownerId = null; propertyId = null;
      status("", false, "directoryStatus");
      $("savedOwnerSelect").innerHTML = '<option value="">Selecione um proprietário</option>';
      $("savedPropertySelect").innerHTML = '<option value="">Selecione um imóvel</option>';
    }
  }
  $("directoryLoginBtn").addEventListener("click", async () => {
    const email = $("directoryEmail").value.trim();
    const password = $("directoryPassword").value;
    if (!email || !password) return status("Informe o e-mail e a senha.", true, "directoryStatus");
    $("directoryLoginBtn").disabled = true;
    status("Entrando...", false, "directoryStatus");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    $("directoryLoginBtn").disabled = false;
    if (error) return status("Não foi possível entrar. Confira as credenciais.", true, "directoryStatus");
    $("directoryPassword").value = "";
    await showSession(data.session);
  });
  $("directoryLogoutBtn").addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) return status("Não foi possível encerrar a sessão: " + error.message, true);
    await showSession(null);
  });
  $("savedOwnerSelect").addEventListener("change", async e => {
    try { if (e.target.value) await loadOwner(e.target.value); else { ownerId = null; propertyId = null; $("savedPropertySelect").innerHTML = '<option value="">Selecione um imóvel</option>'; } }
    catch (err) { status("Erro ao carregar proprietário: " + err.message, true); }
  });
  $("savedPropertySelect").addEventListener("change", async e => {
    try { if (e.target.value) await loadProperty(e.target.value); else { propertyId = null; clearFields(propertyFields); } }
    catch (err) { status("Erro ao carregar imóvel: " + err.message, true); }
  });
  $("newOwnerBtn").addEventListener("click", resetOwnerForm);
  $("newPropertyBtn").addEventListener("click", resetPropertyForm);
  $("saveOwnerBtn").addEventListener("click", async () => {
    try { $("saveOwnerBtn").disabled = true; await saveOwner(); }
    catch (e) { status(e.message || "Erro ao salvar proprietário.", true); }
    finally { $("saveOwnerBtn").disabled = false; }
  });
  $("savePropertyBtn").addEventListener("click", async () => {
    try { $("savePropertyBtn").disabled = true; await saveProperty(); }
    catch (e) { status(e.message || "Erro ao salvar imóvel.", true); }
    finally { $("savePropertyBtn").disabled = false; }
  });
  client.auth.getSession().then(({ data }) => showSession(data.session));
  client.auth.onAuthStateChange((_event, session) => { showSession(session); });
})();