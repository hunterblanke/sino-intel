# Sino Intelligence — Complete Setup Guide
### No coding experience required

---

## What you need (all free)
- A GitHub account → https://github.com/signup
- GitHub Desktop app → https://desktop.github.com
- An Anthropic API key → https://console.anthropic.com
- A Vercel account → https://vercel.com/signup

---

## Step 1 — Install GitHub Desktop

1. Go to https://desktop.github.com
2. Click **Download for Windows** (or Mac)
3. Open the installer and follow the prompts — all default settings are fine
4. When it opens, click **Sign in to GitHub.com**
5. Enter your GitHub username and password
6. You are now connected

---

## Step 2 — Upload the project to GitHub

1. Unzip the `sino-intelligence-project.zip` file you downloaded
   - Right-click the zip file → **Extract All** → click **Extract**
   - You will see a folder called `sino-intel`

2. Open **GitHub Desktop**

3. Click **File** → **Add Local Repository**

4. Click **Choose...** and select the `sino-intel` folder you just unzipped

5. GitHub Desktop will say "This directory does not appear to be a Git repository."
   Click **create a repository** (the blue link in that message)

6. Fill in the form:
   - **Name:** `sino-intelligence`
   - **Description:** `Daily AI-curated China intelligence briefing`
   - Leave everything else as default
   - Click **Create Repository**

7. Click **Publish repository** (blue button, top right)
   - Uncheck **Keep this code private** (must be public for free Vercel hosting)
   - Click **Publish Repository**

Your project is now live on GitHub. You can view it at:
`https://github.com/YOUR_USERNAME/sino-intelligence`

---

## Step 3 — Add your Anthropic API key to GitHub

This keeps your secret key safe — it never goes in your code files.

1. Go to https://console.anthropic.com and copy your API key
   (It starts with `sk-ant-...`)

2. Go to your repo on GitHub:
   `https://github.com/YOUR_USERNAME/sino-intelligence`

3. Click **Settings** (top menu of the repo page)

4. In the left sidebar, click **Secrets and variables** → **Actions**

5. Click the green **New repository secret** button

6. Fill in:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Secret:** paste your key here

7. Click **Add secret**

Your key is now stored safely. GitHub will use it automatically when the pipeline runs.

---

## Step 4 — Deploy the website on Vercel

1. Go to https://vercel.com and click **Sign Up**
   - Choose **Continue with GitHub** — this links them together

2. Click **Add New Project**

3. You will see your `sino-intelligence` repo listed — click **Import**

4. Leave all settings exactly as they are — Vercel recognizes Next.js automatically

5. Click **Deploy**

6. Wait about 2 minutes — Vercel builds and publishes your site

7. When it says **Congratulations!** your site is live at:
   `https://sino-intelligence.vercel.app`

Click **Visit** to see it in your browser.

---

## Step 5 — Test the daily pipeline

This runs the AI script manually so you can see it working before it starts its daily schedule.

1. Go to your repo on GitHub:
   `https://github.com/YOUR_USERNAME/sino-intelligence`

2. Click the **Actions** tab (top menu)

3. In the left sidebar, click **Daily Intelligence Update**

4. Click the **Run workflow** dropdown button on the right

5. Click the green **Run workflow** button

6. A new run will appear — click on it to watch it live
   It takes about 2–3 minutes to fetch and summarize all the articles

7. When it shows a green checkmark ✓ it is done

8. Go back to your website — it will automatically update within 60 seconds
   with real, AI-summarized articles from today

From now on, this runs automatically every morning at 6:00 AM Eastern time.
You do not have to do anything.

---

## Step 6 — Custom domain (optional, ~$12/year)

If you want your site at a custom address like `sinointelligence.com` instead of
the default Vercel address:

1. Buy a domain at https://namecheap.com — search for a name and purchase it
2. In Vercel, go to your project → **Settings** → **Domains**
3. Type your domain name and click **Add**
4. Vercel will give you instructions to copy-paste into Namecheap — follow those steps
5. Within 24 hours your custom domain will be active

---

## Keeping your site updated over time

**To change which sources are monitored:**
Open `daily_pipeline.py` in any text editor (Notepad works), find the `RSS_FEEDS`
section near the top, and add or remove feed URLs. Then in GitHub Desktop,
you will see the change listed — type a short note in the **Summary** box
and click **Commit to main**, then click **Push origin**. Vercel redeploys automatically.

**To change how the website looks:**
Open `styles/Home.module.css` in a text editor and change colors, fonts, or spacing.
Save the file, then commit and push in GitHub Desktop the same way as above.

---

## Cost reference

| Service       | Cost                          |
|---------------|-------------------------------|
| GitHub        | Free                          |
| Vercel hosting| Free                          |
| Anthropic API | ~$2–3/month (40 articles/day) |
| Custom domain | ~$12/year (optional)          |

---

## File reference (what each file does)

```
sino-intel/
├── daily_pipeline.py              ← AI script that runs every morning
├── requirements.txt               ← List of tools the script needs
├── package.json                   ← List of tools the website needs
├── pages/
│   ├── _app.js                    ← Website startup file
│   └── index.js                   ← Main website page
├── styles/
│   ├── globals.css                ← Base styles
│   └── Home.module.css            ← Website visual design
├── public/
│   └── data/
│       └── articles.json          ← Updated daily by the pipeline
└── .github/
    └── workflows/
        └── daily_update.yml       ← Daily schedule (6 AM EDT)
```

---

## Getting help

If anything goes wrong, you can bring the error message back to Claude
and get step-by-step help resolving it.
