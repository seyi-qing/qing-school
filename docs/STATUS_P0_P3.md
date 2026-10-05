# Status — P0 to P3 (KMS / qing-school)

## How to add subjects

1. **Classes & Subjects** (sidebar)
2. Right column → **Add Subject** → name (e.g. English Language), optional code
3. **Assign subject to arm** → pick arm (JSS 1 A) + subject → Assign  
   Required so **Scores / CA** can offer that subject for that class.

## P0 — isolation & safety
- [x] schoolId on core models; `schoolWhere` includes legacy null
- [x] Staff list backfill + attendance legacy fix
- [x] Student IDOR guards; password force-change for new staff
- [ ] Live Termii / Paystack keys — **your Vercel env**

## P1 — polish
- [x] Navy sidebar restored
- [x] Result checker logo; mobile report cards
- [x] Toasts on class/subject forms
- [x] Change password for all roles

## P2 — engineering
- [x] Unit test stubs + `docs/P2_ENGINEERING.md`
- [x] Migrations README (production still `db push` until you baseline)
- [ ] Git tag release on your machine (`docs/RELEASE.md`)

## P3 — design
- [x] Design tokens (spacing + status colors) in `globals.css`
- [x] Parent portal calm dashboard (prior pass)
- [ ] Real campus photos in `public/campus/` — **you upload**

## What needs your attention
See `docs/YOUR_ATTENTION.md` (keys, photos, optional git tag).
