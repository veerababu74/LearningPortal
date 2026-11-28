/**
 * .ml/ → VeeraML track (Machine Learning).
 *
 * Sources (each used once; exact copies removed by content hash):
 *   ml/veeraml/phaseN_*            the main curriculum (math → classical ML → deep learning → MLOps → NLP/LLMs)
 *                                  (the root-level veeraml/ is an older copy of it → skipped)
 *   ml/NN_x.md + .py               ML essentials course (intro … pipelines) with runnable scripts
 *   ml/models/*.md + .py           algorithm deep dives
 *   importentconcepts/*.ipynb      hands-on concept notebooks (CV, scaling, leakage, …) with their plots
 *                                  (the notebooks at the .ml root are copies of these → skipped)
 *   ML_Complete_Guide/             ML process blueprint, visualization guide, 15 end-to-end project scripts
 *   MlLifeCycle/NN_x/              12 algorithm lifecycle projects (README + preprocessing/training/deployment code)
 *   mm/                            math & model scripts that draw figures (figures embedded after the code)
 *   ml/projects/                   production projects
 *   src/content/ml/sources/ml-interview-bank.md   curated interview bank (the sources have almost no Q&A)
 *
 * Images: scripts/ml-images.py extracts/resizes plots into public/ml-img and writes
 * src/content/ml/sources/images.json, which this parser uses to embed them.
 *
 * Learn modules 01–11, then Exercises (20), Projects (21), Interview (22).
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { cleanTitle, hash, headingsOf, splitPython } from './course-kit.mjs'
import { createTrack, writeTrack } from './track-builder.mjs'
import { notebookToMd } from './notebook-md.mjs'
import { pyToMd, unprintFences, introToMd } from './py-lesson.mjs'
import { ML_DIAGRAMS } from './diagrams-ml.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
// Source material is local-only (never pushed): .ml/ at the repo root (or .bin/.ml).
const srcRoot = [path.join(root, '.ml'), path.join(root, '.bin', '.ml'), path.join(root, '.bin', 'ml')].find((d) => fs.existsSync(d)) || path.join(root, '.ml')
const extraRoot = path.join(root, 'src', 'content', 'ml', 'sources')
const outDir = path.join(root, 'src', 'content', 'generated')

const TRACK = {
  id: 'veeraml',
  title: 'VeeraML',
  tagline: 'Machine Learning — Learn → Visualize → Practice → Build → Interview',
  description:
    'Machine learning from the math up: linear algebra, calculus and probability, data preparation and feature engineering, regression, classification, ensembles, clustering and PCA, evaluation and tuning, deep learning, NLP and LLMs, and MLOps — with real plots, flow diagrams, simulations, labs, projects and interview answers.',
  accent: '#ea580c',
}

const M = {
  '01': { id: '01', name: 'ML Foundations & Workflow' },
  '02': { id: '02', name: 'Math for ML' },
  '03': { id: '03', name: 'Data Prep & Feature Engineering' },
  '04': { id: '04', name: 'Regression & Linear Models' },
  '05': { id: '05', name: 'Classification Algorithms' },
  '06': { id: '06', name: 'Ensemble Methods' },
  '07': { id: '07', name: 'Unsupervised Learning' },
  '08': { id: '08', name: 'Evaluation, Validation & Tuning' },
  '09': { id: '09', name: 'Deep Learning' },
  '10': { id: '10', name: 'NLP, Transformers & LLMs' },
  '11': { id: '11', name: 'MLOps & Production' },
}
const COMPANIONS = {
  exercise: { id: '20', name: 'Exercises' },
  project: { id: '21', name: 'Projects' },
  interview: { id: '22', name: 'Interview' },
}

const SERIES = {
  curriculum: 'VeeraML Curriculum',
  essentials: 'ML Essentials',
  algos: 'Algorithm Deep Dives',
  notebooks: 'Hands-on Concept Notebooks',
  blueprint: 'ML Process Blueprint',
  visual: 'Math & Models with Visuals',
  lifecycle: 'ML Lifecycle Projects',
  guideProjects: '15 End-to-End Projects',
  prod: 'Production ML Projects',
  interview: 'ML Interview Bank',
}
const SERIES_RANK = {
  [SERIES.blueprint]: 5,
  [SERIES.curriculum]: 10,
  [SERIES.essentials]: 15,
  [SERIES.algos]: 20,
  [SERIES.visual]: 25,
  [SERIES.notebooks]: 30,
  [SERIES.guideProjects]: 10,
  [SERIES.lifecycle]: 15,
  [SERIES.prod]: 20,
  [SERIES.interview]: 10,
}

/** Status pages, indexes and build files — not lessons. */
const META = /(^|\/)(README|PROGRESS|INDEX|QUICK_START|GETTING_STARTED|PROJECT_ROADMAP|PROJECT_STATUS|PROJECT_TEMPLATE|SESSION_SUMMARY|SUMMARY|PROJECT_SUMMARY|COMPLETION_SUMMARY|NOTEBOOK_COMPLETION_SUMMARY|PHASE4_COMPLETE_COVERAGE|PHASE4_ENHANCEMENT_SUMMARY|STAGES_[\w_]+_COMPLETE)\.md$|(^|\/)(setup|__init__)\.py$|(^|\/)common_utils\//i
const KEEP_README = new Set(['ML_Complete_Guide/README.md'])

/** Keyword → module, most specific first. */
function moduleByTopic(text) {
  const t = String(text || '').toLowerCase()
  if (/mlops|deploy|serving|monitoring|drift|docker|fastapi|model registry|mlflow|ci\/cd|production/.test(t)) return '11'
  if (/\bnlp\b|text|token|embedding|word2vec|glove|fasttext|transformer|attention|bert|gpt|llm|hugging ?face|fine-?tun|peft|lora|\brag\b|vector db|agent|language model|sentiment|named entity/.test(t)) return '10'
  if (/neural|deep learning|perceptron|backprop|activation|cnn|convolution|rnn|lstm|gru|autoencoder|gan\b|diffusion|computer vision|optimi[sz]er|adam|batch norm|dropout|pytorch|tensorflow|keras/.test(t)) return '09'
  if (/cluster|k-?means|dbscan|hierarch|pca|principal component|dimensional|t-?sne|umap|unsupervised|anomaly/.test(t)) return '07'
  if (/bagging|boosting|random forest|adaboost|xgboost|lightgbm|catboost|gradient boost|ensemble|stacking|voting/.test(t)) return '06'
  if (/logistic|knn|nearest neighbo|svm|support vector|naive bayes|decision tree|classif/.test(t)) return '05'
  if (/cross[- ]?valid|k-?fold|loocv|hyper ?param|grid search|random search|optuna|bias[- ]variance|overfit|underfit|regulari[sz]|metric|evaluat|confusion|roc|auc|precision|recall|f1|r2|rmse|mae|learning curve|debug/.test(t)) return '08'
  if (/linear regression|polynomial|ridge|lasso|elastic net|regression|loss function|least squares|gradient descent/.test(t)) return '04'
  if (/preprocess|clean|missing|imput|scal|normali[sz]|standardi[sz]|encod|outlier|imbalanc|smote|feature (engineer|select|extract)|leakage|pipeline|fit_transform|eda|exploratory|visuali[sz]/.test(t)) return '03'
  if (/linear algebra|vector|matri|tensor|eigen|svd|calculus|derivative|gradient|probabil|statistic|distribution|bayes|hypothesis|entropy|information theory|kl divergence|likelihood/.test(t)) return '02'
  if (/introduction|what is|mental model|types of learning|terminology|lifecycle|workflow|blueprint|fundamental|overview/.test(t)) return '01'
  return null
}

/** Folder of the curriculum → default module. */
const CURRICULUM = [
  [/^phase1_foundations\//, '02'],
  [/^phase2_classical_ml\/2\.0_mental_model\//, '01'],
  [/^phase2_classical_ml\/2\.1_core_concepts\//, '01'],
  [/^phase2_classical_ml\/2\.1_linear_models\//, '04'],
  [/^phase2_classical_ml\/2\.2_loss_functions\//, '04'],
  [/^phase2_classical_ml\/2\.3_evaluation_metrics\//, '08'],
  [/^phase2_classical_ml\/2\.4_cross_validation\//, '08'],
  [/^phase2_classical_ml\/2\.5_regularization\//, '08'],
  [/^phase2_classical_ml\/2\.6_feature_engineering\//, '03'],
  [/^phase2_classical_ml\/2\.7_supervised_algorithms\//, 'topic'],
  [/^phase2_classical_ml\/2\.8_unsupervised_learning\//, '07'],
  [/^phase2_classical_ml\/2\.9_advanced_topics\/01_imbalanced/, '03'],
  [/^phase2_classical_ml\/2\.9_advanced_topics\//, '08'],
  [/^phase2_classical_ml\/2\.1[01]_/, '08'],
  [/^phase3_deep_learning\//, '09'],
  [/^phase4_mlops\//, '11'],
  [/^phase5_specializations\//, '10'],
  [/^programingfunda\//, '01'],
]

const ESSENTIALS = {
  '01': '01', '02': '03', '03': '04', '04': '05', '05': '07', '06': '08', '07': '08', '08': '08', '09': '06', '10': '03',
}

/* --------------------------------------------------------------- helpers */

const rel = (full) => path.relative(srcRoot, full).split(path.sep).join('/')

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '__pycache__', '.ipynb_checkpoints', '.venv'].includes(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, acc)
    else if (/\.(md|ipynb|py)$/i.test(e.name)) acc.push(full)
  }
  return acc
}

function loadImages() {
  const f = path.join(extraRoot, 'images.json')
  if (!fs.existsSync(f)) return { notebook: {}, files: {} }
  return JSON.parse(fs.readFileSync(f, 'utf8'))
}

/** "# Topic 42: Ridge, Lasso, and Elastic Net Regression" → "Ridge, Lasso, and Elastic Net Regression". */
function niceTitle(md, fallback) {
  const h1 = headingsOf(md, 1).filter((h) => !h.banner)[0]?.title
  // "Phase 1.1A - Linear Algebra" is the folder banner shared by every file in it: name the file's own topic
  if (h1 && /^phase\s*\d/i.test(cleanTitle(h1))) {
    const h2 = headingsOf(md, 2).find((h) => !h.banner && !/overview|table of contents|learning objectives|introduction/i.test(h.title))
    const own = fallbackTitle(fallback)
    return own.length > 3 ? own : cleanTitle(h2?.title || h1)
  }
  const t = cleanTitle(h1 || fallback)
    .replace(/^(topics?|module|chapter|lesson|part)\s*\d+(\.\d+)*(\s*[-–]\s*\d+)?\s*[:—–-]\s*/i, '')
    .replace(/\s*[-—–:]\s*(comprehensive|complete) guide$/i, '')
    .replace(/:\s*comprehensive guide$/i, '')
  return t || fallbackTitle(fallback)
}

function fallbackTitle(file) {
  return cleanTitle(
    path
      .basename(file)
      .replace(/\.(md|ipynb|py)$/i, '')
      .replace(/^\d+[_.-]*/, '')
      .replace(/[_-]+/g, ' '),
  )
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(Svd|Pca|Mle|Map|Kl|Clt|Lln|Nlp|Knn|Svm|Ml|Llm|Rag|Bpe|Ner|Gmm|Cnn|Rnn|Lstm|Gru|Mlp|Gan|Vae|Cv|Eda|Peft|Lora)\b/g, (w) => w.toUpperCase())
    .replace(/\bXgboost\b/g, 'XGBoost')
    .replace(/\bAdaboost\b/g, 'AdaBoost')
    .replace(/\bDbscan\b/g, 'DBSCAN')
    .replace(/\bTsne\b/g, 't-SNE')
}

/** Markdown image links relative to a source file → web URLs from the image manifest. */
function rewriteImages(md, fileRel, images) {
  const dir = path.posix.dirname(fileRel)
  return md.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, href) => {
    if (/^(https?:|data:|\/ml-img\/)/.test(href)) return m
    const key = path.posix.normalize(path.posix.join(dir, href))
    const url = images.files[key]
    return url ? `![${alt || 'Figure'}](${url})` : '' // missing local image: drop the broken link
  })
}

/* ------------------------------------------------------------------ main */

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.log('VeeraML sources not found (.ml/) — skipping, keeping the committed generated lessons.')
    process.exit(0)
  }
  const images = loadImages()
  const nbImage = (b64) => images.notebook[createHash('sha1').update(b64, 'utf8').digest('hex').slice(0, 16)] || null

  const files = walk(srcRoot).sort()
  const track = createTrack({
    trackId: 'veeraml',
    prefix: 'ml',
    companions: COMPANIONS,
    moduleFor: (topic, ctx) => {
      if (ctx.mixed) return M[moduleByTopic(topic) || ctx.defaultModule] || M['01']
      return M[ctx.defaultModule] || M[moduleByTopic(topic) || '01']
    },
    seriesRank: (s) => SERIES_RANK[s] ?? 40,
  })

  const used = []
  const skipped = []
  const seen = new Set()
  const lifecycle = new Map() // folder → { readme, code: [[file, code]] }
  const moduleOfSource = new Map() // curriculum file → learn module (for regrouping its exercises)

  for (const full of files) {
    const r = rel(full)
    const raw = fs.readFileSync(full, 'utf8').replace(/\r\n?/g, '\n')
    if (raw.trim().length < 120) {
      skipped.push(`${r} (empty)`)
      continue
    }
    if (/^veeraml\//.test(r)) {
      skipped.push(`${r} (older copy of ml/veeraml)`)
      continue
    }
    if (/^[^/]+\.ipynb$/.test(r)) {
      skipped.push(`${r} (copy of importentconcepts/)`)
      continue
    }
    if (/^Machinelearning\//.test(r)) {
      skipped.push(`${r} (empty folder)`)
      continue
    }
    // an algorithm folder's README is the project brief, not an index page
    const lifecycleReadme = /^MlLifeCycle\/\d+_[^/]+\/README\.md$/i.test(r)
    if (META.test(r) && !KEEP_README.has(r) && !lifecycleReadme) {
      skipped.push(`${r} (${/common_utils|setup\.py/.test(r) ? 'shared tooling' : 'status / index page'})`)
      continue
    }
    const h = hash(raw.replace(/\s+/g, ' '), 16)
    if (seen.has(h)) {
      skipped.push(`${r} (identical to another file)`)
      continue
    }
    seen.add(h)

    // MlLifeCycle: gather README + code per algorithm, emitted as one project lesson below
    let m
    if ((m = r.match(/^MlLifeCycle\/(\d+_[^/]+)\//))) {
      const entry = lifecycle.get(m[1]) || { readme: '', code: [] }
      if (/README\.md$/i.test(r)) entry.readme = raw
      else if (r.endsWith('.ipynb')) {
        const nb = notebookToMd(raw, r, { image: nbImage })
        if (nb) entry.code.push([path.basename(r), nb.md, 'notebook'])
      } else if (r.endsWith('.py')) entry.code.push([path.basename(r), raw, 'py'])
      lifecycle.set(m[1], entry)
      continue
    }
    if (/^MlLifeCycle\//.test(r)) {
      skipped.push(`${r} (lifecycle tooling)`)
      continue
    }

    // ---- content as markdown
    let md
    let title
    if (r.endsWith('.ipynb')) {
      const nb = notebookToMd(raw, r, { image: nbImage })
      if (!nb) {
        skipped.push(`${r} (invalid notebook)`)
        continue
      }
      md = rewriteImages(nb.md, r, images)
      title = cleanTitle(nb.title).replace(/^(topics?|module|chapter)\s*\d+(\.\d+)*\s*[:—–-]\s*/i, '') || fallbackTitle(r)
      if (/^\d+$/.test(title) || title.length < 4 || /^phase\s*\d/i.test(title)) title = fallbackTitle(r)
    } else if (r.endsWith('.py')) {
      md = pyToMd(raw, r, images)
      title = fallbackTitle(r)
    } else {
      md = rewriteImages(raw, r, images)
      title = niceTitle(md, r)
    }
    md = unprintFences(md)

    // ---- route
    const base = path.basename(r)
    if ((m = r.match(/^ml\/veeraml\/(.+)$/))) {
      const sub = m[1]
      const route = CURRICULUM.find(([re]) => re.test(sub))
      if (!route) {
        skipped.push(`${r} (no route)`)
        continue
      }
      // algorithm folders route by topic; an "Ensemble Methods" doc filed under evaluation belongs with ensembles
      const byTitle = moduleByTopic(title)
      const mod = route[1] === 'topic' ? byTitle || '05' : route[1] === '08' && ['06', '07'].includes(byTitle) ? byTitle : route[1]
      const isNb = r.endsWith('.ipynb')
      moduleOfSource.set(r, mod)
      if (/complete_mlops_guide\.md$/.test(r)) title = 'MLOps & production guide'
      if (/complete_specializations_guide\.md$/.test(r)) title = 'Advanced specializations guide'
      track.addDoc({
        rel: r,
        md,
        series: SERIES.curriculum,
        title: isNb && fs.existsSync(full.replace(/\.ipynb$/, '.md')) ? `${title} — hands-on notebook` : title,
        defaultModule: mod,
        preferUnits: false,
      })
    } else if ((m = r.match(/^ml\/(\d{2})_[^/]+\.(md|py)$/))) {
      const mod = ESSENTIALS[m[1]] || '01'
      if (r.endsWith('.py')) {
        track.addDoc({ rel: r, md, series: SERIES.essentials, title: `${niceEssential(r)} — runnable code`, defaultModule: mod, preferUnits: false })
      } else track.addDoc({ rel: r, md, series: SERIES.essentials, title, defaultModule: mod, preferUnits: false })
    } else if (/^ml\/models\//.test(r)) {
      const topic = r.endsWith('.py') ? `${fallbackTitle(r)} — runnable code` : title
      track.addDoc({ rel: r, md, series: SERIES.algos, title: topic, defaultModule: moduleByTopic(`${base} ${title}`) || '05', preferUnits: false })
    } else if (/^ml\/projects\//.test(r)) {
      track.addDoc({
        rel: r,
        md,
        series: SERIES.prod,
        title: r.endsWith('.py') ? `${fallbackTitle(path.posix.dirname(r).split('/').find((p) => /^\d\d_/.test(p)) || r)} — ${base}` : title,
        defaultModule: '11',
        kindOverride: 'project',
        forceKind: true,
        preferUnits: false,
      })
    } else if (/^importentconcepts\//.test(r)) {
      const nice = notebookTitle(base, title) // file names have typos ("imbalnced"); route by the clean title
      const mod = /complete_guide/.test(base) ? '01' : moduleByTopic(nice) || moduleByTopic(base) || '01'
      track.addDoc({ rel: r, md, series: SERIES.notebooks, title: nice, defaultModule: mod, preferUnits: false })
    } else if (/^ML_Complete_Guide\/02_Projects\//.test(r)) {
      track.addDoc({
        rel: r,
        md,
        series: SERIES.guideProjects,
        title: projectTitle(raw, base),
        defaultModule: '21',
        kindOverride: 'project',
        forceKind: true,
        preferUnits: false,
      })
    } else if (/^ML_Complete_Guide\//.test(r)) {
      const t = /Visualization_Guide/.test(r) ? 'Visualization guide for ML (EDA plots explained)' : /README/.test(r) ? 'ML from zero to expert — the roadmap' : title
      track.addDoc({ rel: r, md, series: SERIES.blueprint, title: t, defaultModule: /Visualization_Guide/.test(r) ? '03' : '01', preferUnits: false })
    } else if (/^mm\//.test(r)) {
      const isSolutions = /Solutions/i.test(base)
      const mod = /01_Mathematical/.test(r) ? '02' : moduleByTopic(`${base} ${title}`) || '05'
      track.addDoc({
        rel: r,
        md,
        series: SERIES.visual,
        title: r.endsWith('.md') ? title : mmTitle(base),
        defaultModule: mod,
        kindOverride: isSolutions ? 'exercise' : null,
        forceKind: isSolutions,
        preferUnits: false,
      })
    } else {
      skipped.push(`${r} (no route)`)
      continue
    }
    used.push(r)
  }

  // MlLifeCycle: one end-to-end project lesson per algorithm folder
  for (const [folder, e] of [...lifecycle.entries()].sort()) {
    const parts = []
    if (e.readme) parts.push(e.readme)
    const order = ['data_preprocessing.py', 'model_training.py', 'deployment.py', 'quick_start.py']
    const code = [...e.code].sort((a, b) => (order.indexOf(a[0]) + 99) % 99 - (order.indexOf(b[0]) + 99) % 99)
    for (const [file, text, kind] of code) {
      parts.push(kind === 'notebook' ? `## Notebook: ${file}\n\n${text}` : `## ${file}\n\n${pyToMd(text, `MlLifeCycle/${folder}/src/${file}`, images).replace(/^## /gm, '### ')}`)
    }
    if (!parts.length) continue
    const md = parts.join('\n\n')
    track.addDoc({
      rel: `MlLifeCycle/${folder}`,
      md,
      series: SERIES.lifecycle,
      title: e.readme ? niceTitle(e.readme, folder) : fallbackTitle(folder),
      defaultModule: '21',
      kindOverride: 'project',
      forceKind: true,
      preferUnits: false,
    })
    used.push(`MlLifeCycle/${folder} (${code.length} files)`)
  }

  // curated interview bank
  const bank = path.join(extraRoot, 'ml-interview-bank.md')
  if (fs.existsSync(bank)) {
    track.addDoc({
      rel: 'sources/ml-interview-bank.md',
      md: fs.readFileSync(bank, 'utf8'),
      series: SERIES.interview,
      title: 'Machine Learning Interview Bank',
      defaultModule: '22',
      kindOverride: 'interview',
      forceKind: true,
      preferUnits: false,
    })
    used.push('sources/ml-interview-bank.md')
  }

  const { lessons, stats } = track.finalize({ diagrams: ML_DIAGRAMS })

  // Exercises / Q&A pulled out of the curriculum docs: group them by the learning module they practise
  // (one "VeeraML Curriculum" group of 100+ cards is unusable).
  for (const l of lessons) {
    const mod = Number(l.title.slice(0, 2))
    if (mod < 20 || l.series !== SERIES.curriculum) continue
    const learn = moduleOfSource.get(l.sourceFile)
    if (learn && M[learn]) l.series = `${M[learn].name} practice`
  }

  // A three-line exercise list is not a lesson: combine the small exercise lessons of each practice
  // group into one practice set (one section per topic). Substantial exercise lessons stay separate.
  const SMALL_EXERCISE = 2500
  const size = (l) => l.sections.reduce((n, s) => n + String(s.body || '').length, 0)
  const groups = new Map()
  for (const l of lessons) {
    if (!l.title.startsWith('20.') || size(l) >= SMALL_EXERCISE) continue
    groups.set(l.series, [...(groups.get(l.series) || []), l])
  }
  for (const [series, small] of groups) {
    if (small.length < 2) continue
    const host = small[0]
    const used = new Set()
    const sections = []
    for (const l of small) {
      const topic = l.title.replace(/^\d{2}\.\s*[^:]+:\s*/, '')
      const body = l.sections
        .map((s) => (l.sections.length > 1 && !/^(exercises?|practice exercises|introduction)$/i.test(s.title) ? `### ${s.title}\n\n${s.body}` : s.body))
        .join('\n\n')
      let id = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'topic'
      while (used.has(id)) id += '-2'
      used.add(id)
      sections.push({ id, title: topic, body })
    }
    host.title = `20. Exercises: ${series.replace(/ practice$/, '')} — practice set`
    host.sections = sections
    host.summary = `${small.length} short exercise sets: ${small.map((l) => l.title.replace(/^\d{2}\.\s*[^:]+:\s*/, '')).slice(0, 4).join(', ')}${small.length > 4 ? ' and more' : ''}.`
    host.objectives = [`Practise ${series.replace(/ practice$/, '').toLowerCase()} without looking at the lessons`, 'Write each solution as a small script and check edge cases']
    const drop = new Set(small.slice(1).map((l) => l.id))
    for (let i = lessons.length - 1; i >= 0; i--) if (drop.has(lessons[i].id)) lessons.splice(i, 1)
  }
  // part numbers inside the regrouped series
  const counters = new Map()
  const totals = new Map()
  for (const l of lessons) totals.set(`${l.title.slice(0, 2)}|${l.series}`, (totals.get(`${l.title.slice(0, 2)}|${l.series}`) || 0) + 1)
  lessons.sort((a, b) => a.order - b.order)
  const regrouped = [...lessons].sort((a, b) =>
    a.title.slice(0, 2) !== b.title.slice(0, 2)
      ? a.title.slice(0, 2).localeCompare(b.title.slice(0, 2))
      : a.series === b.series
        ? a.order - b.order
        : Number(moduleKeyOf(a.series)) - Number(moduleKeyOf(b.series)) || a.series.localeCompare(b.series),
  )
  regrouped.forEach((l, i) => {
    l.order = i + 1
    const k = `${l.title.slice(0, 2)}|${l.series}`
    const n = (counters.get(k) || 0) + 1
    counters.set(k, n)
    l.part = n
    l.partCount = totals.get(k)
  })
  lessons.length = 0
  lessons.push(...regrouped)
  writeTrack({ outDir, trackId: 'veeraml', track: TRACK, lessons })

  const byMod = {}
  for (const l of lessons) byMod[l.title.slice(0, 2)] = (byMod[l.title.slice(0, 2)] || 0) + 1
  const imgs = lessons.reduce((n, l) => n + l.sections.reduce((k, s) => k + (s.body.match(/!\[[^\]]*\]\(\/ml-img\//g) || []).length, 0), 0)
  console.log(`VeeraML track: ${lessons.length} lessons from ${used.length} sources (${stats.candidates} candidates)`)
  console.log('  by module:', JSON.stringify(byMod))
  console.log(`  duplicate sections removed: ${stats.droppedSections}`)
  console.log(`  real figures embedded: ${imgs}`)
  console.log(`  curated diagrams placed: ${stats.diagramsPlaced}/${ML_DIAGRAMS.length}`)
  if (stats.diagramsMissed.length) console.log('  NOT placed:', stats.diagramsMissed.join(', '))
  if (process.argv.includes('--verbose')) {
    console.log('  used:\n   ', used.join('\n    '))
    console.log('  skipped:\n   ', skipped.join('\n    '))
  } else console.log(`  skipped ${skipped.length} files (run with --verbose to list)`)
}

/** Sort key for regrouped practice series ("Math for ML practice" → "02"); other series keep their rank. */
function moduleKeyOf(series) {
  const hit = Object.values(M).find((m) => series === `${m.name} practice`)
  return hit ? hit.id : String(SERIES_RANK[series] ?? 40).padStart(2, '0')
}

function niceEssential(r) {
  return fallbackTitle(r).replace(/^(Supervised Learning) /, '$1: ')
}

const NB_TITLES = {
  '0_handling_imbalnced_dataset': 'Handling imbalanced datasets (SMOTE, class weights, resampling)',
  '1_cross_validation': 'Cross-validation in practice',
  '2_corss_validation_': 'Cross-validation strategies compared',
  '3_hyper_prametertuning': 'Hyperparameter tuning (grid, random, Bayesian)',
  '4_sacleing': 'Feature scaling: standardisation vs normalisation',
  '5_encoding': 'Encoding categorical variables',
  '6_outlier_detect_and_treat': 'Detecting and treating outliers',
  '7_fit_transform_predict': 'fit, transform, fit_transform and predict',
  '8_regression_evalutionmetircs': 'Regression evaluation metrics',
  '9_regularization_techniques': 'Regularization techniques (L1, L2, Elastic Net)',
  '10_ml_pipelines': 'Building ML pipelines',
  '11_bagging_boosting': 'Bagging vs boosting',
  '12_imputer_examples': 'Imputing missing values',
  '13_data_leakage': 'Data leakage — how it happens and how to stop it',
  bias_and_variance: 'Bias and variance',
  ML_important_concepts_complete_guide: 'Important ML concepts — complete guide',
}
function notebookTitle(base, title) {
  return NB_TITLES[base.replace(/\.ipynb$/, '')] || title
}

function mmTitle(base) {
  return base
    .replace(/\.py$/, '')
    .replace(/^\d+_/, '')
    .replace(/_Part(\d)/, ' (part $1)')
    .replace(/_/g, ' ')
}

function projectTitle(raw, base) {
  const m = raw.match(/PROJECT\s*\d+\s*:\s*([^\n]+)/i)
  return m ? cleanTitle(m[1]).replace(/\b([A-Z])([A-Z]+)\b/g, (w, a, b) => a + b.toLowerCase()) : fallbackTitle(base)
}

main()
