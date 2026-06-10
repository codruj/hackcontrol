export interface PressSource {
  name: string;
  rssUrl?: string;
  searchRssBase?: string;
  alwaysInclude?: boolean;
}

export const pressSources: PressSource[] = [
  // UTCN & AIRI official
  {
    name: "UTCN",
    rssUrl: "https://www.utcluj.ro/feed/",
    searchRssBase: "https://www.utcluj.ro",
    alwaysInclude: true,
  },
  {
    name: "AIRI UTCN",
    rssUrl: "https://airi.utcluj.ro/feed/",
    searchRssBase: "https://airi.utcluj.ro",
    alwaysInclude: true,
  },

  // Local Cluj news
  { name: "Ziar de Cluj", rssUrl: "https://ziardecluj.ro/feed", searchRssBase: "https://ziardecluj.ro" },
  { name: "Clujeanul", rssUrl: "https://www.clujeanul.ro/feed/", searchRssBase: "https://www.clujeanul.ro" },
  { name: "Cluj24", rssUrl: "https://www.cluj24.ro/feed", searchRssBase: "https://www.cluj24.ro" },
  { name: "Cluj Life", rssUrl: "https://www.clujlife.ro/feed/", searchRssBase: "https://www.clujlife.ro" },
  { name: "Stiri de Cluj", rssUrl: "https://www.stiridecluj.ro/feed", searchRssBase: "https://www.stiridecluj.ro" },
  { name: "Monitorul de Cluj", rssUrl: "https://www.monitorulcj.ro/rss.xml", searchRssBase: "https://www.monitorulcj.ro" },
  { name: "Clujul.ro", rssUrl: "https://clujul.ro/feed" },

  // National Romanian news
  { name: "EduPedu", rssUrl: "https://www.edupedu.ro/feed/", searchRssBase: "https://www.edupedu.ro" },
  { name: "G4Media", rssUrl: "https://www.g4media.ro/feed", searchRssBase: "https://www.g4media.ro" },
  { name: "PressOne", rssUrl: "https://pressone.ro/feed", searchRssBase: "https://pressone.ro" },
  { name: "Digi24", rssUrl: "https://www.digi24.ro/rss.xml" },
  { name: "HotNews", rssUrl: "https://www.hotnews.ro/rss" },
  { name: "Agerpres Educatie", rssUrl: "https://www.agerpres.ro/rss/educatie-invatamant" },

  // Tech & business
  { name: "Startups.ro", rssUrl: "https://www.startups.ro/feed", searchRssBase: "https://www.startups.ro" },
  { name: "Wall-Street.ro", rssUrl: "https://www.wall-street.ro/rss.xml" },
  { name: "Economica.net", rssUrl: "https://economica.net/feed" },
];

export const searchQueries = [
  "UTCN hackathon",
  "hackathon Cluj-Napoca",
  "AIRI UTCN hackathon",
  "hackaton UTCN",
  "hackathon Universitatea Tehnica Cluj",
];
