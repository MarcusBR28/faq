// Carregamento e busca por keywords em Question(s) e Answer Display
let ALL_FAQS = [];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function normalize(str) {
  return (str || "").toString().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function highlight(text, terms) {
  if (!terms || !terms.length || !text) return text;
  let safe = text;
  // Destaque cada termo
  terms.forEach(t => {
    if (!t) return;
    try {
      const rx = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
      safe = safe.replace(rx, "<mark>$1</mark>");
    } catch {}
  });
  return safe;
}

// Divide respostas em segmentos (detectar tiers/steps/listas) para alternar tons
function segmentAnswer(answer) {
  if (!answer) return [];
  const raw = answer
    .replace(/\r\n/g, "\n")
    .replace(/\u2022/g, "- "); // bullets

  // Estratégias de divisão: novas linhas; "Tier X"; "Step X"; "; " (quando houver várias)
  let parts = raw.split("\n").map(s => s.trim()).filter(Boolean);

  const tierRx = /(tier\s*\d+[:\-\)]?)/i;
  const stepRx = /(step\s*\d+[:\-\)]?)/i;
  const hasTier = tierRx.test(raw);
  const hasStep = stepRx.test(raw);

  // Se não houver quebras, tente por "; " quando existirem pelo menos 2
  if (parts.length < 2) {
    const semi = raw.split(/;\s+/).map(s => s.trim()).filter(Boolean);
    if (semi.length >= 2) parts = semi;
  }

  // Se ainda não houver partes, tente detectar "Tier x" ou "Step x" como delimitadores
  if (parts.length < 2 && (hasTier || hasStep)) {
    parts = raw.split(/(?=tier\s*\d+[:\-\)]?|step\s*\d+[:\-\)]?)/ig).map(s => s.trim()).filter(Boolean);
  }

  // Se mesmo assim for uma única parte, retornamos vazio para render simples
  if (parts.length < 2) return [];

  return parts;
}

function renderResults(list, queryTerms) {
  const results = $("#results");
  const stats = $("#stats");
  results.innerHTML = "";

  stats.textContent = `${list.length} resultado(s)`;

  list.forEach((faq, idx) => {
    const card = document.createElement("article");
    card.className = "card";

    // Cabeçalho / badge
    const b = document.createElement("div");
    b.className = "badge";
    b.innerHTML = `FAQ #${faq["FAQ#"]}`;
    card.appendChild(b);

    // Linhas KV
    const kv1 = document.createElement("div");
    kv1.className = "kv";
    kv1.innerHTML = `
      <div class="key">Consolidated Question</div>
      <div class="val">${(faq["Consolidated Question"] || "").replace(/\n/g, "<br>")}</div>
    `;
    card.appendChild(kv1);

    const ansBlock = document.createElement("div");
    ansBlock.className = "kv";
    const segments = segmentAnswer(faq["Answer Display"]);
    const ansContent = document.createElement("div");
    ansContent.className = "val answer-block";

    if (segments.length) {
      const segList = document.createElement("div");
      segList.className = "segment-list";
      segments.forEach((seg, i) => {
        const div = document.createElement("div");
        div.className = "segment " + (i % 2 === 0 ? "toneA" : "toneB");
        div.innerHTML = highlight(seg, queryTerms);
        segList.appendChild(div);
      });
      ansContent.appendChild(segList);
    } else {
      ansContent.innerHTML = highlight((faq["Answer Display"] || "").replace(/\n/g, "<br>"), queryTerms);
    }

    ansBlock.innerHTML = `<div class="key">Answer Display</div>`;
    ansBlock.appendChild(ansContent);
    card.appendChild(ansBlock);

    if (faq["Procedure"] && faq["Procedure"].trim() !== "") {
      const kv3 = document.createElement("div");
      kv3.className = "kv";
      kv3.innerHTML = `
        <div class="key">Procedure</div>
        <div class="val">${(faq["Procedure"] || "").replace(/\n/g, "<br>")}</div>
      `;
      card.appendChild(kv3);
    }

    results.appendChild(card);
  });
}

async function main() {
  // Carregar JSON
  const res = await fetch("faq.json");
  ALL_FAQS = await res.json();

  const input = $("#query");
  const clearBtn = $("#clearBtn");

  function applyFilter() {
    const q = input.value.trim();
    if (!q) {
      // Sem filtro, mostra tudo (ordenado por FAQ#)
      renderResults(ALL_FAQS, []);
      return;
    }
    const terms = q.split(/\s+/).map(t => normalize(t)).filter(Boolean);

    const filtered = ALL_FAQS.filter((faq) => {
      // Busca somente em Question(s) e Answer Display
      const questions = (faq["Question(s)"] || []).join(" \n ");
      const answer = faq["Answer Display"] || "";

      const hay = normalize(questions + " \n " + answer);
      // Match se QUALQUER termo aparece
      return terms.some(t => hay.includes(t));
    });

    // Ordenar por FAQ#
    filtered.sort((a, b) => (a["FAQ#"] || 0) - (b["FAQ#"] || 0));

    renderResults(filtered, terms);
  }

  input.addEventListener("input", applyFilter);
  clearBtn.addEventListener("click", () => { input.value = ""; applyFilter(); });

  // Primeira renderização com tudo
  renderResults(ALL_FAQS, []);
}

main();
