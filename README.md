# LHWS Pricing

A mobile-friendly copy of the JotForm **LHWS PRICE APP - 01.01.2026**
(https://form.jotform.com/253025919276159): the same questions, options, prices and
RETAIL / PAR / COST calculations, as a static site for GitHub Pages. Submissions are
emailed through [FormSubmit](https://formsubmit.co).

## Files

- `form-data.js`: every question, option and price, plus the three calculations. Change prices on the
  admin page (below) or by editing this file.
- `admin.html`, `admin.js`, `admin.css`, `form-data-writer.js`: the admin page for changing prices.
- `config.json`: the email address submissions go to (read fresh on every submit).
- `index.html`, `app.js`, `styles.css`: the page.
- `tools/compare-with-jotform.js`: fills the original JotForm and this site with the same answers
  and compares the results. The last run is in [docs/price-check.md](docs/price-check.md).

## Setup

1. Put the receiving address in `config.json`. The first submission sends FormSubmit's one-time
   activation email to that address; click the link in it.
2. Turn on GitHub Pages: repository **Settings → Pages → Deploy from a branch → `main` / root**.
   The site is then at https://khaledhamza.github.io/LHWS-Pricing/.
3. On a phone, open the site and use **Add to Home Screen** to get the app icon.

## Changing prices

Open https://khaledhamza.github.io/LHWS-Pricing/admin.html. It loads the current prices; change any
option price, per-unit rate, the PAR % and admin fee, or the COST %. It can also add or remove options
in a list, whole lists, and number fields (each with its own rate per unit). Then **Review & save**.

Saving commits a new `form-data.js` to `main` through the GitHub API, and GitHub Pages republishes the
form within about 10 minutes. It needs a GitHub fine-grained token with **Contents: Read and write** on
this repository only; the page explains how to make one. The token is kept only in that browser (and
only if "Remember on this device" is ticked). Without a token, **Download form-data.js instead** gives
the new file to upload by hand.

`node tools/check-form-data.js` checks that the admin page's writer reproduces `form-data.js` exactly,
so a save only changes the numbers that were edited.

## Admin sign-in

The admin page asks for an email first. Only the address in `admin-config.js`
(dustinwood01@gmail.com) is accepted; the page emails it a one-time link through FormSubmit, and
opening the link on the same device signs in for 30 days. No setup is needed.

This keeps casual visitors out but is not a lock: the site has no server, so someone technical could
get past it in their own browser. They still could not change prices, because saving needs the
GitHub token.

## Re-running the price check

```sh
npm install playwright   # once, if Playwright is not installed
node tools/compare-with-jotform.js docs/price-check.md
```

The check compares against the original JotForm, so it reports mismatches once prices are changed on
the admin page.
