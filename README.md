Nano Banana SaaS (Next.js + Replicate + Supabase)

Setup rapide
- Copier `.env.example` en `.env.local` et remplir:
  - REPLICATE_API_TOKEN
  - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY (recommandé côté serveur)
  - INPUT_BUCKET=input-images, OUTPUT_BUCKET=output-images
- Créer deux buckets publics dans Supabase Storage: `input-images`, `output-images`.
- Créer les tables via `supabase/schema.sql`.

Démarrer

  npm run dev

Aller sur http://localhost:3000

Fonctionnement
- Upload des images d’entrée vers `input-images` (public URL).
- Appel API `/api/projects` qui lance `google/nano-banana` (Replicate).
- Téléchargement du résultat et upload dans `output-images`.
- Ligne insérée dans `public.projects` (status -> succeeded + output_image_url).

Fichiers clés
- app/page.jsx: Formulaire + upload vers Supabase + appel API
- app/api/projects/route.js: Intégration Replicate + Storage + DB
- lib/supabaseClient.js / lib/supabaseAdmin.js: clients Supabase navigateur/serveur

