import {
  Episode,
  EpisodePartType,
  EpisodeSequenceItemType,
} from "./common/episode";

(async () => {
  const episode = new Episode({
    id: "S001E001",
    parts: {
      introduction: {
        type: EpisodePartType.VOICE,
        text: `Herzlich willkommen zum Podcast "Ertragskompass" von Divizend. Ich bin Chris.`,
      },
      aiDisclaimer: {
        type: EpisodePartType.VOICE,
        text: "Vorab: Dieser Podcast ist vollständig KI-generiert, inklusive dieser Stimme, da wir als Divizend die Grenzen der mittels KI höchst personalisierten Finanzbildung erkunden möchten.",
      },
      companionDisclaimer: {
        type: EpisodePartType.VOICE,
        text: `Dieser Podcast bietet mehr als nur das, was du gerade hörst. Einerseits kannst du in der App "Divizend Companion" Freitext-Feedback geben. Auf der Basis dessen werden wir ein weiteres Experiment starten: Meinungen und Vorschläge mittels KI intelligent zu kategorisieren und zu clustern, um so die Einsetzbarkeit von LLMs für deliberative Demokratie zu prüfen. Der Divizend Companion ist kostenlos sowohl im App Store als auch bei Google Play erhältlich.`,
      },
      openSourceDisclaimer: {
        type: EpisodePartType.VOICE,
        text: "Außerdem sind wir der Überzeugung, dass Offenheit und Transparenz für den Einsatz von KI unerlässlich sind. Daher steht der Quellcode, den wir zum Generieren dieses Podcasts verwendet haben, öffentlich unter github.com Slash Divizend zur Verfügung, zum Lernen, Ausprobieren und Mitgestalten.",
      },
      introductionEnd: {
        type: EpisodePartType.VOICE,
        text: "Das so weit zum Organisatorischen. Lass uns jetzt mit der ersten Staffel des Ertragskompass beginnen: Einblicke in das Denken und die Strategien von Warren Buffett, extrahiert direkt aus den Berkshire Hathaway Shareholder Letters, die er seit neunzehnhundertsiebenundsiebzig jährlich veröffentlicht. Was sind Buffetts wichtigste Mantras?",
      },
    },
    tracks: [
      {
        sequence: [
          {
            type: EpisodeSequenceItemType.MEDIA,
            path: "germanads/manmuesste.mp3",
          },
          { type: EpisodeSequenceItemType.PAUSE, durationMs: 1000 },
          { type: EpisodeSequenceItemType.PART, partId: "introduction" },
          { type: EpisodeSequenceItemType.PART, partId: "aiDisclaimer" },
          { type: EpisodeSequenceItemType.PART, partId: "companionDisclaimer" },
          {
            type: EpisodeSequenceItemType.PART,
            partId: "openSourceDisclaimer",
          },
          { type: EpisodeSequenceItemType.PART, partId: "introductionEnd" },
          { type: EpisodeSequenceItemType.PAUSE, durationMs: 2000 },
        ],
      },
    ],
  });

  await episode.bounce();
})();
