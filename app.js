// Busca que considera apenas 'Keywords' e 'Consolidated Question' do arquivo faq_keywords.json
let ALL_FAQS = [];

const $ = (s) => document.querySelector(s);

function normalize(s){
  return (s || "").toString().normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase();
}

function highlight(text, terms){
  if(!terms || terms.length===0) return text;
  let out = text;
  terms.forEach(t=>{
    if(!t) return;
    try{
      const rx = new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") +')',"ig");
      out = out.replace(rx, "<mark>$1</mark>");
    }catch(e){}
  });
  return out;
}

function render(list, terms){
  const results = $("#results");
  const stats = $("#stats");
  results.innerHTML = "";
  stats.textContent = `${list.length} resultado(s)`;
  list.forEach((faq, idx)=>{
    const card = document.createElement("article");
    card.className = "card";
    const b = document.createElement("div"); b.className="badge"; b.textContent = `FAQ #${faq["FAQ#"]}`;
    card.appendChild(b);

    const kv1 = document.createElement("div"); kv1.className="kv";
    kv1.innerHTML = `<div class="key">Consolidated Question</div><div class="val">${highlight(faq["Consolidated Question"]||"", terms)}</div>`;
    card.appendChild(kv1);

    const ans = document.createElement("div"); ans.className="kv";
    const seg = (faq["Answer Display"]||"").split(/\n/).map(s=>s.trim()).filter(Boolean);
    const valDiv = document.createElement("div"); valDiv.className="val answer-block";
    if(seg.length>1){
      seg.forEach((s,i)=>{
        const d = document.createElement("div");
        d.className = "segment " + (i%2===0 ? "toneA":"toneB");
        d.innerHTML = highlight(s, terms);
        valDiv.appendChild(d);
      });
    }else{
      valDiv.innerHTML = highlight(faq["Answer Display"]||"", terms) || '<div class="empty">Sem Answer Display</div>';
    }
    ans.innerHTML = `<div class="key">Answer Display</div>`;
    ans.appendChild(valDiv);
    card.appendChild(ans);

    if(faq["Procedure"] && faq["Procedure"].trim()!==""){
      const kvp = document.createElement("div"); kvp.className="kv";
      kvp.innerHTML = `<div class="key">Procedure</div><div class="val">${faq["Procedure"]}</div>`;
      card.appendChild(kvp);
    }

    results.appendChild(card);
  });
}

async function main(){
  const resp = await fetch("faq_keywords.json");
  ALL_FAQS = await resp.json();

  const input = $("#query");
  const clear = $("#clearBtn");

  function apply(){
    const q = input.value.trim();
    if(!q){
      render(ALL_FAQS, []);
      return;
    }
    const terms = q.split(/\s+/).map(t=>normalize(t)).filter(Boolean);

    const filtered = ALL_FAQS.filter(faq=>{
      const consolidated = normalize(faq["Consolidated Question"] || "");
      const kws = (faq["Keywords"] || []).map(k=>normalize(k)).join(" ");
      const hay = consolidated + " " + kws;
      return terms.some(t => hay.includes(t));
    });

    filtered.sort((a,b)=> (a["FAQ#"]||0) - (b["FAQ#"]||0));
    render(filtered, terms);
  }

  input.addEventListener("input", apply);
  clear.addEventListener("click", ()=>{ input.value=""; apply(); });

  render(ALL_FAQS, []);
}

main();
