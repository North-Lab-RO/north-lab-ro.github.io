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
    title: 'North-Lab-RO — Private AI for your business',
    description:
      'North-Lab-RO designs, installs and supports private AI systems for companies: news intelligence, document extraction, voice assistants and generated content, all running on your own hardware.',
  },
  nav: {
    services: 'Services',
    projects: 'Products',
    about: 'Why private',
    stack: 'How we work',
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
    lede: 'North-Lab designs, installs and supports private AI systems for your company. They analyse, read documents, talk and create, all on hardware you own. Your data never leaves the building, there is no per-use cloud bill, and they keep working offline.',
    ctaServices: 'What we can build',
    ctaProjects: 'See the products',
    scene: 'A slowly turning crystal star inside a compass ring, with an aurora behind it',
  },
  services: {
    label: 'What we can build for you',
    title: 'Private AI that does real work for your business.',
    lede: 'Every system runs on your own server or workstation, and is built around your data and the way your team works.',
    seenIn: 'See it in',
    items: [
      {
        title: 'Know what is being said, every morning',
        body: 'An analyst that reads the press and your sources around the clock, and has a balanced briefing ready before your day starts.',
        proof: ['counselor'],
        icon: 'M4 5h16v11H8l-4 4V5zM8 9h8M8 12h5',
      },
      {
        title: 'Turn documents into data you can trust',
        body: 'Statements, invoices, receipts and scans become clean records, with every number checked against the original.',
        proof: ['banky'],
        icon: 'M7 3h7l5 5v13H7V3zM14 3v5h5M10 13h6M10 17h6',
      },
      {
        title: 'Answers from your own documents',
        body: 'Ask your archive a question and get an answer grounded in what your documents actually say.',
        proof: ['counselor', 'ai-atc'],
        icon: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4',
      },
      {
        title: 'Voice assistants that answer in seconds',
        body: 'Spoken questions in, natural spoken answers out, running entirely on your premises.',
        proof: ['ai-atc'],
        icon: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
      },
      {
        title: 'Content and experiences, made to order',
        body: 'Stories, cases, images and training material, generated on demand and checked for consistency before anyone sees them.',
        proof: ['cases'],
        icon: 'M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5L12 3z',
      },
      {
        title: 'Installed, running and supported',
        body: 'We size the hardware, install everything on your machines, train your team and keep it running.',
        proof: ['counselor', 'cases', 'ai-atc', 'banky'],
        icon: 'M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01',
      },
    ],
  },
  projects: {
    label: 'Products',
    title: 'Ready-made systems, installed on your hardware.',
    lede: 'Each product can be installed as it is or tailored to your organisation. Together, they show what we can build for you.',
    featured: 'Flagship product',
    readMore: 'Read more',
    soon: 'A new system is in the lab.',
    next: 'Next',
    forLabel: 'For',
  },
  about: {
    label: 'Why private AI',
    title: 'Your data, your hardware, your system.',
    lede: 'Cloud AI means sending your documents, questions and customers’ data to someone else’s servers, and paying for every request. Private AI turns that around.',
    principles: [
      {
        title: 'Your data stays in-house',
        body: 'Nothing is sent to a cloud AI provider. Keeping data under your control makes confidentiality and GDPR far simpler.',
      },
      {
        title: 'Predictable costs',
        body: 'No per-question or per-token billing. You pay for the system, not for every time someone uses it.',
      },
      {
        title: 'Works without internet',
        body: 'The core keeps running offline, because nothing in it depends on an outside service.',
      },
      {
        title: 'Checked, not guessed',
        body: 'The AI proposes; plain code verifies numbers, sources and rules before anything reaches a person.',
      },
      {
        title: 'You own it',
        body: 'Installed on your machines, documented and handed over. No lock-in to a vendor account.',
      },
    ],
  },
  process: {
    label: 'How we work with you',
    title: 'From a first call to a system your team uses every day.',
    steps: [
      { title: 'Discovery call', body: 'We learn what you need to know, read or automate, and which data you already have.' },
      { title: 'Demo on your data', body: 'We run the closest product on a sample of your data, so you see real results before deciding.' },
      { title: 'Installation on your hardware', body: 'We size the machine, install and tailor the system, and connect it to your sources.' },
      { title: 'Training & support', body: 'Your team learns to use it; we keep it updated and running.' },
    ],
  },
  stack: {
    label: 'Technology',
    title: 'Built on open technology.',
    lede: 'Open-source software and open-weight models: every system can be inspected, rebuilt and run on your hardware without a vendor account.',
  },
  sales: {
    demo: 'Request a demo',
    demoSubject: 'Demo request',
    demoBody: 'Hello, I would like to see a demo.',
    outcomes: 'What changes for you',
    audiences: 'Who it’s for',
    tour: 'See it in action',
    capabilities: 'Everything included',
    real: 'The real app',
    realNote: 'Screenshots of the running product.',
    realNoteOther: 'Screenshots of the running product (Romanian interface).',
    delivery: 'Delivered on your hardware',
    needs: 'What you need',
    tailoring: 'Tailored to you',
    tailoringNote: 'Available as customisation for your organisation:',
    ctaTitle: 'See it running on your data.',
    ctaBody: 'Tell us what you need to know, read or automate. We will show you the closest product working on a sample of your own data.',
    tech: 'For your technical team',
    techLede: 'How it works under the hood: architecture, measured results and the engineering behind it.',
  },
  footer: {
    tagline: 'Private AI systems, installed on your hardware.',
    contact: 'Contact',
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
    title: 'North-Lab-RO — AI privat pentru afacerea ta',
    description:
      'North-Lab-RO proiectează, instalează și întreține sisteme AI private pentru companii: analiză de știri, extragere din documente, asistenți vocali și conținut generat, toate pe hardware-ul tău.',
  },
  nav: {
    services: 'Servicii',
    projects: 'Produse',
    about: 'De ce privat',
    stack: 'Cum lucrăm',
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
    lede: 'North-Lab proiectează, instalează și întreține sisteme AI private pentru compania ta. Analizează, citesc documente, vorbesc și creează, totul pe hardware-ul pe care îl deții. Datele nu ies din clădire, nu plătești cloud la fiecare utilizare și funcționează și offline.',
    ctaServices: 'Ce putem construi',
    ctaProjects: 'Vezi produsele',
    scene: 'O stea de cristal care se rotește lent într-un inel de busolă, cu o auroră în fundal',
  },
  services: {
    label: 'Ce putem construi pentru tine',
    title: 'AI privat care face treabă reală pentru afacerea ta.',
    lede: 'Fiecare sistem rulează pe serverul sau stația ta și este construit în jurul datelor tale și al felului în care lucrează echipa ta.',
    seenIn: 'Vezi în',
    items: [
      {
        title: 'Afli ce se spune, în fiecare dimineață',
        body: 'Un analist care citește non-stop presa și sursele tale și are o sinteză echilibrată gata înainte să înceapă ziua.',
        proof: ['counselor'],
        icon: en.services.items[0].icon,
      },
      {
        title: 'Transformi documentele în date de încredere',
        body: 'Extrase, facturi, bonuri și scanări devin înregistrări curate, cu fiecare cifră verificată față de original.',
        proof: ['banky'],
        icon: en.services.items[1].icon,
      },
      {
        title: 'Răspunsuri din propriile documente',
        body: 'Pui o întrebare arhivei tale și primești un răspuns ancorat în ce spun de fapt documentele.',
        proof: ['counselor', 'ai-atc'],
        icon: en.services.items[2].icon,
      },
      {
        title: 'Asistenți vocali care răspund în câteva secunde',
        body: 'Întrebări rostite la intrare, răspunsuri vorbite natural la ieșire, totul în sediul tău.',
        proof: ['ai-atc'],
        icon: en.services.items[3].icon,
      },
      {
        title: 'Conținut și experiențe, la comandă',
        body: 'Povești, cazuri, imagini și materiale de training, generate la cerere și verificate înainte să le vadă cineva.',
        proof: ['cases'],
        icon: en.services.items[4].icon,
      },
      {
        title: 'Instalat, funcțional și întreținut',
        body: 'Dimensionăm hardware-ul, instalăm totul pe mașinile tale, îți instruim echipa și ținem sistemul în funcțiune.',
        proof: ['counselor', 'cases', 'ai-atc', 'banky'],
        icon: en.services.items[5].icon,
      },
    ],
  },
  projects: {
    label: 'Produse',
    title: 'Sisteme gata făcute, instalate pe hardware-ul tău.',
    lede: 'Fiecare produs poate fi instalat ca atare sau adaptat organizației tale. Împreună, arată ce putem construi pentru tine.',
    featured: 'Produsul principal',
    readMore: 'Citește mai mult',
    soon: 'Un sistem nou este în laborator.',
    next: 'Următorul',
    forLabel: 'Pentru',
  },
  about: {
    label: 'De ce AI privat',
    title: 'Datele tale, hardware-ul tău, sistemul tău.',
    lede: 'AI-ul din cloud înseamnă să trimiți documentele, întrebările și datele clienților pe serverele altcuiva și să plătești pentru fiecare cerere. AI-ul privat schimbă asta.',
    principles: [
      {
        title: 'Datele rămân în casă',
        body: 'Nimic nu este trimis unui furnizor de AI din cloud. Când datele rămân sub controlul tău, confidențialitatea și GDPR devin mult mai simple.',
      },
      {
        title: 'Costuri previzibile',
        body: 'Fără facturare pe întrebare sau pe token. Plătești pentru sistem, nu pentru fiecare utilizare.',
      },
      {
        title: 'Funcționează fără internet',
        body: 'Partea esențială rulează și offline, pentru că nimic din ea nu depinde de un serviciu extern.',
      },
      {
        title: 'Verificat, nu ghicit',
        body: 'AI-ul propune; codul obișnuit verifică cifrele, sursele și regulile înainte ca ceva să ajungă la un om.',
      },
      {
        title: 'Este al tău',
        body: 'Instalat pe mașinile tale, documentat și predat. Fără dependență de contul vreunui furnizor.',
      },
    ],
  },
  process: {
    label: 'Cum lucrăm cu tine',
    title: 'De la primul apel la un sistem pe care echipa ta îl folosește zilnic.',
    steps: [
      { title: 'Discuția inițială', body: 'Aflăm ce ai nevoie să știi, să citești sau să automatizezi și ce date ai deja.' },
      { title: 'Demonstrație pe datele tale', body: 'Rulăm cel mai apropiat produs pe un eșantion din datele tale, ca să vezi rezultate reale înainte să decizi.' },
      { title: 'Instalare pe hardware-ul tău', body: 'Dimensionăm mașina, instalăm și adaptăm sistemul și îl conectăm la sursele tale.' },
      { title: 'Instruire și suport', body: 'Echipa ta învață să îl folosească; noi îl ținem actualizat și funcțional.' },
    ],
  },
  stack: {
    label: 'Tehnologie',
    title: 'Construit pe tehnologie deschisă.',
    lede: 'Software open source și modele cu ponderi deschise: fiecare sistem poate fi inspectat, reconstruit și rulat pe hardware-ul tău, fără contul vreunui furnizor.',
  },
  sales: {
    demo: 'Solicită o demonstrație',
    demoSubject: 'Cerere de demonstrație',
    demoBody: 'Bună ziua, aș dori o demonstrație.',
    outcomes: 'Ce se schimbă pentru tine',
    audiences: 'Pentru cine este',
    tour: 'Vezi-l în acțiune',
    capabilities: 'Tot ce include',
    real: 'Aplicația reală',
    realNote: 'Capturi de ecran din produsul funcțional.',
    realNoteOther: 'Capturi de ecran din produsul funcțional (interfață în limba engleză).',
    delivery: 'Livrat pe hardware-ul tău',
    needs: 'De ce ai nevoie',
    tailoring: 'Adaptat pentru tine',
    tailoringNote: 'Disponibile ca personalizare pentru organizația ta:',
    ctaTitle: 'Vezi-l funcționând pe datele tale.',
    ctaBody: 'Spune-ne ce ai nevoie să știi, să citești sau să automatizezi. Îți arătăm cel mai apropiat produs lucrând pe un eșantion din propriile date.',
    tech: 'Pentru echipa ta tehnică',
    techLede: 'Cum funcționează în interior: arhitectură, rezultate măsurate și inginerie.',
  },
  footer: {
    tagline: 'Sisteme AI private, instalate pe hardware-ul tău.',
    contact: 'Contact',
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
