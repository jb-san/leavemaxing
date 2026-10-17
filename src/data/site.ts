export const SITE = {
  name: "leavemaxxing",
  url: "https://leavemaxxing.com",
  tagline: "Turn your leave days into the most time off",
  description:
    "Pick your country and how many leave days you have. leavemaxxing finds the days that link weekends and public holidays into the longest breaks.",
  author: { name: "Jonathan Borg", url: "https://jonathanborg.net" },
  links: {
    github: "https://github.com/jb-san",
    linkedin: "https://www.linkedin.com/in/jonathan-borg-8a520b97/",
  },
  rybbit: {
    host: "https://analytics.vril.tech",
    siteId: import.meta.env.PUBLIC_RYBBIT_SITE_ID as string | undefined,
  },
};
