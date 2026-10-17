import type { APIRoute } from "astro";
import { countryByCode } from "~/data";
import { locales } from "~/data/locales";
import { getCopy } from "~/i18n";
import { countryName } from "~/i18n/format";
import { renderOg } from "~/lib/og";

export function getStaticPaths() {
  return Object.keys(locales).map((code) => ({ params: { locale: code.toLowerCase() } }));
}

export const GET: APIRoute = async ({ params }) => {
  const locale = Object.values(locales).find((item) => item.code.toLowerCase() === params.locale);
  const copy = getCopy(locale?.code);
  const country = locale ? countryByCode.get(locale.country) : undefined;
  const place = locale ? countryName(locale.country, locale.code, country?.name ?? locale.country) : "";
  const png = await renderOg({
    title: copy.home.h1,
    subtitle: place ? `${locale?.bridgeTerm ?? ""} · ${place}` : copy.home.intro,
  });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
