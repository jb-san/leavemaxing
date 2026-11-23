# IndexNow

[IndexNow](https://www.indexnow.org/) tells Bing, Yandex, Seznam, Naver and the
other participating engines that URLs changed, so they recrawl sooner. Google
does not use it. Google still reads `sitemap-index.xml` from `robots.txt`.

## How it is wired

- **Key file:** `public/260e8301d6a47e881a75454f316c902a.txt` contains the key
  and is served at `https://leavemaxxing.com/260e8301d6a47e881a75454f316c902a.txt`.
  The key is public by design: it only proves that we own the host.
- **Script:** `scripts/indexnow.mjs` (plain Node, no dependencies). It reads
  `dist/sitemap-index.xml`, follows the child sitemaps on disk
  (`dist/sitemap-0.xml`, …), keeps only `leavemaxxing.com` URLs, and POSTs
  `{ host, key, keyLocation, urlList }` to `https://api.indexnow.org/indexnow`
  in batches of at most 10,000 URLs. It always exits 0.
- **CI:** the last step of the `build-deploy` job in `.github/workflows/ci.yml`.
  It runs only on a push to `main`, only when the Cloudflare secrets are set,
  and only after the Pages deploy step succeeded. It waits 30 seconds so the new
  deploy is live, and has `continue-on-error: true`, so a failed ping never
  fails the deploy. Pull requests, the weekly scheduled rebuild, and manual
  runs do not ping.

## Running it by hand

```sh
pnpm build
INDEXNOW_DRY_RUN=1 node scripts/indexnow.mjs dist   # count URLs, send nothing
INDEXNOW_DELAY_MS=0 node scripts/indexnow.mjs dist  # submit now
```

`INDEXNOW_KEY` overrides the key found in `dist/` or `public/`.

## Rotating the key

Generate 32 hex characters (`node -e 'console.log(crypto.randomBytes(16).toString("hex"))'`),
add `public/<key>.txt` containing only the key, delete the old file, and update
this page. The script picks up whichever valid key file it finds.

## Responses

`200` and `202` mean the URLs were accepted. `403` means the key file could not
be fetched or does not match. Check that the deploy finished and the file is
live. `422` means a URL is not on the host. `429` means too many requests. Any
of these show up as a warning in the job log.
