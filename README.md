# LHWS Price App

A mobile-friendly rebuild of the JotForm **"LHWS PRICE APP - 01.01.2026"**
(https://form.jotform.com/253025919276159). It's a plain static site (HTML/CSS/JS, no build step)
for GitHub Pages, and it emails each submitted quote to you through [Web3Forms](https://web3forms.com).

## What matches the original exactly

- Every question, sub-label, option and price (45 options in 4 lists, with the same grouping).
- The same formulas, rounded to 2 decimals:
  - **RETAIL** = Water Filters + Ultraviolet Systems + Reverse Osmosis Systems + Outdoor Covers
    + Trenching × 14 + Extra Labor × 103 + Additional Material per Foot × 5
  - **PAR (8% commissionable)** = RETAIL × 0.65 + 500
  - **COST** = RETAIL × 0.50
- Number fields allow decimals, from 0 to 200.
- The hidden "Extra Charges" field (always "No") is included in the email, as the original submitted it.

The prices and formulas are in `js/pricing.js`. Change them there when prices change.

## Setup (one time)

### 1. Turn on email delivery (Web3Forms, free)
1. Go to https://web3forms.com, enter the email address that should receive quotes, and create an access key.
2. Open `js/config.js` and replace `YOUR_WEB3FORMS_ACCESS_KEY` with that key.
3. Commit and push. Until this is done, **Submit** shows "Email isn't set up yet" and sends nothing.

The access key is designed to be public. It can only send email to you.

### 2. Publish on GitHub Pages (free)
1. GitHub Pages is free only for **public** repositories. To keep the repo private you need a paid
   GitHub plan; otherwise make it public under **Settings → General → Danger Zone → Change visibility**.
   (Prices are visible in the page source either way, as they were in the JotForm.)
2. Merge this branch into `main`.
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, then pick `main` and `/ (root)`. Save.
4. After about a minute the site is live at `https://khaledhamza.github.io/LHWS-Pricing/`.

### 3. Add to Home Screen (optional)
On iPhone/iPad: open the site in Safari → Share → **Add to Home Screen**. On Android: Chrome menu → **Install app**.
It then opens full-screen like an app and still loads with weak signal.

## Updating
- Prices or wording: edit `js/pricing.js`.
- Email subject or sender name: edit `js/config.js`.
- After any change, bump `VERSION` in `sw.js` so installed copies pick it up promptly.

## Local preview
```
python3 -m http.server 8000
```
Then open http://localhost:8000.
