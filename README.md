# LHWS Pricing

A mobile-friendly copy of the JotForm **LHWS PRICE APP - 01.01.2026**
(https://form.jotform.com/253025919276159): the same questions, options, prices and
RETAIL / PAR / COST calculations, as a static site for GitHub Pages. Submissions are
emailed through [FormSubmit](https://formsubmit.co).

## Files

- `form-data.js`: every question, option and price, plus the three calculations. Edit prices here.
- `config.js`: the email address submissions go to.
- `index.html`, `app.js`, `styles.css`: the page.
- `tools/compare-with-jotform.js`: fills the original JotForm and this site with the same answers
  and compares the results. The last run is in [docs/price-check.md](docs/price-check.md).

## Setup

1. Put the receiving address in `config.js`. The first submission sends FormSubmit's one-time
   activation email to that address; click the link in it.
2. Turn on GitHub Pages: repository **Settings → Pages → Deploy from a branch → `main` / root**.
   The site is then at https://khaledhamza.github.io/LHWS-Pricing/.
3. On a phone, open the site and use **Add to Home Screen** to get the app icon.

## Re-running the price check

```sh
npm install playwright   # once, if Playwright is not installed
node tools/compare-with-jotform.js docs/price-check.md
```
