/**
 * Personal info, links and theme. Every page reads from here.
 */

export const SITE = {
  /** Production URL (no trailing slash). Also used by astro.config.mjs. */
  url: 'https://omidrasouli22.github.io',
  name: 'Omid Rasouli',
  /** Default <title> suffix and OG site name. */
  title: 'Omid Rasouli',
  /** One-line positioning shown in the hero. */
  tagline: 'AI Engineer building data pipelines and ML systems.',
  /** Hero headline. Words in *asterisks* are set in the italic serif. */
  headline: 'AI Engineer building *data pipelines* and *ML systems*.',
  /** Small line above the headline. */
  eyebrow: 'M.Sc. AI · University of Freiburg',
  /** Availability badge in the hero. Set to '' to hide it. */
  availability: 'Open to roles in Germany',
  /** Default meta description for pages that don't set their own. */
  description:
    'Personal site and blog of Omid Rasouli, M.Sc. AI student at the University of Freiburg and software engineer. Writing about machine learning, AutoML and data engineering.',
  /** Short intro paragraph under the hero headline. */
  intro:
    "I've worked as a software engineer for over four years, mostly in Python and TypeScript, and I'm now doing an M.Sc. in Artificial Intelligence at the University of Freiburg. I build data pipelines and ML systems, and I write here about what I learn.",
  location: 'Freiburg, Germany',
  email: 'omidrasouli1998@gmail.com',
  /** Put your CV at public/cv.pdf. TODO: add the file. */
  cv: '/cv.pdf',
  locale: 'en',
  postsPerPage: 6,
} as const;

/**
 * Accent colour. The whole palette (light and dark) is derived from two OKLCH hues,
 * so changing these numbers re-themes the site, the code highlights and the OG images.
 *
 * Presets:
 *   Signal (cyan → violet)   accentHue: 200, accentHue2: 290   ← current
 *   Ember  (amber → rose)    accentHue: 65,  accentHue2: 15
 *   Acid   (lime → teal)     accentHue: 130, accentHue2: 175
 *   Ocean  (blue → indigo)   accentHue: 240, accentHue2: 275
 *   Rose   (pink → purple)   accentHue: 350, accentHue2: 300
 */
export const THEME = {
  accentHue: 200,
  accentHue2: 290,
} as const;

export const NAV = [
  { label: 'Blog', href: '/blog/' },
  { label: 'Projects', href: '/projects/' },
  { label: 'About', href: '/about/' },
] as const;

export type IconName =
  | 'github'
  | 'linkedin'
  | 'mail'
  | 'rss'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up-right'
  | 'search'
  | 'sun'
  | 'moon'
  | 'copy'
  | 'check'
  | 'link'
  | 'download'
  | 'info'
  | 'lightbulb'
  | 'alert'
  | 'x'
  | 'clock'
  | 'globe'
  | 'hash'
  | 'map-pin'
  | 'graduation';

export const SOCIALS: { label: string; href: string; icon: IconName }[] = [
  { label: 'GitHub', href: 'https://github.com/OmidRasouli22', icon: 'github' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/omid-rasouli1998/', icon: 'linkedin' },
  { label: 'Email', href: `mailto:${SITE.email}`, icon: 'mail' },
];

/** About page content. */
export const ABOUT = {
  bio: [
    "I'm Omid. I'm doing my M.Sc. in Artificial Intelligence at the University of Freiburg, and I've worked as a software engineer for more than four years, including freelance projects, mostly with Python, TypeScript, Node.js and Next.js.",
    "These days most of my time goes into machine learning and data engineering: AutoML and tabular foundation models like TabPFN on the research side, and data pipelines that run reliably on the engineering side. I'm looking for AI Engineer, Data Engineer, Data Scientist and Backend roles in Germany.",
  ],
  education: [
    {
      degree: 'M.Sc. Artificial Intelligence',
      school: 'University of Freiburg',
      location: 'Freiburg, Germany',
      period: 'TODO: start year – present',
    },
    {
      degree: 'B.Sc. Computer Engineering',
      school: 'Shiraz University of Technology',
      location: 'Shiraz, Iran',
      period: '2018 – 2023',
    },
  ],
  skills: [
    {
      area: 'AI / ML',
      items: ['Python', 'PyTorch', 'scikit-learn', 'AutoML', 'TabPFN', 'RAG', 'TODO: review list'],
    },
    {
      area: 'Data Engineering',
      items: ['SQL', 'Databricks', 'Spark', 'ETL / ELT pipelines', 'TODO: review list'],
    },
    {
      area: 'Backend',
      items: ['Python', 'Node.js', 'TypeScript', 'REST APIs', 'TODO: review list'],
    },
    {
      area: 'Frontend',
      items: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'TODO: review list'],
    },
  ],
} as const;
