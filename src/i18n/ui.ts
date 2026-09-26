export const languages = { en: 'English', ro: 'Română' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'en';

/** Path of the same page in another language. EN lives at the root, RO under /ro/. */
export function altPath(path: string, to: Lang): string {
  const bare = path.replace(/^\/ro(?=\/|$)/, '') || '/';
  return to === 'ro' ? `/ro${bare === '/' ? '/' : bare}` : bare;
}

export const langPrefix = (lang: Lang) => (lang === 'ro' ? '/ro' : '');
export const projectHref = (lang: Lang, slug: string) => `${langPrefix(lang)}/projects/${slug}/`;
export const homeHref = (lang: Lang, hash = '') => `${langPrefix(lang)}/${hash}`;

const en = {
  meta: {
    title: 'North-Lab-RO — Private AI systems',
    description:
      'North-Lab-RO designs, builds and runs private AI systems (language models, retrieval, speech, documents and image pipelines) on hardware you control.',
  },
  nav: {
    services: 'Services',
    projects: 'Projects',
    about: 'About',
    stack: 'Stack',
    menu: 'Menu',
    skip: 'Skip to content',
    language: 'Language',
    home: 'North-Lab-RO home',
    primary: 'Main navigation',
    mobile: 'Mobile navigation',
  },
  hero: {
    eyebrow: 'Independent AI lab · Romania',
    title: ['AI that runs', 'where your', 'data lives.'],
    lede: 'North-Lab designs, builds and runs private AI systems for analysis, documents, voice and generation. Everything runs on hardware you control, with no cloud inference.',
    ctaServices: 'What we do',
    ctaProjects: 'See projects',
    scene: 'A slowly turning crystal star inside a compass ring, with an aurora behind it',
  },
  services: {
    label: 'What we do',
    title: 'Private AI systems, from first model to daily use.',
    lede: 'We take a problem from idea to a system that runs every day on your own hardware.',
    seenIn: 'Seen in',
    items: [
      {
        title: 'Private AI assistants & analysis',
        body: 'Language models that read, summarise and reason over your data on a server you own. Nothing is sent to a cloud API.',
        proof: ['counselor', 'banky'],
        icon: 'M4 5h16v11H8l-4 4V5zM8 9h8M8 12h5',
      },
      {
        title: 'Document & data extraction',
        body: 'Statements, invoices, receipts and scans turned into clean, structured records, with every number checked against the source.',
        proof: ['banky'],
        icon: 'M7 3h7l5 5v13H7V3zM14 3v5h5M10 13h6M10 17h6',
      },
      {
        title: 'Search over your documents',
        body: 'Semantic search and retrieval across your archive, so answers point to what your documents actually say.',
        proof: ['counselor', 'ai-atc'],
        icon: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4',
      },
      {
        title: 'Voice interfaces',
        body: 'Speech-to-text, intent routing and natural speech output, tuned to reply within a few seconds.',
        proof: ['ai-atc'],
        icon: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
      },
      {
        title: 'Generative content pipelines',
        body: 'Multi-stage generation of text and images, with validators that reject inconsistent output before anyone sees it.',
        proof: ['cases'],
        icon: 'M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5L12 3z',
      },
      {
        title: 'Deployment on your hardware',
        body: 'GPU sizing, model selection, containers, job queues and monitoring, installed and running on your own machines.',
        proof: ['counselor', 'cases', 'ai-atc', 'banky'],
        icon: 'M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01',
      },
    ],
  },
  projects: {
    label: 'Projects',
    title: 'Systems we built and use every day.',
    lede: 'Four projects designed, built and operated on our own hardware. Each one keeps its data local.',
    featured: 'Featured project',
    readMore: 'Read more',
    soon: 'A new system is in the lab.',
    next: 'Next',
  },
  about: {
    label: 'How we work',
    title: "Local-first isn't a setting. It's the architecture.",
    lede: 'Every system we build runs its models on hardware the owner controls: one GPU workstation, or a rack in their own building. That constraint shapes everything. Models are chosen to fit the memory budget. Queues keep the GPU busy without starving interactive requests. Validation layers check model output before anyone relies on it.',
    principles: [
      {
        title: 'Private by construction',
        body: 'Inference, embeddings and speech run on-premise. The only outbound traffic is data you asked for, like a news feed or a weather report.',
      },
      {
        title: 'Built to run offline',
        body: 'The core loops (speech, reasoning, generation) keep working without an internet connection, because nothing in them depends on one.',
      },
      {
        title: 'Models propose, code decides',
        body: 'Fact-check verdicts, case solvability, radio instructions and extracted amounts are checked by deterministic code before they reach a person.',
      },
    ],
  },
  stack: {
    label: 'Stack',
    title: 'Open models. Open tools. Our hardware.',
    lede: 'Everything here is open source or open-weight, so every system can be inspected, rebuilt and run without a vendor account.',
  },
  footer: {
    tagline: 'Private AI systems, built and run on our own hardware.',
  },
  project: {
    back: '← All projects',
    private: 'Private repository · available on request',
    source: 'View source ↗',
    whatItDoes: 'What it does',
    reports: 'Reports',
    builtWith: 'Built with',
    next: 'Next project',
    pending: 'Sample in preparation',
    openPdf: 'Open PDF',
    enlarge: 'Enlarge',
    close: 'Close',
    gallery: 'Gallery',
  },
  notFound: {
    label: '404 · off course',
    title: "This page isn't on the chart.",
    lede: 'The link may be old, or the page may have moved.',
    back: 'Back to the home page',
  },
};

type Dict = typeof en;

const ro: Dict = {
  meta: {
    title: 'North-Lab-RO — Sisteme AI private',
    description:
      'North-Lab-RO proiectează, construiește și operează sisteme AI private (modele de limbaj, căutare semantică, voce, documente și generare de imagini) pe hardware-ul pe care îl controlezi.',
  },
  nav: {
    services: 'Servicii',
    projects: 'Proiecte',
    about: 'Despre',
    stack: 'Tehnologii',
    menu: 'Meniu',
    skip: 'Sari la conținut',
    language: 'Limbă',
    home: 'Pagina principală North-Lab-RO',
    primary: 'Navigare principală',
    mobile: 'Navigare pe mobil',
  },
  hero: {
    eyebrow: 'Laborator independent de AI · România',
    title: ['AI care rulează', 'acolo unde îți', 'sunt datele.'],
    lede: 'North-Lab proiectează, construiește și operează sisteme AI private pentru analiză, documente, voce și generare. Totul rulează pe hardware-ul pe care îl controlezi, fără inferență în cloud.',
    ctaServices: 'Ce facem',
    ctaProjects: 'Vezi proiectele',
    scene: 'O stea de cristal care se rotește lent într-un inel de busolă, cu o auroră în fundal',
  },
  services: {
    label: 'Ce facem',
    title: 'Sisteme AI private, de la primul model la folosirea zilnică.',
    lede: 'Ducem o problemă de la idee până la un sistem care rulează zilnic pe hardware-ul tău.',
    seenIn: 'Folosit în',
    items: [
      {
        title: 'Asistenți AI privați și analiză',
        body: 'Modele de limbaj care citesc, rezumă și analizează datele tale pe un server pe care îl deții. Nimic nu ajunge într-un API din cloud.',
        proof: ['counselor', 'banky'],
        icon: en.services.items[0].icon,
      },
      {
        title: 'Extragere de documente și date',
        body: 'Extrase de cont, facturi, bonuri și documente scanate transformate în înregistrări structurate, cu fiecare cifră verificată față de sursă.',
        proof: ['banky'],
        icon: en.services.items[1].icon,
      },
      {
        title: 'Căutare în documentele tale',
        body: 'Căutare semantică în arhiva ta, cu răspunsuri care trimit la ce spun de fapt documentele.',
        proof: ['counselor', 'ai-atc'],
        icon: en.services.items[2].icon,
      },
      {
        title: 'Interfețe vocale',
        body: 'Recunoaștere vocală, rutarea intenției și voce sintetizată naturală, reglate să răspundă în câteva secunde.',
        proof: ['ai-atc'],
        icon: en.services.items[3].icon,
      },
      {
        title: 'Generare de conținut',
        body: 'Generare de text și imagini în mai mulți pași, cu validatori care resping rezultatele inconsecvente înainte să le vadă cineva.',
        proof: ['cases'],
        icon: en.services.items[4].icon,
      },
      {
        title: 'Instalare pe hardware-ul tău',
        body: 'Dimensionare GPU, alegerea modelelor, containere, cozi de lucru și monitorizare, instalate și funcționale pe mașinile tale.',
        proof: ['counselor', 'cases', 'ai-atc', 'banky'],
        icon: en.services.items[5].icon,
      },
    ],
  },
  projects: {
    label: 'Proiecte',
    title: 'Sisteme construite și folosite zilnic.',
    lede: 'Patru proiecte proiectate, construite și operate pe propriul hardware. Fiecare își păstrează datele local.',
    featured: 'Proiect principal',
    readMore: 'Citește mai mult',
    soon: 'Un sistem nou este în laborator.',
    next: 'Următorul',
  },
  about: {
    label: 'Cum lucrăm',
    title: 'Local-first nu e o setare. E arhitectura.',
    lede: 'Fiecare sistem pe care îl construim își rulează modelele pe hardware controlat de proprietar: o singură stație cu GPU sau un rack în propria clădire. Această constrângere modelează totul. Modelele sunt alese să încapă în memoria disponibilă. Cozile țin GPU-ul ocupat fără să blocheze cererile interactive. Straturile de validare verifică rezultatele modelului înainte ca cineva să se bazeze pe ele.',
    principles: [
      {
        title: 'Privat prin construcție',
        body: 'Inferența, embedding-urile și vocea rulează local. Singurul trafic spre exterior sunt datele pe care le-ai cerut, cum ar fi un flux de știri sau un buletin meteo.',
      },
      {
        title: 'Gândit să ruleze offline',
        body: 'Buclele principale (voce, raționament, generare) funcționează și fără conexiune la internet, pentru că nimic din ele nu depinde de una.',
      },
      {
        title: 'Modelul propune, codul decide',
        body: 'Verdictele de fact-checking, rezolvabilitatea cazurilor, instrucțiunile radio și sumele extrase sunt verificate de cod determinist înainte să ajungă la un om.',
      },
    ],
  },
  stack: {
    label: 'Tehnologii',
    title: 'Modele deschise. Unelte deschise. Hardware-ul nostru.',
    lede: 'Totul aici este open source sau cu ponderi deschise, astfel încât fiecare sistem poate fi inspectat, reconstruit și rulat fără un cont la vreun furnizor.',
  },
  footer: {
    tagline: 'Sisteme AI private, construite și rulate pe propriul hardware.',
  },
  project: {
    back: '← Toate proiectele',
    private: 'Repository privat · disponibil la cerere',
    source: 'Vezi codul sursă ↗',
    whatItDoes: 'Ce face',
    reports: 'Rapoarte',
    builtWith: 'Construit cu',
    next: 'Proiectul următor',
    pending: 'Exemplu în pregătire',
    openPdf: 'Deschide PDF',
    enlarge: 'Mărește',
    close: 'Închide',
    gallery: 'Galerie',
  },
  notFound: {
    label: '404 · în afara hărții',
    title: 'Pagina aceasta nu e pe hartă.',
    lede: 'Linkul poate fi vechi sau pagina a fost mutată.',
    back: 'Înapoi la pagina principală',
  },
};

export const ui: Record<Lang, Dict> = { en, ro };
export const t = (lang: Lang) => ui[lang];
