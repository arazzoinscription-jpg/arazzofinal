/**
 * Migration WordPress/Tutor LMS → Supabase (ANALYSE, lecture seule par défaut).
 *
 *  node scripts/wp-migrate.cjs analyze
 *
 * Construit :
 *  - étudiants (depuis les <wp:author> du WXR)
 *  - inscriptions (depuis les items tutor_enrolled : creator + post_parent + status)
 *  - map cours WP (id → titre) depuis l'export Tutor (courses/<id>/<id>.json)
 *  - map bundle WP (id → [course ids]) depuis course-bundle/<id>/<id>.json
 *  - correspondance titre WP → cours Supabase (titre_ar / titre_fr)
 * et affiche un rapport (rien n'est écrit).
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const WXR = "C:/Users/Fashion Mode/Downloads/WordPress.2026-06-20.xml";
const TUTOR = "C:/Users/Fashion Mode/Downloads/tutor_export";

// ---- env ----
function env(k) {
  const e = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  const m = e.match(new RegExp("^" + k + "\\s*=\\s*(.+)$", "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}
const sb = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

// ---- helpers ----
const cdata = (s) => (s == null ? "" : String(s).replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim());
function norm(s) {
  return (s || "")
    .toString()
    .replace(/[ً-ٰٟ]/g, "") // diacritiques arabes
    .replace(/ـ/g, "")                 // tatweel
    .replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه") // normalisation arabe
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

// ---- 1) WXR : auteurs + inscriptions ----
function parseWxr() {
  const xml = fs.readFileSync(WXR, "utf8");
  const authors = {}; // login -> {email, name}
  for (const m of xml.matchAll(/<wp:author>([\s\S]*?)<\/wp:author>/g)) {
    const b = m[1];
    const login = cdata((b.match(/<wp:author_login>([\s\S]*?)<\/wp:author_login>/) || [])[1]);
    const email = cdata((b.match(/<wp:author_email>([\s\S]*?)<\/wp:author_email>/) || [])[1]);
    const disp = cdata((b.match(/<wp:author_display_name>([\s\S]*?)<\/wp:author_display_name>/) || [])[1]);
    const fn = cdata((b.match(/<wp:author_first_name>([\s\S]*?)<\/wp:author_first_name>/) || [])[1]);
    const ln = cdata((b.match(/<wp:author_last_name>([\s\S]*?)<\/wp:author_last_name>/) || [])[1]);
    let name = disp;
    if (!name || name.includes("@")) name = [fn, ln].filter(Boolean).join(" ").trim() || disp;
    if (login) authors[login] = { email, name: name || login };
  }
  const enrolls = []; // {login, parent, status}
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const b = m[1];
    if (!b.includes("tutor_enrolled")) continue;
    const login = cdata((b.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/) || [])[1]);
    const parent = (b.match(/<wp:post_parent>(\d+)<\/wp:post_parent>/) || [])[1];
    const status = cdata((b.match(/<wp:status>([\s\S]*?)<\/wp:status>/) || [])[1]);
    const bm = b.match(/_tutor_bundle_id[\s\S]*?<wp:meta_value><!\[CDATA\[([^\]]*)\]\]>/);
    const bundleId = bm && bm[1] ? bm[1] : null;
    if (login && parent) enrolls.push({ login, parent: parent, status, bundleId });
  }
  return { authors, enrolls };
}

// ---- 2) Tutor export : cours + bundles ----
function parseTutor() {
  const courseTitle = {}; // id -> title
  const bundleMembers = {}; // id -> [course ids]
  const bundleTitle = {};
  const read = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };

  const coursesDir = path.join(TUTOR, "courses");
  if (fs.existsSync(coursesDir)) {
    for (const id of fs.readdirSync(coursesDir)) {
      const j = read(path.join(coursesDir, id, id + ".json"));
      const c = j && j.data && j.data[0] && j.data[0].data && j.data[0].data.course;
      if (c && c.post_title) courseTitle[String(c.ID || id)] = c.post_title;
    }
  }
  const bundleDir = path.join(TUTOR, "course-bundle");
  if (fs.existsSync(bundleDir)) {
    for (const id of fs.readdirSync(bundleDir)) {
      const full = path.join(bundleDir, id);
      if (!fs.statSync(full).isDirectory()) continue;
      const j = read(path.join(full, id + ".json"));
      const b = j && j.data && j.data[0] && j.data[0].data && j.data[0].data.bundle;
      if (b) {
        if (b.post_title) bundleTitle[String(b.ID || id)] = b.post_title;
        const ids = b.meta && b.meta["bundle-course-ids"];
        if (ids && ids[0]) bundleMembers[String(b.ID || id)] = String(ids[0]).split(",").map((x) => x.trim()).filter(Boolean);
      }
      // cours imbriqués éventuels
      const cdir = path.join(full, "courses");
      if (fs.existsSync(cdir)) {
        for (const cid of fs.readdirSync(cdir)) {
          const cj = read(path.join(cdir, cid, cid + ".json"));
          const c = cj && cj.data && cj.data[0] && cj.data[0].data && cj.data[0].data.course;
          if (c && c.post_title) courseTitle[String(c.ID || cid)] = c.post_title;
        }
      }
    }
  }
  return { courseTitle, bundleMembers, bundleTitle };
}

async function build() {
  const { authors, enrolls } = parseWxr();
  const { courseTitle, bundleMembers, bundleTitle } = parseTutor();
  const { data: sbCourses } = await sb.from("courses").select("id, titre_fr, titre_ar");

  // index titre Supabase -> uuid
  const sbByNorm = new Map();
  for (const c of sbCourses) {
    for (const t of [c.titre_ar, c.titre_fr]) if (t) sbByNorm.set(norm(t), c);
  }
  const matchCourse = (wpId) => {
    const title = courseTitle[wpId];
    if (!title) return { wpId, title: null, sb: null };
    const hit = sbByNorm.get(norm(title));
    return { wpId, title, sb: hit || null };
  };

  console.log("=== TUTOR EXPORT ===");
  console.log("Cours WP avec titre :", Object.keys(courseTitle).length);
  console.log("Bundles WP :", Object.keys(bundleMembers).length);

  // Résout un (parent, bundleId) → liste d'IDs de cours WP
  function resolveTargets(parent, bundleId) {
    if (bundleMembers[parent]) return bundleMembers[parent];          // parent = bundle
    if (courseTitle[parent]) return [parent];                          // parent = cours direct
    if (bundleId && bundleMembers[bundleId]) return bundleMembers[bundleId]; // repli via _tutor_bundle_id
    return [];
  }

  // IDs de cours/bundle référencés par les inscriptions completed
  const completed = enrolls.filter((e) => e.status === "completed");
  function completedCount(id) { return completed.filter((e) => e.parent === id).length; }
  // bundle dominant observé pour chaque parent (pour le rapport)
  const parentBundle = {};
  for (const e of completed) if (e.bundleId) (parentBundle[e.parent] = parentBundle[e.parent] || {})[e.bundleId] = 1;
  const refIds = [...new Set(completed.map((e) => e.parent))];

  console.log("\n=== CORRESPONDANCE des IDs inscrits (status=completed) ===");
  const unresolved = [];
  for (const id of refIds.sort((a, b) => completedCount(b) - completedCount(a))) {
    if (bundleMembers[id]) {
      const members = bundleMembers[id].map(matchCourse);
      console.log(`BUNDLE ${id} « ${bundleTitle[id] || "?"} » → ${members.length} cours (${members.filter((m) => m.sb).length} matchés)`);
      members.forEach((m) => { if (!m.sb) unresolved.push({ id: m.wpId, title: m.title, via: "bundle " + id }); });
    } else if (courseTitle[id]) {
      const m = matchCourse(id);
      if (m.sb) console.log(`COURS  ${id} → ✅ « ${m.sb.titre_ar || m.sb.titre_fr} »`);
      else { console.log(`COURS  ${id} → ❌ titre WP « ${m.title} » sans équivalent Supabase`); unresolved.push({ id, title: m.title, via: "direct" }); }
    } else {
      const bid = Object.keys(parentBundle[id] || {})[0];
      if (bid && bundleMembers[bid]) console.log(`ID ${id} → 🔗 via bundle ${bid} « ${bundleTitle[bid] || "?"} » (${bundleMembers[bid].length} cours)`);
      else { console.log(`ID ${id} → ❌ ABSENT (ni cours, ni bundle, ni _tutor_bundle_id) | inscrits=${completedCount(id)}`); unresolved.push({ id, title: null, via: "direct" }); }
    }
  }

  // plan d'enrôlement : email -> { name, courseIds:Set(uuid) }
  const studentPlan = new Map();
  for (const e of completed) {
    const a = authors[e.login];
    if (!a || !a.email) continue;
    const email = a.email.trim().toLowerCase();
    const targets = resolveTargets(e.parent, e.bundleId);
    for (const cid of targets) {
      const m = matchCourse(cid);
      if (!m.sb) continue;
      if (!studentPlan.has(email)) studentPlan.set(email, { name: a.name || email.split("@")[0], courseIds: new Set() });
      studentPlan.get(email).courseIds.add(m.sb.id);
    }
  }
  let totalLinks = 0; for (const s of studentPlan.values()) totalLinks += s.courseIds.size;
  return { authors, completed, studentPlan, unresolved, totalLinks, completedCount };
}

// ─── COMMANDES ────────────────────────────────────────────────────────────────
const TABLES_RESET = [
  "payment_proofs", "invoices", "refunds", "order_payments", "order_items",
  "orders", "payments", "activity_log", "page_visits", "login_history",
  "reactivation_log", "email_log", "notifications",
];

async function analyze() {
  const r = await build();
  console.log("\n=== RÉSUMÉ ===");
  console.log("Étudiants (auteurs) :", Object.keys(r.authors).length);
  console.log("Inscriptions completed :", r.completed.length);
  console.log("Étudiants avec ≥1 cours résolu :", r.studentPlan.size);
  console.log("Liens étudiant↔cours à créer :", r.totalLinks);
  const uniq = [...new Set(r.unresolved.map((u) => u.id))];
  console.log("Cours NON résolus (uniques) :", uniq.length);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function execute() {
  const r = await build();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  // staff à NE PAS toucher / ne pas recréer en élève
  const { data: staff } = await sb.from("users").select("id, email").neq("role", "eleve");
  const staffEmails = new Set((staff || []).map((s) => (s.email || "").toLowerCase()));

  // 0) SAUVEGARDE
  const { data: curStudents } = await sb.from("users").select("id, email, nom, role").eq("role", "eleve");
  const { data: curEnroll } = await sb.from("enrollments").select("user_id, course_id");
  const planObj = [...r.studentPlan.entries()].map(([email, v]) => ({ email, name: v.name, courseIds: [...v.courseIds] }));
  const backup = path.join(__dirname, `backup-${ts}.json`);
  fs.writeFileSync(backup, JSON.stringify({ curStudents, curEnroll, plan: planObj }, null, 2));
  console.log("💾 Sauvegarde:", backup, `(${(curStudents || []).length} élèves, ${(curEnroll || []).length} inscriptions)`);

  // 1) WIPE ventes/activité
  console.log("\n🗑️  Réinitialisation ventes/activité…");
  for (const t of TABLES_RESET) {
    const { error, count } = await sb.from(t).delete({ count: "exact" }).not("id", "is", null);
    console.log(`   ${t.padEnd(18)} ${error ? "⚠️ " + error.message.slice(0, 60) : "vidé (" + (count ?? "?") + ")"}`);
  }

  // 2) SUPPRESSION des 146 élèves (cascade)
  console.log("\n🗑️  Suppression des comptes élèves…");
  let del = 0, delErr = 0;
  for (const s of curStudents || []) {
    const { error } = await sb.auth.admin.deleteUser(s.id);
    if (error) { delErr++; if (delErr <= 5) console.log("   ⚠️", s.email, error.message); }
    else del++;
    if (del % 25 === 0 && del) process.stdout.write(`   …${del} supprimés\n`);
  }
  console.log(`   ✅ ${del} supprimés, ${delErr} erreurs`);

  // 3) CRÉATION des étudiants + map email→id
  console.log("\n📥 Création des étudiants…");
  const idByEmail = new Map();
  let created = 0, skipStaff = 0, exist = 0, failC = 0;
  for (const [email, info] of r.studentPlan) {
    if (staffEmails.has(email)) { skipStaff++; continue; }
    const { data, error } = await sb.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { nom: info.name },
    });
    if (error) {
      if (/registered|already/i.test(error.message)) {
        // déjà présent : retrouver l'id
        const { data: u } = await sb.from("users").select("id").eq("email", email).maybeSingle();
        if (u) { idByEmail.set(email, u.id); exist++; }
        else failC++;
      } else { failC++; if (failC <= 5) console.log("   ⚠️", email, error.message); }
      continue;
    }
    idByEmail.set(email, data.user.id);
    await sb.from("users").upsert({ id: data.user.id, email, nom: info.name, role: "eleve" });
    created++;
    if (created % 25 === 0) process.stdout.write(`   …${created} créés\n`);
  }
  console.log(`   ✅ ${created} créés, ${exist} déjà existants, ${skipStaff} staff ignorés, ${failC} échecs`);

  // 4) ENRÔLEMENTS (upsert par lots)
  console.log("\n🔗 Enrôlements…");
  const rows = [];
  for (const [email, info] of r.studentPlan) {
    const uid = idByEmail.get(email);
    if (!uid) continue;
    for (const cid of info.courseIds) rows.push({ user_id: uid, course_id: cid });
  }
  let ins = 0, insErr = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await sb.from("enrollments").upsert(chunk, { onConflict: "user_id,course_id", ignoreDuplicates: true });
    if (error) { insErr += chunk.length; console.log("   ⚠️ lot", i, error.message.slice(0, 80)); }
    else ins += chunk.length;
  }
  console.log(`   ✅ ${ins} inscriptions traitées, ${insErr} en erreur`);

  // VÉRIF finale
  const { count: nbU } = await sb.from("users").select("*", { count: "exact", head: true }).eq("role", "eleve");
  const { count: nbE } = await sb.from("enrollments").select("*", { count: "exact", head: true });
  console.log(`\n✅ TERMINÉ — élèves: ${nbU} | inscriptions: ${nbE}`);
}

const cmd = process.argv[2] || "analyze";
(cmd === "execute" ? execute() : analyze()).catch((e) => { console.error(e); process.exit(1); });
