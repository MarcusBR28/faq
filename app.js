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

function isBulletLine(line){
  const s = line.trim();
  if(!s) return false;
  const patterns = [
    /^[-*•–]\s+/,          // -, *, •, –
    /^\d+\.\s+/,           // 1.
    /^step\s*\d*[:\-]?\s*/i,
    /^tier\s*\d*[:\-]?\s*/i,
    /^if\b/i
  ];
  return patterns.some(rx => rx.test(s));
}

function extractBulletSegments(answer){
  const lines = (answer || "").split(/\\r?\\n/).map(l=>l.trim());
  const segs = [];
  for(const line of lines){
    if(isBulletLine(line)){
      segs.push(line);
    }
  }
  return segs;
}

function render(list, terms){
  const results = $("#results");
  const stats = $("#stats");
  results.innerHTML = "";
  stats.textContent = `${list.length} resultado(s)`;
  list.forEach((faq)=>{
    const card = document.createElement("article");
    card.className = "card";

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = `FAQ ${faq["FAQ#"]}`;
    card.appendChild(badge);

    const cq = document.createElement("div");
    cq.className = "kv";
    cq.innerHTML = `<div class="key">Consolidated Question</div><div class="val">${highlight(faq["Consolidated Question"]||"", terms)}</div>`;
    card.appendChild(cq);

    const ansWrap = document.createElement("div");
    ansWrap.className = "kv";
    const valDiv = document.createElement("div");
    valDiv.className = "val answer-block";

    const bullets = extractBulletSegments(faq["Answer Display"]||"");
    if(bullets.length > 0){
      bullets.forEach((s,i)=>{
        const d = document.createElement("div");
        d.className = "segment " + (i % 2 === 0 ? "x":"y");
        d.innerHTML = highlight(s, terms);
        valDiv.appendChild(d);
      });
    }else{
      valDiv.innerHTML = highlight((faq["Answer Display"]||"").trim(), terms) || '<div class="empty">Sem Answer Display</div>';
    }
    ansWrap.innerHTML = `<div class="key">Answer Display</div>`;
    ansWrap.appendChild(valDiv);
    card.appendChild(ansWrap);

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
      const base = [...ALL_FAQS].sort((a,b)=> (a["FAQ#"]||0) - (b["FAQ#"]||0));
      render(base, []);
      return;
    }
    const terms = q.split(/\\s+/).map(t=>normalize(t)).filter(Boolean);

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

  const base = [...ALL_FAQS].sort((a,b)=> (a["FAQ#"]||0) - (b["FAQ#"]||0));
  render(base, []);
}

main();
