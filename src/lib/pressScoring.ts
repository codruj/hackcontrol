export interface ScoringContext {
  hackathonNames: string[];
  sponsorNames: string[];
  mentorCompanies: string[];
  judgeCompanies: string[];
  customKeywords: string[];
}

export interface ScoringResult {
  score: number;
  matchedKeywords: string[];
  relatedHackathonName?: string;
}

const UTCN_TERMS = [
  "UTCN",
  "Technical University of Cluj-Napoca",
  "Universitatea Tehnică din Cluj-Napoca",
  "Universitatea Tehnica din Cluj-Napoca",
  "Universitatea Tehnica din Cluj Napoca",
];

const AIRI_TERMS = ["AIRI UTCN", "AIRI"];
const CLUJ_FULL_TERMS = ["Cluj-Napoca", "Cluj Napoca"];
const HACKATHON_TERMS = ["hackathon", "hackaton"];
const INNOVATION_TERMS = ["student innovation", "innovation event"];

function normalize(text: string): string {
  try {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  } catch {
    return text.toLowerCase();
  }
}

function containsTerms(text: string, terms: string[]): string[] {
  const n = normalize(text);
  return terms.filter((t) => n.includes(normalize(t)));
}

export function scoreArticle(
  article: { title: string; snippet?: string },
  context: ScoringContext,
): ScoringResult {
  const fullText = `${article.title} ${article.snippet ?? ""}`;
  const matched = new Set<string>();
  let score = 0;
  let relatedHackathonName: string | undefined;

  for (const name of context.hackathonNames) {
    const inTitle = normalize(article.title).includes(normalize(name));
    const inText = normalize(fullText).includes(normalize(name));
    if (inTitle) {
      score += 40;
      matched.add(name);
      if (!relatedHackathonName) relatedHackathonName = name;
    } else if (inText) {
      score += 20;
      matched.add(name);
      if (!relatedHackathonName) relatedHackathonName = name;
    }
  }

  const utcnHits = containsTerms(fullText, UTCN_TERMS);
  if (utcnHits.length > 0) {
    score += 20;
    utcnHits.forEach((t) => matched.add(t));
  }

  const airiHits = containsTerms(fullText, AIRI_TERMS);
  if (airiHits.length > 0) {
    score += 15;
    airiHits.forEach((t) => matched.add(t));
  }

  const clujFullHits = containsTerms(fullText, CLUJ_FULL_TERMS);
  if (clujFullHits.length > 0) {
    score += 10;
    clujFullHits.forEach((t) => matched.add(t));
  } else if (normalize(fullText).includes("cluj")) {
    score += 5;
    matched.add("Cluj");
  }

  for (const name of context.sponsorNames) {
    if (name.length > 3 && normalize(fullText).includes(normalize(name))) {
      score += 8;
      matched.add(name);
    }
  }

  for (const company of [...context.mentorCompanies, ...context.judgeCompanies]) {
    if (company.length > 3 && normalize(fullText).includes(normalize(company))) {
      score += 8;
      matched.add(company);
    }
  }

  const hackHits = containsTerms(fullText, HACKATHON_TERMS);
  if (hackHits.length > 0) {
    score += 5;
    hackHits.forEach((t) => matched.add(t));
  }

  const innovHits = containsTerms(fullText, INNOVATION_TERMS);
  if (innovHits.length > 0) {
    score += 3;
    innovHits.forEach((t) => matched.add(t));
  }

  for (const kw of context.customKeywords) {
    if (kw.length > 1 && normalize(fullText).includes(normalize(kw))) {
      score += normalize(article.title).includes(normalize(kw)) ? 20 : 10;
      matched.add(kw);
    }
  }

  const customHit = context.customKeywords.some(
    (kw) => kw.length > 1 && normalize(fullText).includes(normalize(kw)),
  );

  const hasContext =
    utcnHits.length > 0 ||
    airiHits.length > 0 ||
    hackHits.length > 0 ||
    relatedHackathonName !== undefined ||
    customHit;

  if (!hasContext) score = Math.max(0, score - 20);

  return {
    score: Math.max(0, score),
    matchedKeywords: Array.from(matched),
    relatedHackathonName,
  };
}

export function generateQueries(
  hackathonNames: string[],
  sponsorNames: string[],
  customKeywords: string[] = [],
): string[] {
  const queries: string[] = [
    "UTCN hackathon",
    "UTCN hackaton",
    "Technical University of Cluj-Napoca hackathon",
    "Universitatea Tehnica din Cluj-Napoca hackathon",
    "AIRI UTCN hackathon",
    "Cluj-Napoca hackathon UTCN",
    "AIRI UTCN hackaton",
  ];

  for (const name of hackathonNames.slice(0, 4)) {
    queries.push(`"${name}"`);
    queries.push(`"${name}" UTCN`);
    queries.push(`"${name}" Cluj-Napoca`);
  }

  for (const sponsor of sponsorNames.slice(0, 2)) {
    if (sponsor.length > 4) {
      queries.push(`"${sponsor}" hackathon UTCN`);
    }
  }

  for (const kw of customKeywords.slice(0, 5)) {
    if (kw.length > 3) {
      queries.push(`"${kw}" UTCN`);
      queries.push(`"${kw}" hackathon`);
    }
  }

  return Array.from(new Set(queries)).slice(0, 20);
}
