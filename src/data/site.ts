export const SITE = {
  name: "leavemaxxing",
  url: "https://leavemaxxing.com",
  tagline: "Turn your leave days into the most time off",
  description:
    "Pick your country and how many leave days you have. leavemaxxing finds the days that link weekends and public holidays into the longest breaks.",
  links: {
    github: "https://github.com/jb-san",
  },
  rybbit: {
    host: "https://analytics.vril.tech",
    siteId: import.meta.env.PUBLIC_RYBBIT_SITE_ID as string | undefined,
  },
};
