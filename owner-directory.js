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
    cep: "directoryPropertyCep", street: "directoryPropertyAddress", condominium: "directoryPropertyCondo"
  };
  function status(message, isError = false, area = "directoryDataStatus") {
    const el = $(area);
    if (!el) return;
    el.textContent = message;
    if (area === "directoryStatus") {
      el.className = "auth-feedback " + (message ? (isError ? "error" : "success") : "");
    } else {
      el.className = "status " + (message ? (isError ? "bad" : "ok") : "");
    }
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
    return row.identifier || (row.owner_type === "pf" ? (row.pf_name || "Proprietário") : (row.owner_name || "Proprietário"));
  }
  function resetOwnerForm() {
    ownerId = null;
    $("savedOwnerSelect").value = "";
    $("ownerIdentifier").value = "";
    $("savedPropertySelect").innerHTML = '<option value="">Selecione um imóvel</option>';
    propertyId = null;
    clearFields(ownerFields);
    clearFields(propertyFields);
    document.querySelector('[data-owner-type="pj"]')?.click();
    status("Novo proprietário: preencha o identificador e os dados do proprietário.");
  }
  function resetPropertyForm() {
    propertyId = null;
    $("savedPropertySelect").value = "";
    clearFields(propertyFields);
    setValue("propertyCep", "");
    setValue("propertyStreet", "");
    setValue("propertyCondo", "");
    status(ownerId ? "Novo imóvel: informe o CEP, o endereço e o condomínio, se houver." : "Selecione ou salve um proprietário antes de adicionar um imóvel.", !ownerId);
  }
  async function loadOwners(selectId = "") {
    const { data, error } = await client.from("owners")
      .select("id,identifier,owner_type,owner_name,cnpj,representative_name,representative_rg,representative_cpf,pf_name,pf_job,pf_civil_status,pf_rg,pf_cpf,cep,street,number,complement,neighborhood,city,uf,bank_code,bank_agency,bank_account_type,bank_account,pix,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const select = $("savedOwnerSelect");
    select.innerHTML = '<option value="">Selecione um proprietário</option>';
    const seen = new Map();
    (data || []).forEach(row => {
      const base = currentOwnerName(row);
      const count = (seen.get(base) || 0) + 1;
      seen.set(base, count);
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = count > 1 ? base + " (" + count + ")" : base;
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
    clearFields(propertyFields);
    setValue("propertyCep", "");
    setValue("propertyStreet", "");
    setValue("propertyCondo", "");
    if (!id) return;
    const { data: owner, error } = await client.from("owners").select("*").eq("id", id).single();
    if (error) throw error;
    $("ownerIdentifier").value = owner.identifier || currentOwnerName(owner);
    document.querySelector('[data-owner-type="' + owner.owner_type + '"]')?.click();
    fillFields(ownerFields, owner);
    const { data: properties, error: pError } = await client.from("properties")
      .select("*").eq("owner_id", id).order("created_at", { ascending: false });
    if (pError) throw pError;
    (properties || []).forEach((row, index) => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = row.condominium || row.street || row.cep || ("Imóvel " + (index + 1));
      $("savedPropertySelect").appendChild(option);
    });
    status("Proprietário carregado. Selecione um imóvel ou adicione outro.");
  }
  async function loadProperty(id) {
    propertyId = id || null;
    if (!id) return;
    const { data, error } = await client.from("properties").select("*").eq("id", id).single();
    if (error) throw error;
    fillFields(propertyFields, data);
    setValue("propertyCep", data.cep);
    setValue("propertyStreet", data.street);
    setValue("propertyCondo", data.condominium);
    status("Imóvel carregado no formulário.");
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
    if (!sessionUser) throw new Error("Entre para continuar.");
    const identifier = $("ownerIdentifier").value.trim();
    if (!identifier) throw new Error("Informe um identificador para localizar este proprietário na lista.");
    const row = { ...ownerPayload(), identifier, user_id: sessionUser.id };
    if (row.owner_type === "pf" && !row.pf_name) throw new Error("Informe o nome completo do proprietário pessoa física.");
    if (row.owner_type === "pj" && !row.owner_name) throw new Error("Informe a razão social/nome do proprietário pessoa jurídica.");
    let result;
    if (ownerId) result = await client.from("owners").update(row).eq("id", ownerId).select("id").single();
    else result = await client.from("owners").insert(row).select("id").single();
    if (result.error) throw result.error;
    ownerId = result.data.id;
    await loadOwners(ownerId);
    status("Proprietário salvo.");
  }
  async function saveProperty() {
    if (!sessionUser) throw new Error("Entre para continuar.");
    if (!ownerId) throw new Error("Selecione ou salve um proprietário antes de salvar o imóvel.");
    const row = {
      user_id: sessionUser.id,
      owner_id: ownerId,
      cep: $("directoryPropertyCep").value.trim() || null,
      street: $("directoryPropertyAddress").value.trim() || null,
      condominium: $("directoryPropertyCondo").value.trim() || null
    };
    if (!row.cep && !row.street && !row.condominium) throw new Error("Informe o CEP, o endereço ou o nome do condomínio.");
    let result;
    if (propertyId) result = await client.from("properties").update(row).eq("id", propertyId).select("id").single();
    else result = await client.from("properties").insert(row).select("id").single();
    if (result.error) throw result.error;
    const savedPropertyId = result.data.id;
    setValue("propertyCep", row.cep);
    setValue("propertyStreet", row.street);
    setValue("propertyCondo", row.condominium);
    await loadOwner(ownerId);
    propertyId = savedPropertyId;
    $("savedPropertySelect").value = savedPropertyId;
    await loadProperty(savedPropertyId);
    status("Imóvel salvo.");
  }
  async function showSession(session) {
    sessionUser = session?.user || null;
    const authorized = !!sessionUser && sessionUser.email === "andrebronca60@gmail.com";
    document.body.classList.toggle("directory-authenticated", authorized);
    $("directoryLogin").classList.toggle("hidden", authorized);
    $("directoryContent").classList.toggle("hidden", !authorized);
    if (authorized) {
      try { await loadOwners(); status("Proprietários carregados."); }
      catch (e) { status("Não foi possível carregar os proprietários: " + (e.message || "erro desconhecido"), true); }
    } else {
      ownerId = null; propertyId = null;
      status(sessionUser ? "Esta conta não tem permissão para acessar o diretório." : "", !!sessionUser, "directoryStatus");
      $("savedOwnerSelect").innerHTML = '<option value="">Selecione um proprietário</option>';
      $("savedPropertySelect").innerHTML = '<option value="">Selecione um imóvel</option>';
    }
  }
  $("directoryLoginBtn").addEventListener("click", async event => {
    event.preventDefault();
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
  $("directoryForgotPassword").addEventListener("click", async () => {
    const email = $("directoryEmail").value.trim();
    if (!email) return status("Digite seu e-mail acima primeiro.", true, "directoryStatus");
    const button = $("directoryForgotPassword");
    button.disabled = true;
    status("Enviando instruções de recuperação...", false, "directoryStatus");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    button.disabled = false;
    if (error) return status("Não foi possível enviar a recuperação. Confira o e-mail e tente novamente.", true, "directoryStatus");
    status("Se houver uma conta para esse e-mail, você receberá instruções para redefinir a senha.", false, "directoryStatus");
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