# Farm_Work — Farmnote

เว็บบันทึกงานฟาร์มเกมที่รับทำ ใช้ติดตามงาน Genshin Impact และ Wuthering Waves หน้าเว็บเป็น static site บน GitHub Pages; Supabase Auth และ Postgres จัดเก็บข้อมูลแยกตามบัญชี

## Supabase setup

1. Create a Supabase project and copy its Project URL and **publishable** key from **Settings → API Keys**. Never use a secret or service-role key in this website.
2. In Supabase **SQL Editor**, run [`supabase/setup.sql`](supabase/setup.sql).
3. Under **Authentication → URL Configuration**, set the Site URL to `https://1n0name0n1.github.io/Farm_Work/` and add `https://1n0name0n1.github.io/Farm_Work/**` to Redirect URLs. Signup also requests this GitHub Pages address as the email confirmation redirect.
4. Keep email sign-ups enabled until deployment. Sign up once using the website, confirm your email, then disable new sign-ups in the Auth provider settings. Existing sign-ins will keep working.

## Run locally

Open `index.html` through a local static web server. `config.js` contains the public project URL and publishable key used by the browser.

## Publish with GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys on every push to `main`. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. `config.js` contains only the publishable key, which is designed to be public; Supabase Auth and RLS restrict rows to the signed-in user. Never put a secret or service-role key in the site.

The site uses email/password login. Supabase's default email sender is for testing; configure custom SMTP if email confirmations need reliable delivery.

## Job tracking

Choose **ฟาร์มเจม** to track the gem target and daily starting/ending currency and pulls. Choose **ดูแลไอดี** to set the customer, agreed payment, and duration; its checklist is recorded separately in each daily update. Set the agreed payment when adding either job type; it cannot be changed later. The dashboard counts it only after the job is marked **เสร็จแล้ว**, in the month it was completed.
