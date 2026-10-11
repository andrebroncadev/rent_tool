(async function(){
  const client = window.supabaseClient;
  if (!client) return;
  const { data: { session } } = await client.auth.getSession();
  const isLogin = location.pathname.endsWith("/login.html") || location.pathname.endsWith("login.html");
  if (!session && !isLogin) location.replace("login.html");
  if (session && isLogin) location.replace("index.html");
  if (session && !isLogin) {
    const header = document.querySelector(".topbar") || document.querySelector("main");
    if (header && !document.getElementById("btnLogout")) {
      const btn = document.createElement("button");
      btn.id = "btnLogout"; btn.type = "button"; btn.className = "btn secondary";
      btn.textContent = "Sair";
      btn.addEventListener("click", async () => { await client.auth.signOut(); location.replace("login.html"); });
      header.appendChild(btn);
    }
  }
})();
