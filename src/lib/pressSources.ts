export interface PressSource {
  name: string;
  rssUrl: string;
  alwaysInclude?: boolean;
}

export const pressSources: PressSource[] = [
  // UTCN & AIRI official — keep everything from these
  { name: "UTCN", rssUrl: "https://www.utcluj.ro/feed/", alwaysInclude: true },
  { name: "AIRI UTCN", rssUrl: "https://airi.utcluj.ro/feed/", alwaysInclude: true },

  // Local Cluj news
  { name: "Ziar de Cluj", rssUrl: "https://ziardecluj.ro/feed" },
  { name: "Clujeanul", rssUrl: "https://www.clujeanul.ro/feed/" },
  { name: "Cluj24", rssUrl: "https://www.cluj24.ro/feed" },
  { name: "Monitorul de Cluj", rssUrl: "https://www.monitorulcj.ro/feed/" },
  { name: "Cluj Life", rssUrl: "https://www.clujlife.ro/feed/" },
  { name: "Stiri de Cluj", rssUrl: "https://www.stiridecluj.ro/feed" },
  { name: "Clujul.ro", rssUrl: "https://clujul.ro/feed" },

  // National Romanian news
  { name: "Agerpres", rssUrl: "https://www.agerpres.ro/rss/educatie-invatamant" },
  { name: "Digi24", rssUrl: "https://www.digi24.ro/rss.xml" },
  { name: "G4Media", rssUrl: "https://www.g4media.ro/feed" },
  { name: "PressOne", rssUrl: "https://pressone.ro/feed" },
  { name: "EduPedu", rssUrl: "https://www.edupedu.ro/feed/" },
  { name: "HotNews", rssUrl: "https://www.hotnews.ro/rss" },

  // Tech & business
  { name: "Startups.ro", rssUrl: "https://www.startups.ro/feed" },
  { name: "Wall-Street.ro", rssUrl: "https://www.wall-street.ro/rss.xml" },
  { name: "Economica.net", rssUrl: "https://economica.net/feed" },
];
