const $ = (id) => document.getElementById(id);
let installationId, control, stopped = false, chain = Promise.resolve(), wire = Promise.resolve(), polling = false;
const key = "voxTeamsMediaAuth";
function api(action, extra = {}, credential = control) {
  const result = wire.then(() => request(action, extra, credential));
  wire = result.catch(() => {});
  return result;
}
async function request(action, extra, credential) {
  const response = await fetch(`/api/teams-media/${action}`, { method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ installationId, token: credential, ...extra }), signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok) throw Error(data.message || data.error || "Не удалось связаться с сервером VOX-S");
  return data;
}
function finish(message) { stopped = true; sessionStorage.removeItem(key); $("remote").hidden = true; $("screen").removeAttribute("src"); $("save").disabled = true; $("cancel").disabled = true; $("status").textContent = message; }
function enqueue(input) {
  chain = chain.then(() => { if (!stopped) return api("input", { input }); }).catch((e) => { $("status").textContent = e.message; });
}
async function view() {
  if (stopped || polling) return;
  polling = true;
  try {
    await chain;
    const data = await api("view");
    if (stopped) return;
    if (data.image) { $("screen").src = `data:image/jpeg;base64,${data.image}`; $("remote").hidden = false; $("save").disabled = false; $("origin").textContent = `Адрес открытой страницы: ${data.origin}`; $("status").textContent = "Завершите вход в окне Microsoft ниже"; }
    else $("status").textContent = data.message;
  } catch(e) { $("status").textContent = e.message; }
  finally { polling = false; if (!stopped) setTimeout(view, 1200); }
}
$("screen").addEventListener("click", (event) => { const r = event.currentTarget.getBoundingClientRect(); enqueue({ type: "click", x: (event.clientX-r.left)*1100/r.width, y: (event.clientY-r.top)*760/r.height }); $("entry").focus(); });
$("entry").addEventListener("input", (event) => { const text = event.target.value; event.target.value = ""; if (text) enqueue({type:"text",text}); });
$("entry").addEventListener("keydown", (event) => { if (["Enter","Backspace","Delete","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Tab","Escape"].includes(event.key) || event.ctrlKey && event.key.toLowerCase()==="a") { event.preventDefault(); enqueue({type:"key",key:event.ctrlKey?"Control+A":event.shiftKey&&event.key==="Tab"?"Shift+Tab":event.key}); } });
$("enter").onclick = () => enqueue({type:"key",key:"Enter"});
$("save").onclick = async () => { $("save").disabled = true; try { await chain; const result = await api("complete"); if(result.saved) finish(result.message); else $("status").textContent=result.message; } catch(e) { $("status").textContent=e.message; } finally { if(!stopped) $("save").disabled=false; } };
$("cancel").onclick = async () => { try { await chain; await api("cancel"); finish("Подключение отменено. Можно закрыть эту вкладку."); } catch(e) { $("status").textContent=e.message; } };
(async()=>{try { const match = /^#([a-z0-9-]{3,64})\.([A-Za-z0-9_-]{43})$/.exec(location.hash); if(match){ installationId=match[1]; const result=await api("claim",{},match[2]); control=result.control; sessionStorage.setItem(key,JSON.stringify({installationId,control,expiresAt:result.expiresAt})); history.replaceState(null,"",location.pathname); }else{const saved=JSON.parse(sessionStorage.getItem(key)||"null");if(!saved||Date.parse(saved.expiresAt)<=Date.now())throw Error("Откройте подключение Teams из служебного интерфейса VOX-S");({installationId,control}=saved);}await view();}catch(e){finish(e.message);}})();
