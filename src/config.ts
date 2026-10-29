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
  tagline: 'M.Sc. AI student at Freiburg, building ML systems and data pipelines.',
  /** Hero headline. Words in *asterisks* are set in the italic serif. */
  headline: 'M.Sc. AI student at Freiburg, building *ML systems* and *data pipelines*.',
  /** Small line above the headline. */
  eyebrow: 'AI & data engineering',
  /** Availability badge in the hero. Set to '' to hide it. */
  availability: 'Open to roles in Germany',
  /** "Now" line at the bottom of the hero. Set text to '' to hide it. */
  now: {
    text: 'Building German Job Market Radar on Databricks',
    href: '/projects/german-job-market-radar/',
  },
  /** Default meta description for pages that don't set their own. */
  description:
    'Personal site and blog of Omid Rasouli, M.Sc. AI student at the University of Freiburg and software engineer. Writing about machine learning, AutoML and data engineering.',
  /** Short intro paragraph under the hero headline. */
  intro:
    "I've also worked as a software engineer for over four years, mostly in Python and TypeScript, including freelance work. This is where I write about what I'm learning in machine learning and data engineering.",
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

/**
 * About page content. Shown as written: empty fields are hidden, and entries with `todo: true`
 * only appear in `npm run dev` (with a TODO badge), never in the production build.
 */
export const ABOUT = {
  bio: [
    "I'm Omid. I'm doing my M.Sc. in Artificial Intelligence at the University of Freiburg. I've been writing software professionally for more than four years, including freelance work, and from 2022 to 2025 I worked as a developer on backend and full-stack web apps with TypeScript, Node.js, NestJS, React/Next.js and SQL.",
    "Now I work more with Python, machine learning and data: tabular foundation models and AutoML in the university labs, and data pipelines on Databricks in my own projects. I'm looking for working student roles in backend, data engineering and AI engineering.",
  ],
  /** The "model card" next to the intro. */
  card: {
    baseModel: 'Software developer, 2022 – 2025',
    fineTuning: 'M.Sc. Artificial Intelligence, University of Freiburg',
    tags: ['ai-engineering', 'data-engineering', 'backend'],
    lookingFor: 'Working student roles in backend, data engineering and AI engineering',
    where: 'Freiburg, Stuttgart or remote',
  },
  /** Big numbers under the intro. Only use numbers you can back up. */
  stats: [
    { value: '4+', label: 'years writing software professionally' },
    { value: '2', label: 'research labs at the University of Freiburg' },
    { value: '5.3×', label: 'fewer FLOPs for nanoTabPFN with a data curriculum' },
    { value: '14/16', label: 'datasets won in the same study' },
  ],
  languages: [
    { language: 'English', level: 'C1' },
    { language: 'German', level: 'learning, B1 soon' },
    { language: 'Persian', level: 'native' },
  ] as { language: string; level: string }[],
  /** e.g. 'Allowed to work in Germany, no sponsorship needed'. Hidden while empty. */
  workPermit: '',
  /** Newest first. `href` links a highlight to a project page. */
  experience: [
    {
      period: 'During the M.Sc.',
      title: 'Research projects',
      org: 'University of Freiburg',
      kind: 'Deep Learning Lab · AutoML Lab',
      highlights: [
        {
          text: 'Deep Learning Lab: trained a small transformer for tabular data (nanoTabPFN) with an easy-to-hard data curriculum. It reached the same results with 5.3× fewer FLOPs and won on 14 of 16 datasets.',
          href: '/projects/nanotabpfn-curriculum-pretraining/',
        },
        {
          text: 'AutoML Lab: team project on AutoML for tabular regression (Auto-TabPFN). I worked on the baseline, the Optuna search and the data analysis.',
          href: '/projects/auto-tabpfn/',
        },
      ],
      stack: ['Python', 'PyTorch', 'Optuna', 'scikit-learn', 'pandas'],
    },
    {
      period: '2022 – 2025',
      title: 'Software developer',
      org: '', // TODO: company name
      kind: 'Backend and full-stack web apps',
      highlights: [{ text: 'Built backend and full-stack web applications, from REST APIs and databases to React and Next.js front ends.' }],
      stack: ['TypeScript', 'Node.js', 'NestJS', 'Express', 'React', 'Next.js', 'SQL'],
    },
    {
      period: '', // TODO: dates
      title: 'Freelance software engineer',
      org: '',
      kind: 'Freelance',
      highlights: [{ text: 'TODO: clients, what you built, and the results.' }],
      stack: [],
      todo: true,
    },
  ] as {
    period: string;
    title: string;
    org: string;
    kind: string;
    highlights: { text: string; href?: string }[];
    stack: string[];
    todo?: boolean;
  }[],
  education: [
    {
      degree: 'M.Sc. Artificial Intelligence',
      school: 'University of Freiburg',
      location: 'Freiburg, Germany',
      period: '', // TODO: e.g. '2025 – present'
    },
    {
      degree: 'B.Sc. Computer Engineering',
      school: 'Shiraz University of Technology',
      location: 'Shiraz, Iran',
      period: '2018 – 2023',
    },
  ],
  skills: [
    { area: 'Machine learning', items: ['Python', 'PyTorch', 'scikit-learn', 'Optuna', 'pandas'] },
    { area: 'Data engineering', items: ['dbt', 'Airflow', 'Databricks', 'PySpark', 'DuckDB', 'Streamlit'] },
    { area: 'Databases', items: ['SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Prisma'] },
    { area: 'Backend', items: ['TypeScript', 'Node.js', 'NestJS', 'Express', 'REST APIs'] },
    { area: 'Frontend', items: ['React', 'Next.js'] },
    { area: 'Tools', items: ['Git', 'Docker', 'Kubernetes', 'GitHub Actions', 'Linux'] },
  ],
  /** What you're doing right now. */
  now: [
    { text: 'Building German Job Market Radar, a pipeline over Bundesagentur für Arbeit job posts on Databricks', href: '/projects/german-job-market-radar/' },
    { text: 'Learning German, B1 soon' },
  ] as { text: string; href?: string }[],
} as const;
