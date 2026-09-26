// Generated from real screenshots of the product with invented data. Positions are % of the image.
import type { Lang } from '../../i18n/ui';
import type { Tour } from './index';
import img0 from '../../assets/projects/athena/tour/01-dashboard.jpg';
import img1 from '../../assets/projects/athena/tour/02-case-overview.jpg';
import img2 from '../../assets/projects/athena/tour/04-collectors.jpg';
import img3 from '../../assets/projects/athena/tour/03-evidence.jpg';
import img4 from '../../assets/projects/athena/tour/05b-graph-light.jpg';
import img5 from '../../assets/projects/athena/tour/06-timeline.jpg';
import img6 from '../../assets/projects/athena/tour/08-ai-assistant.jpg';
import img7 from '../../assets/projects/athena/tour/07-reports.jpg';
import img8 from '../../assets/projects/athena/tour/10-settings-vpn.jpg';

const steps = {
  en: [
    { image: img0, alt: "Every case and how it is going", tab: "Dashboard", title: "Every case and how it is going",
      points: ["How much of the evidence an analyst has confirmed", "Evidence, collection runs and tasks over the last 30 days", "Where the evidence comes from", "Every case, with its members and status", "Whether collection is going through the VPN"],
      callouts: [{ x: 48.2, y: 25.6 }, { x: 44.8, y: 49.9 }, { x: 85.4, y: 49.9 }, { x: 20, y: 92.4 }, { x: 70.1, y: 3.4 }] },
    { image: img1, alt: "One workspace for the whole investigation", tab: "Case overview", title: "One workspace for the whole investigation",
      points: ["Tasks, subjects, evidence, collection, graph and AI in one case", "How far the evidence review has got", "Results from each automated collector", "Export the case as ZIP or STIX"],
      callouts: [{ x: 58.3, y: 25.2 }, { x: 31.4, y: 76.2 }, { x: 58.6, y: 76.2 }, { x: 85.4, y: 16.4 }] },
    { image: img2, alt: "Collection that runs on its own", tab: "Collectors", title: "Collection that runs on its own",
      points: ["Pick the subject and what to search for", "Domains, emails, names, usernames and more", "Collectors run in the background while you work", "Failed runs are shown clearly, never hidden"],
      callouts: [{ x: 31.1, y: 49.6 }, { x: 31.1, y: 56.9 }, { x: 95.1, y: 38.4 }, { x: 71.9, y: 92.7 }] },
    { image: img3, alt: "Every finding, reviewed by an analyst", tab: "Evidence", title: "Every finding, reviewed by an analyst",
      points: ["Grouped by source: DNS and WHOIS, web, social", "Confirmed by an analyst", "A confidence score for each finding", "Confirm or reject what is still pending", "Rejected findings stay on record"],
      callouts: [{ x: 93.1, y: 38.1 }, { x: 57.8, y: 48.7 }, { x: 56.8, y: 65.4 }, { x: 93.3, y: 62.3 }, { x: 58.2, y: 76 }] },
    { image: img4, alt: "See who is connected to whom", tab: "Network graph", title: "See who is connected to whom",
      points: ["An interactive network you can rearrange", "People, companies and domains, and how they connect", "Link two subjects and say how", "Colours show the type of each subject"],
      callouts: [{ x: 58.3, y: 64.1 }, { x: 28.7, y: 32.8 }, { x: 92.7, y: 32.8 }, { x: 45.8, y: 94.1 }] },
    { image: img5, alt: "A record of what happened on the case", tab: "Timeline & audit", title: "A record of what happened on the case",
      points: ["The activity on the case at a glance", "Filter by action and type", "Who did what, and when", "Exactly what changed, field by field"],
      callouts: [{ x: 28, y: 35.6 }, { x: 26.2, y: 44.6 }, { x: 32.2, y: 107.6 }, { x: 36.4, y: 110.7 }] },
    { image: img6, alt: "Ask about the case, get answers from the evidence", tab: "AI assistant", title: "Ask about the case, get answers from the evidence",
      points: ["Runs on your own server; the data never leaves", "It searches the evidence by meaning, not just keywords", "Ask in plain language", "Answers built from the case evidence, rejected findings left out", "Answers you rate well shape the next ones"],
      callouts: [{ x: 24.8, y: 34.3 }, { x: 35.2, y: 34.3 }, { x: 78.6, y: 49.3 }, { x: 50.6, y: 82.9 }, { x: 21.3, y: 85.8 }] },
    { image: img7, alt: "From findings to a report you can hand over", tab: "Reports", title: "From findings to a report you can hand over",
      points: ["Generate a structured PDF report", "Sections chosen to fit the subject", "What the report covers", "Export any report whenever you need it"],
      callouts: [{ x: 81.4, y: 32.9 }, { x: 61.3, y: 39.8 }, { x: 53.8, y: 47.3 }, { x: 91.4, y: 73.1 }] },
    { image: img8, alt: "Your models, your VPN, your rules", tab: "Privacy settings", title: "Your models, your VPN, your rules",
      points: ["Whether the VPN is up, and the address the web sees", "Add your own WireGuard or OpenVPN profiles", "The active profile, with others ready to switch to", "Profiles are stored encrypted"],
      callouts: [{ x: 63.9, y: 16.3 }, { x: 58.3, y: 29.7 }, { x: 58.3, y: 61.3 }, { x: 58.3, y: 89.8 }] },
  ],
  ro: [
    { image: img0, alt: "Toate cazurile și cum avansează", tab: "Panou", title: "Toate cazurile și cum avansează",
      points: ["Cât din dovezi a confirmat un analist", "Dovezi, colectări și sarcini din ultimele 30 de zile", "De unde vin dovezile", "Toate cazurile, cu membrii și stadiul lor", "Dacă sursele sunt interogate prin VPN"],
      callouts: [{ x: 48.2, y: 25.6 }, { x: 44.8, y: 49.9 }, { x: 85.4, y: 49.9 }, { x: 20, y: 92.4 }, { x: 70.1, y: 3.4 }] },
    { image: img1, alt: "Un singur spațiu pentru toată investigația", tab: "Prezentarea cazului", title: "Un singur spațiu pentru toată investigația",
      points: ["Sarcini, subiecți, dovezi, colectare, graf și AI, într-un singur caz", "Cât de departe a ajuns verificarea dovezilor", "Rezultatele fiecărui colector automat", "Exporți cazul ca ZIP sau STIX"],
      callouts: [{ x: 58.3, y: 25.2 }, { x: 31.4, y: 76.2 }, { x: 58.6, y: 76.2 }, { x: 85.4, y: 16.4 }] },
    { image: img2, alt: "Colectare care merge singură", tab: "Colectoare", title: "Colectare care merge singură",
      points: ["Alegi subiectul și ce cauți", "Domenii, e-mailuri, nume, conturi și altele", "Colectoarele lucrează în fundal cât timp tu lucrezi", "Colectările eșuate sunt afișate clar, nu ascunse"],
      callouts: [{ x: 31.1, y: 49.6 }, { x: 31.1, y: 56.9 }, { x: 95.1, y: 38.4 }, { x: 71.9, y: 92.7 }] },
    { image: img3, alt: "Fiecare constatare, verificată de un analist", tab: "Dovezi", title: "Fiecare constatare, verificată de un analist",
      points: ["Grupate pe sursă: DNS și WHOIS, web, rețele sociale", "Confirmată de un analist", "Un scor de încredere pentru fiecare constatare", "Confirmi sau respingi ce e în așteptare", "Constatările respinse rămân în evidență"],
      callouts: [{ x: 93.1, y: 38.1 }, { x: 57.8, y: 48.7 }, { x: 56.8, y: 65.4 }, { x: 93.3, y: 62.3 }, { x: 58.2, y: 76 }] },
    { image: img4, alt: "Vezi cine cu cine are legătură", tab: "Graficul rețelei", title: "Vezi cine cu cine are legătură",
      points: ["O rețea interactivă pe care o poți rearanja", "Persoane, firme și domenii, și legăturile dintre ele", "Legi doi subiecți și spui cum sunt legați", "Culorile arată tipul fiecărui subiect"],
      callouts: [{ x: 58.3, y: 64.1 }, { x: 28.7, y: 32.8 }, { x: 92.7, y: 32.8 }, { x: 45.8, y: 94.1 }] },
    { image: img5, alt: "O evidență a ce s-a întâmplat în caz", tab: "Cronologie și audit", title: "O evidență a ce s-a întâmplat în caz",
      points: ["Activitatea din caz, dintr-o privire", "Filtrezi după acțiune și tip", "Cine a făcut ce și când", "Exact ce s-a schimbat, câmp cu câmp"],
      callouts: [{ x: 28, y: 35.6 }, { x: 26.2, y: 44.6 }, { x: 32.2, y: 107.6 }, { x: 36.4, y: 110.7 }] },
    { image: img6, alt: "Întrebi despre caz, primești răspunsuri din dovezi", tab: "Asistent AI", title: "Întrebi despre caz, primești răspunsuri din dovezi",
      points: ["Funcționează pe serverul tău; datele nu pleacă nicăieri", "Caută în dovezi după sens, nu doar după cuvinte", "Întrebi în limbaj natural", "Răspunsuri construite din dovezile cazului, fără cele respinse", "Răspunsurile pe care le apreciezi le influențează pe următoarele"],
      callouts: [{ x: 24.8, y: 34.3 }, { x: 35.2, y: 34.3 }, { x: 78.6, y: 49.3 }, { x: 50.6, y: 82.9 }, { x: 21.3, y: 85.8 }] },
    { image: img7, alt: "De la constatări la un raport gata de predat", tab: "Rapoarte", title: "De la constatări la un raport gata de predat",
      points: ["Generezi un raport PDF structurat", "Secțiuni alese după subiect", "Ce acoperă raportul", "Exporți orice raport, oricând ai nevoie"],
      callouts: [{ x: 81.4, y: 32.9 }, { x: 61.3, y: 39.8 }, { x: 53.8, y: 47.3 }, { x: 91.4, y: 73.1 }] },
    { image: img8, alt: "Modelele tale, VPN-ul tău, regulile tale", tab: "Setări de confidențialitate", title: "Modelele tale, VPN-ul tău, regulile tale",
      points: ["Dacă VPN-ul e activ și ce adresă vede internetul", "Adaugi propriile profiluri WireGuard sau OpenVPN", "Profilul activ și celelalte, gata de folosit", "Profilurile sunt stocate criptat"],
      callouts: [{ x: 63.9, y: 16.3 }, { x: 58.3, y: 29.7 }, { x: 58.3, y: 61.3 }, { x: 58.3, y: 89.8 }] },
  ],
};

export const tour = (lang: Lang): Tour => ({
  label: lang === 'ro' ? "Turul produsului ATHENA" : "ATHENA product tour",
  url: "athena.local",
  uiLang: "en",
  steps: steps[lang],
});
