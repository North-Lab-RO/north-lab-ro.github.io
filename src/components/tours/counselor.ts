// Generated from real screenshots of the product with invented data. Positions are % of the image.
import type { Lang } from '../../i18n/ui';
import type { Tour } from './index';
import img0 from '../../assets/projects/counselor/tour/01-dashboard.jpg';
import img1 from '../../assets/projects/counselor/tour/02-story.jpg';
import img2 from '../../assets/projects/counselor/tour/03-map.jpg';
import img3 from '../../assets/projects/counselor/tour/04-briefing.jpg';
import img4 from '../../assets/projects/counselor/tour/05-news.jpg';
import img5 from '../../assets/projects/counselor/tour/06-ai.jpg';
import img6 from '../../assets/projects/counselor/tour/07-sources-admin.jpg';

const steps = {
  en: [
    { image: img0, alt: "The day’s news, sorted before you arrive", tab: "Today", title: "The day’s news, sorted before you arrive",
      points: ["A live strip with the top headlines", "A globe that shows where each story happens, coloured by importance", "Alerts raised only after the AI has analysed and scored the story", "How the outlets covering a story lean", "What the AI is working on right now"],
      callouts: [{ x: 2.6, y: 23 }, { x: 34.8, y: 55.2 }, { x: 61.9, y: 48 }, { x: 89.3, y: 60.2 }, { x: 17.5, y: 3.1 }] },
    { image: img1, alt: "One event, every source side by side", tab: "Story", title: "One event, every source side by side",
      points: ["How many independent sources confirm it", "Every analysis step, with the option to run it again", "A summary in three lengths: short, medium, detailed", "The political spread of the outlets that cover it", "How much the sources agree, and how sure the AI is"],
      callouts: [{ x: 24.7, y: 13.7 }, { x: 30.6, y: 38.8 }, { x: 35.5, y: 49.3 }, { x: 36.9, y: 76.9 }, { x: 62.4, y: 77.3 }] },
    { image: img2, alt: "See where the news is happening", tab: "World map", title: "See where the news is happening",
      points: ["Stories pinned where they happen", "A time window of 24 hours, 48 hours or 7 days", "Map layers: news density and live feeds", "The newest stories first, with country and number of sources", "The countries with the most stories"],
      callouts: [{ x: 48.6, y: 35.7 }, { x: 95.7, y: 12.5 }, { x: 3.5, y: 18.8 }, { x: 84.7, y: 38.7 }, { x: 2.5, y: 84.3 }] },
    { image: img3, alt: "A morning briefing, ready at 07:00", tab: "Briefing", title: "A morning briefing, ready at 07:00",
      points: ["A reference number for every report", "Coverage counted from the stories, not written by the AI", "The same briefing as a PDF, ready to print", "A summary of the last 24 hours"],
      callouts: [{ x: 29, y: 30.8 }, { x: 29.7, y: 35.5 }, { x: 70.9, y: 14.1 }, { x: 28.8, y: 42.8 }] },
    { image: img4, alt: "Every article, with a summary and its angle", tab: "News", title: "Every article, with a summary and its angle",
      points: ["Filter by day", "Filter by outlet", "An AI summary of the article", "How the article frames the story, and why", "Foreign articles translated automatically"],
      callouts: [{ x: 30, y: 29.9 }, { x: 50.8, y: 34.7 }, { x: 29.6, y: 54.4 }, { x: 27.4, y: 62.3 }, { x: 38, y: 79.7 }] },
    { image: img5, alt: "You always see what the AI is doing", tab: "AI at work", title: "You always see what the AI is doing",
      points: ["The AI is running", "Progress of every analysis step", "What is left, and how long it will take", "A small model for articles, a larger one for reports, all on your server", "What is being analysed right now"],
      callouts: [{ x: 30.9, y: 26.1 }, { x: 31.9, y: 50.6 }, { x: 30.3, y: 74.8 }, { x: 34.7, y: 80.2 }, { x: 33, y: 91.3 }] },
    { image: img6, alt: "Add the sources you trust", tab: "Sources", title: "Add the sources you trust",
      points: ["Articles at every stage of processing", "Fetch every feed now", "Paste any site: the feed is found automatically, or the page is read directly", "The health of every feed"],
      callouts: [{ x: 30.9, y: 7.3 }, { x: 31.2, y: 23.4 }, { x: 38.1, y: 38.9 }, { x: 27.6, y: 82 }] },
  ],
  ro: [
    { image: img0, alt: "Știrile zilei, ordonate înainte să ajungi", tab: "Astăzi", title: "Știrile zilei, ordonate înainte să ajungi",
      points: ["O bandă live cu titlurile principale", "Un glob care arată unde se petrece fiecare poveste, colorat după importanță", "Alerte trimise doar după ce AI-ul a analizat și punctat povestea", "Cum se poziționează publicațiile care relatează", "La ce lucrează AI-ul chiar acum"],
      callouts: [{ x: 2.6, y: 23 }, { x: 34.8, y: 55.2 }, { x: 61.9, y: 48 }, { x: 89.3, y: 60.2 }, { x: 17.5, y: 3.1 }] },
    { image: img1, alt: "Un eveniment, toate sursele alăturate", tab: "Poveste", title: "Un eveniment, toate sursele alăturate",
      points: ["Câte surse independente o confirmă", "Fiecare etapă de analiză, cu opțiunea de a o relua", "Un rezumat în trei variante: scurt, mediu, detaliat", "Orientarea politică a publicațiilor care relatează", "Cât de mult concordă sursele și cât de sigur e AI-ul"],
      callouts: [{ x: 24.7, y: 13.7 }, { x: 30.6, y: 38.8 }, { x: 35.5, y: 49.3 }, { x: 36.9, y: 76.9 }, { x: 62.4, y: 77.3 }] },
    { image: img2, alt: "Vezi unde se întâmplă știrile", tab: "Harta lumii", title: "Vezi unde se întâmplă știrile",
      points: ["Poveștile fixate acolo unde se petrec", "O fereastră de 24 de ore, 48 de ore sau 7 zile", "Straturi: densitatea știrilor și fluxuri live", "Cele mai noi povești primele, cu țara și numărul de surse", "Țările cu cele mai multe povești"],
      callouts: [{ x: 48.6, y: 35.7 }, { x: 95.7, y: 12.5 }, { x: 3.5, y: 18.8 }, { x: 84.7, y: 38.7 }, { x: 2.5, y: 84.3 }] },
    { image: img3, alt: "O sinteză de dimineață, gata la 07:00", tab: "Sinteză", title: "O sinteză de dimineață, gata la 07:00",
      points: ["Un număr de referință pentru fiecare raport", "Acoperirea e numărată din povești, nu scrisă de AI", "Aceeași sinteză ca PDF, gata de tipărit", "Rezumatul ultimelor 24 de ore"],
      callouts: [{ x: 29, y: 30.8 }, { x: 29.7, y: 35.5 }, { x: 70.9, y: 14.1 }, { x: 28.8, y: 42.8 }] },
    { image: img4, alt: "Fiecare articol, cu rezumat și unghiul lui", tab: "Știri", title: "Fiecare articol, cu rezumat și unghiul lui",
      points: ["Filtrezi după zi", "Filtrezi după publicație", "Rezumatul AI al articolului", "Cum încadrează articolul subiectul, și de ce", "Articolele străine, traduse automat"],
      callouts: [{ x: 30, y: 29.9 }, { x: 50.8, y: 34.7 }, { x: 29.6, y: 54.4 }, { x: 27.4, y: 62.3 }, { x: 38, y: 79.7 }] },
    { image: img5, alt: "Vezi mereu ce face AI-ul", tab: "AI-ul la lucru", title: "Vezi mereu ce face AI-ul",
      points: ["AI-ul este pornit", "Progresul fiecărei etape de analiză", "Ce a mai rămas și cât va dura", "Un model mic pentru articole și unul mai mare pentru rapoarte, toate pe serverul tău", "Ce se analizează chiar acum"],
      callouts: [{ x: 30.9, y: 26.1 }, { x: 31.9, y: 50.6 }, { x: 30.3, y: 74.8 }, { x: 34.7, y: 80.2 }, { x: 33, y: 91.3 }] },
    { image: img6, alt: "Adaugi sursele în care ai încredere", tab: "Surse", title: "Adaugi sursele în care ai încredere",
      points: ["Articolele în fiecare etapă de procesare", "Preiei acum toate fluxurile", "Lipești orice site: fluxul e găsit automat sau pagina e citită direct", "Starea fiecărui flux"],
      callouts: [{ x: 30.9, y: 7.3 }, { x: 31.2, y: 23.4 }, { x: 38.1, y: 38.9 }, { x: 27.6, y: 82 }] },
  ],
};

export const tour = (lang: Lang): Tour => ({
  label: lang === 'ro' ? "Turul produsului COUNSELOR" : "COUNSELOR product tour",
  url: "counselor.local",
  uiLang: "ro",
  steps: steps[lang],
});
