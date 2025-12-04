// --- GLOBAL DATA ---
let globalCompanies = [];
let currentCompanyIdToSend = null; // Stocke l'ID en cours de prévisualisation

// --- NAVIGATION ---
function switchTab(tab) {
  document.getElementById("view-dashboard").classList.add("hidden");
  document.getElementById("view-settings").classList.add("hidden");
  document.getElementById("view-" + tab).classList.remove("hidden");

  document
    .getElementById("nav-dashboard")
    .classList.remove("bg-indigo-600", "text-white");
  document
    .getElementById("nav-settings")
    .classList.remove("bg-indigo-600", "text-white");
  document.getElementById("nav-dashboard").classList.add("text-slate-300");
  document.getElementById("nav-settings").classList.add("text-slate-300");

  document
    .getElementById("nav-" + tab)
    .classList.add("bg-indigo-600", "text-white");
  document.getElementById("nav-" + tab).classList.remove("text-slate-300");

  document.getElementById("page-title").innerText =
    tab === "dashboard" ? "Tableau de bord" : "Configuration";

  if (tab === "settings") loadSettings();
  if (tab === "dashboard") fetchCompanies();
}

// --- SORTING LOGIC ---
function handleSort() {
  const criteria = document.getElementById("sort-select").value;
  let sortedData = [...globalCompanies];

  switch (criteria) {
    case "name_asc":
      sortedData.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name_desc":
      sortedData.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "status_todo":
      sortedData.sort((a, b) => {
        const rank = (s) =>
          s === "Pas encore contactée" ? 1 : s === "Erreur" ? 2 : 3;
        return rank(a.status) - rank(b.status);
      });
      break;
    case "status_done":
      sortedData.sort((a, b) => {
        const rank = (s) => (s === "Candidature envoyée" ? 1 : 2);
        return rank(a.status) - rank(b.status);
      });
      break;
    case "oldest":
      sortedData.sort((a, b) => a.id - b.id);
      break;
    case "newest":
    default:
      sortedData.sort((a, b) => b.id - a.id);
      break;
  }
  renderCompanies(sortedData);
}

// --- DATA FETCHING & RENDERING ---
async function fetchCompanies() {
  const res = await fetch("/api/companies");
  globalCompanies = await res.json();
  handleSort();
}

function renderCompanies(data) {
  const list = document.getElementById("companies-list");
  list.innerHTML = "";
  let sentCount = 0;

  if (data.length === 0) {
    document.getElementById("empty-state").classList.remove("hidden");
  } else {
    document.getElementById("empty-state").classList.add("hidden");
    data.forEach((c) => {
      if (c.status === "Candidature envoyée") sentCount++;

      let badgeClass = "bg-slate-100 text-slate-500";
      let statusIcon = "<i class='fa-regular fa-clock'></i>";
      if (c.status === "Candidature envoyée") {
        badgeClass = "bg-emerald-100 text-emerald-700";
        statusIcon = "<i class='fa-solid fa-check'></i>";
      } else if (c.status === "Erreur") {
        badgeClass = "bg-red-100 text-red-700";
        statusIcon = "<i class='fa-solid fa-triangle-exclamation'></i>";
      }

      const isReady =
        c.files_status.cv !== "missing" && c.files_status.lm !== "missing";

      const row = `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-4 font-medium text-slate-800">${c.name}</td>
                    <td class="p-4 text-slate-500">${c.email}</td>
                    <td class="p-4 space-y-1">
                        ${getFileBadge("CV", c.files_status.cv)}
                        ${getFileBadge("Lettre", c.files_status.lm)}
                    </td>
                    <td class="p-4">
                        <span class="px-2 py-1 rounded text-xs font-bold ${badgeClass} inline-flex items-center gap-1">
                            ${statusIcon} ${c.status}
                        </span>
                        ${
                          c.sent_at
                            ? `<div class="text-[10px] text-slate-400 mt-1">${c.sent_at}</div>`
                            : ""
                        }
                        ${
                          c.error_message
                            ? `<div class="text-[10px] text-red-400 mt-1 max-w-[150px] truncate" title="${c.error_message}">${c.error_message}</div>`
                            : ""
                        }
                    </td>
                    <td class="p-4 text-right">
                        ${
                          c.status !== "Candidature envoyée"
                            ? `<button onclick="openPreview(${
                                c.id
                              })" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" ${
                                !isReady
                                  ? 'disabled title="Fichiers manquants"'
                                  : ""
                              }>Envoyer</button>`
                            : `<button class="bg-slate-200 text-slate-400 px-3 py-1 rounded text-xs cursor-default">Envoyé</button>`
                        }
                        <button onclick="openEditModal(${
                          c.id
                        }, '${c.name.replace(/'/g, "\\'")}', '${
        c.email
      }')" class="text-slate-400 hover:text-indigo-500 ml-2" title="Modifier"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="deleteCompany(${
                          c.id
                        })" class="text-slate-400 hover:text-rose-600 ml-2" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
      list.innerHTML += row;
    });
  }

  document.getElementById("stats-total").innerText = globalCompanies.length;
  document.getElementById("stats-sent").innerText = sentCount;
}

function getFileBadge(type, status) {
  if (status === "specific") {
    return `<div class="text-indigo-600 text-xs font-bold flex items-center gap-1" title="Fichier personnalisé trouvé"><i class="fa-solid fa-star"></i> ${type} Perso.</div>`;
  } else if (status === "generic") {
    return `<div class="text-slate-500 text-xs flex items-center gap-1" title="Fichier générique utilisé"><i class="fa-solid fa-user"></i> ${type} Générique</div>`;
  } else {
    return `<div class="text-rose-500 text-xs font-bold flex items-center gap-1" title="Aucun fichier trouvé"><i class="fa-solid fa-triangle-exclamation"></i> ${type} Manquant</div>`;
  }
}

// --- PREVIEW & SEND LOGIC (NOUVEAU) ---

function openPreview(id) {
  const company = globalCompanies.find((c) => c.id === id);
  if (!company) return;

  currentCompanyIdToSend = id;

  // Récupérer les infos de configuration (depuis le DOM car chargé au démarrage, ou valeurs par défaut)
  const subject =
    document.getElementById("conf-subject").value || "Candidature spontanée";
  let body = document.getElementById("conf-body").value || "Bonjour, ...";
  const fname = document.getElementById("conf-fname").value || "Prenom";
  const lname = document.getElementById("conf-lname").value || "Nom";

  // 1. Remplir les champs textes
  document.getElementById("prev-email").innerText = company.email;
  document.getElementById("prev-subject").innerText = subject;

  // Remplacement variable dans le corps
  const cleanName = company.name.trim();
  const formattedBody = body.replace(/{{nom_entreprise}}/g, cleanName);
  document.getElementById("prev-body").innerText = formattedBody;

  // 2. Simuler les noms de fichiers
  const cvName =
    company.files_status.cv === "specific"
      ? `CV_${cleanName}.pdf`
      : `CV_${fname}_${lname}.pdf`;
  const lmName =
    company.files_status.lm === "specific"
      ? `Lettre_de_motivation_${cleanName}.pdf`
      : `Lettre_de_motivation_${fname}_${lname}.pdf`;

  document.getElementById("prev-file-cv").querySelector("span").innerText =
    cvName;
  document.getElementById("prev-file-lm").querySelector("span").innerText =
    lmName;

  // Ouvrir modal
  document.getElementById("modal-preview").classList.remove("hidden");
  document.getElementById("modal-preview").classList.add("flex");
}

function closePreviewModal() {
  document.getElementById("modal-preview").classList.add("hidden");
  document.getElementById("modal-preview").classList.remove("flex");
  currentCompanyIdToSend = null;
}

async function confirmSend() {
  if (!currentCompanyIdToSend) return;

  const btn = document.getElementById("btn-confirm-send");
  const originalText = btn.innerHTML;

  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi...';
  btn.disabled = true;

  try {
    const res = await fetch(`/api/send/${currentCompanyIdToSend}`, {
      method: "POST",
    });
    const data = await res.json();

    if (data.success) {
      showToast("Candidature envoyée avec succès !", "success");
      closePreviewModal();
      fetchCompanies();
    } else {
      showToast("Erreur: " + data.error, "error");
    }
  } catch (e) {
    showToast("Erreur de connexion serveur", "error");
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// --- IMPORT CSV ---
async function importCSV(input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);
  showToast("Importation en cours...", "info");
  try {
    const res = await fetch("/api/companies/import", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, "success");
      fetchCompanies();
    } else {
      showToast("Erreur: " + data.error, "error");
    }
  } catch (e) {
    showToast("Erreur réseau", "error");
  }
  input.value = "";
}

// --- EDIT ACTIONS ---
function openEditModal(id, name, email) {
  document.getElementById("edit-id").value = id;
  document.getElementById("edit-name").value = name;
  document.getElementById("edit-email").value = email;
  document.getElementById("modal-edit").classList.remove("hidden");
  document.getElementById("modal-edit").classList.add("flex");
}
function closeEditModal() {
  document.getElementById("modal-edit").classList.add("hidden");
  document.getElementById("modal-edit").classList.remove("flex");
}
async function updateCompany() {
  const id = document.getElementById("edit-id").value;
  const name = document.getElementById("edit-name").value;
  const email = document.getElementById("edit-email").value;
  if (!name || !email) return showToast("Champs requis", "error");
  await fetch(`/api/companies/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  closeEditModal();
  showToast("Entreprise mise à jour", "success");
  fetchCompanies();
}

// --- STANDARD ACTIONS ---
async function addCompany() {
  const name = document.getElementById("new-name").value;
  const email = document.getElementById("new-email").value;
  if (!name || !email) return showToast("Remplissez tous les champs", "error");
  await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  closeAddModal();
  document.getElementById("new-name").value = "";
  document.getElementById("new-email").value = "";
  showToast("Entreprise ajoutée", "success");
  fetchCompanies();
}
async function deleteCompany(id) {
  if (!confirm("Supprimer cette entreprise ?")) return;
  await fetch(`/api/companies/${id}`, { method: "DELETE" });
  fetchCompanies();
}

// --- SETTINGS ---
async function loadSettings() {
  const res = await fetch("/api/settings");
  const data = await res.json();
  document.getElementById("conf-host").value = data.smtp_host || "";
  document.getElementById("conf-port").value = data.smtp_port || "";
  document.getElementById("conf-email").value = data.smtp_email || "";
  document.getElementById("conf-pass").value = data.smtp_password || "";
  document.getElementById("conf-fname").value = data.candidate_first_name || "";
  document.getElementById("conf-lname").value = data.candidate_last_name || "";
  document.getElementById("conf-path").value = data.documents_path || "";
  document.getElementById("conf-subject").value = data.email_subject || "";
  document.getElementById("conf-body").value = data.email_body || "";
}
async function saveSettings() {
  const payload = {
    smtp_host: document.getElementById("conf-host").value,
    smtp_port: document.getElementById("conf-port").value,
    smtp_email: document.getElementById("conf-email").value,
    smtp_password: document.getElementById("conf-pass").value,
    candidate_first_name: document.getElementById("conf-fname").value,
    candidate_last_name: document.getElementById("conf-lname").value,
    documents_path: document.getElementById("conf-path").value,
    email_subject: document.getElementById("conf-subject").value,
    email_body: document.getElementById("conf-body").value,
  };
  await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  showToast("Configuration sauvegardée", "success");
}

function openAddModal() {
  document.getElementById("modal-add").classList.remove("hidden");
  document.getElementById("modal-add").classList.add("flex");
}
function closeAddModal() {
  document.getElementById("modal-add").classList.add("hidden");
  document.getElementById("modal-add").classList.remove("flex");
}
function showToast(msg, type = "info") {
  const toast = document.getElementById("toast");
  document.getElementById("toast-msg").innerText = msg;
  toast.classList.remove("translate-y-20", "opacity-0");
  if (type === "error") {
    toast.classList.add("bg-rose-600");
    toast.classList.remove("bg-slate-800", "bg-emerald-600");
  } else if (type === "success") {
    toast.classList.add("bg-emerald-600");
    toast.classList.remove("bg-slate-800", "bg-rose-600");
  } else {
    toast.classList.add("bg-slate-800");
  }
  setTimeout(() => {
    toast.classList.add("translate-y-20", "opacity-0");
  }, 3000);
}

// Init (On charge aussi les settings au démarrage pour que la preview ait les données par défaut)
loadSettings();
fetchCompanies();
