// Generated from real screenshots of the product with invented data. Positions are % of the image.
import type { Lang } from '../../i18n/ui';
import type { Tour } from './index';
import img0 from '../../assets/projects/ai-atc/tour/01-portal.jpg';
import img1 from '../../assets/projects/ai-atc/tour/02-radio.jpg';
import img2 from '../../assets/projects/ai-atc/tour/03-flight-plan.jpg';
import img3 from '../../assets/projects/ai-atc/tour/04-checklist.jpg';
import img4 from '../../assets/projects/ai-atc/tour/05-map.jpg';

const steps = {
  en: [
    { image: img0, alt: "Map, radios and the controller, side by side", tab: "Cockpit view", title: "Map, radios and the controller, side by side",
      points: ["Your aircraft taxiing to runway 08R", "Traffic coloured by wake category", "COM1 and COM2, active and standby, and the transponder", "Clearance, push-back and taxi, each readback checked", "Weather from the simulator: wind, visibility, QNH"],
      callouts: [{ x: 29.7, y: 35.2 }, { x: 6.3, y: 33.6 }, { x: 79.4, y: 30 }, { x: 79.4, y: 80.2 }, { x: 10.5, y: 95.4 }] },
    { image: img1, alt: "Talk to ATC like on a real frequency", tab: "Radio", title: "Talk to ATC like on a real frequency",
      points: ["Push to talk: your voice becomes text, then an ATC answer", "COM1 on Otopeni Ground, Tower on standby", "Published frequencies of nearby airports", "Suggested next transmission"],
      callouts: [{ x: 50, y: 14.2 }, { x: 50, y: 33.9 }, { x: 50, y: 69.6 }, { x: 30, y: 95.3 }] },
    { image: img2, alt: "Import a flight plan and pick the procedures", tab: "Flight plan", title: "Import a flight plan and pick the procedures",
      points: ["Callsign and aircraft type", "Import from SimBrief with your pilot ID", "Route from LROP 08R to LBSF 09", "SID, STAR and approach from navigation data", "File the plan, then ask for clearance"],
      callouts: [{ x: 50, y: 10.8 }, { x: 50, y: 29.6 }, { x: 38.9, y: 47.5 }, { x: 50, y: 75.8 }, { x: 18.3, y: 92.7 }] },
    { image: img3, alt: "Always know the next call", tab: "Flight progress", title: "Always know the next call",
      points: ["Progress through the IFR flow", "Steps ticked from the live aircraft state", "Next: ask Tower for take-off", "The phraseology for the next call"],
      callouts: [{ x: 90.7, y: 5.5 }, { x: 90.7, y: 22.4 }, { x: 90.7, y: 25.6 }, { x: 90.7, y: 93.7 }] },
    { image: img4, alt: "A busy airport around you", tab: "Live map", title: "A busy airport around you",
      points: ["Traffic departing on its route", "A heavy aircraft, shown in red", "Your aircraft on the ground at LROP", "More traffic around the airport", "Layers: follow, airports, traffic, detail"],
      callouts: [{ x: 93.1, y: 49.7 }, { x: 78.7, y: 20.6 }, { x: 50, y: 53.1 }, { x: 25.7, y: 85.7 }, { x: 56.3, y: 2.9 }] },
  ],
  ro: [
    { image: img0, alt: "Harta, radiourile și controlorul, una lângă alta", tab: "Vederea de ansamblu", title: "Harta, radiourile și controlorul, una lângă alta",
      points: ["Avionul tău rulează spre pista 08R", "Trafic colorat după categoria de turbulență de siaj", "COM1 și COM2, activ și în așteptare, plus transponderul", "Autorizare, pushback și rulare, cu fiecare confirmare verificată", "Vremea din simulator: vânt, vizibilitate, QNH"],
      callouts: [{ x: 29.7, y: 35.2 }, { x: 6.3, y: 33.6 }, { x: 79.4, y: 30 }, { x: 79.4, y: 80.2 }, { x: 10.5, y: 95.4 }] },
    { image: img1, alt: "Vorbești cu ATC ca pe o frecvență reală", tab: "Radio", title: "Vorbești cu ATC ca pe o frecvență reală",
      points: ["Apeși și vorbești: vocea devine text, apoi răspunsul ATC", "COM1 pe Otopeni Ground, Tower în așteptare", "Frecvențele publicate ale aeroporturilor din apropiere", "Următoarea transmisie sugerată"],
      callouts: [{ x: 50, y: 14.2 }, { x: 50, y: 33.9 }, { x: 50, y: 69.6 }, { x: 30, y: 95.3 }] },
    { image: img2, alt: "Imporți planul de zbor și alegi procedurile", tab: "Plan de zbor", title: "Imporți planul de zbor și alegi procedurile",
      points: ["Indicativul și tipul de avion", "Import din SimBrief cu ID-ul tău de pilot", "Ruta de la LROP 08R la LBSF 09", "SID, STAR și apropiere din datele de navigație", "Depui planul, apoi ceri autorizarea"],
      callouts: [{ x: 50, y: 10.8 }, { x: 50, y: 29.6 }, { x: 38.9, y: 47.5 }, { x: 50, y: 75.8 }, { x: 18.3, y: 92.7 }] },
    { image: img3, alt: "Știi mereu ce urmează să transmiți", tab: "Progresul zborului", title: "Știi mereu ce urmează să transmiți",
      points: ["Progresul prin etapele unui zbor IFR", "Pașii se bifează din starea reală a avionului", "Urmează: ceri decolarea de la Tower", "Frazeologia pentru următorul apel"],
      callouts: [{ x: 90.7, y: 5.5 }, { x: 90.7, y: 22.4 }, { x: 90.7, y: 25.6 }, { x: 90.7, y: 93.7 }] },
    { image: img4, alt: "Un aeroport aglomerat în jurul tău", tab: "Harta live", title: "Un aeroport aglomerat în jurul tău",
      points: ["Trafic care pleacă pe ruta lui", "Un avion greu, afișat cu roșu", "Avionul tău, la sol pe LROP", "Alt trafic în jurul aeroportului", "Straturi: urmărire, aeroporturi, trafic, detalii"],
      callouts: [{ x: 93.1, y: 49.7 }, { x: 78.7, y: 20.6 }, { x: 50, y: 53.1 }, { x: 25.7, y: 85.7 }, { x: 56.3, y: 2.9 }] },
  ],
};

export const tour = (lang: Lang): Tour => ({
  label: lang === 'ro' ? "Turul produsului AI_ATC" : "AI_ATC product tour",
  url: "atc.local",
  uiLang: "en",
  steps: steps[lang],
});
