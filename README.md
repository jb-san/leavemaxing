# LeaveMaxing

LeaveMaxing is a web application designed to help you maximize your time off by
suggesting the best days to take leave based on public holidays and weekends. By
selecting your country, the year, and the number of leave days you have, the app
calculates optimal leave dates to create the longest possible consecutive free
days, such as taking a Friday off when a holiday falls on a Thursday to enjoy a
four-day weekend. It should try to find "bridge days" between public holidays
and weekends to create the longest possible free days. for example if you have
public holiday on a wednesday, it should suggest monday, tuesday, thursday and
friday as good days to take leave.

## Features

- **Year Selection**: Choose a year, defaulting to the current year, with
  options up to 5 years in the future.
- **Country Selection**: Pick your country from a dropdown of available
  countries.
- **Leave Days Input**: Enter the number of leave days you have available.
- **Calendar Display**: View each month in a calendar component, with public
  holidays highlighted in orange and suggested leave days in green.
- **Smart Leave Suggestions**: Get recommendations for leave days that maximize
  consecutive free days by connecting holidays with weekends or bridging gaps
  between free days.
- **Priority quarter**: be able to select a quarter of the year to focus on. it
  does not garantie that all leave days will be in that quarter, but it will try
  to.

## How It Works

The app fetches public holiday data for the selected year and country using the
[Nager.Date API](https://date.nager.at/). It identifies free days (weekends and
public holidays) and calculates which workdays, when taken as leave, result in
the longest consecutive free day blocks. For example, if a holiday falls on a
Thursday, it suggests taking Friday off to extend the break through the weekend.

## Technical Stack

- **[Deno](https://deno.com/)**: A modern runtime for JavaScript and TypeScript.
- **[Fresh](https://fresh.deno.dev/)**: A web framework used to build the site,
  exported as static HTML.
- **[Cloudflare Pages](https://pages.cloudflare.com/)**: Hosting platform for
  the static site.

The application is fully client-side, with all logic and rendering handled in
the browser. The site is pre-rendered to static HTML for optimal performance and
deployed to Cloudflare Pages.

## Development

### Prerequisites

- [Deno](https://deno.com/) v2.x or later

### Running Locally

```bash
# Start the development server
deno task start

# The app will be available at http://localhost:8000
```

### Building the Static Site

```bash
# Export the site to ./dist
deno task export

# Preview the static build locally
cd dist
python3 -m http.server 8080
# Or use any static file server
```

### Code Quality

```bash
# Run all checks (format, lint, type-check)
deno task check
```

## Deployment

The site automatically deploys to
[Cloudflare Pages](https://pages.cloudflare.com/) via GitHub Actions:

- **Production**: Deploys to `leavemaxxing.com` on push to `main`
- **Preview**: Deploys preview URLs for pull requests

### Initial Cloudflare Pages Setup

If you're setting up deployment for the first time:

1. **Create a Cloudflare Pages project**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
   - Click "Create a project" → "Direct Upload"
   - Name it `leavemaxing` (or update `wrangler.toml` and workflows if using a
     different name)

2. **Get your Cloudflare credentials**:
   - Account ID: Found in Cloudflare Dashboard → Workers & Pages → Account ID
   - API Token: Create at
     [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
     - Use "Create Custom Token"
     - Permissions: Account → Cloudflare Pages → Edit
     - Copy the token (you won't see it again)

3. **Add GitHub repository secrets**:
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add `CLOUDFLARE_API_TOKEN` with your API token
   - Add `CLOUDFLARE_ACCOUNT_ID` with your account ID

4. **Configure custom domain** (optional):
   - In Cloudflare Pages project settings → Custom domains
   - Add `leavemaxxing.com` (or your domain)
   - Follow DNS setup instructions

### Troubleshooting Deployment

If you see "Authentication failed (status: 400) [code: 9106]" in GitHub Actions:

1. The `CLOUDFLARE_API_TOKEN` secret needs **Cloudflare Pages: Edit** permission
2. To fix:
   - Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Create a new token with:
     - **Permissions**: `Account → Cloudflare Pages → Edit`
     - **Account Resources**: Include your account
   - Update the `CLOUDFLARE_API_TOKEN` secret in GitHub repository settings

### Manual Deployment

To deploy manually using Wrangler CLI:

```bash
# Install Wrangler (if not already installed)
npm install -g wrangler@3.90.0

# Login to Cloudflare
wrangler login

# Build and deploy
deno task export
wrangler pages deploy dist --project-name=leavemaxing
```
