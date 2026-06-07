const BASE_URL = "https://hackathons.utcluj.ro";

export const nextSeoConfig = {
  defaultTitle: "HackControl – UTCN Hackathon Platform",
  titleTemplate: "%s | HackControl",
  description:
    "HackControl brings UTCN hackathons together: from teams and mentors to judging, submissions, sponsors, and event stories.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "HackControl",
    title: "HackControl – UTCN Hackathon Platform",
    description:
      "HackControl brings UTCN hackathons together: from teams and mentors to judging, submissions, sponsors, and event stories.",
    images: [
      {
        url: `${BASE_URL}/images/og_image.jpg`,
        width: 1200,
        height: 630,
        alt: "HackControl – UTCN Hackathon Platform",
      },
    ],
  },
  additionalMetaTags: [
    {
      name: "keywords",
      content:
        "HackControl, UTCN hackathons, hackathons in Cluj-Napoca, Technical University of Cluj-Napoca, AIRI UTCN, hackathon management platform, student innovation events, hackathon Cluj, Universitatea Tehnica Cluj-Napoca",
    },
    {
      name: "robots",
      content: "index, follow",
    },
    {
      name: "author",
      content: "AIRI UTCN",
    },
  ],
  additionalLinkTags: [
    {
      rel: "icon",
      href: "/images/phck.svg",
    },
    {
      rel: "apple-touch-icon",
      href: "/images/apple-touch-icon-180x180.png",
      sizes: "180x180",
    },
    {
      rel: "apple-touch-icon",
      href: "/images/apple-touch-icon-152x152.png",
      sizes: "152x152",
    },
    {
      rel: "apple-touch-icon",
      href: "/images/apple-touch-icon-114x114.png",
      sizes: "114x114",
    },
    {
      rel: "manifest",
      href: "/manifest.json",
    },
  ],
};
