🚀 Galaxia Obedy - Objednávkový Systém
Moderný webový systém pre objednávanie obedov, postavený na serverless JAMstack architektúre. Projekt digitalizuje a automatizuje manuálny proces objednávok, čím šetrí čas a minimalizuje chyby pre zákazníkov aj personál.
![alt text](https://img.shields.io/badge/status-aktívny-success.svg)

![alt text](https://img.shields.io/badge/License-MIT-yellow.svg)

![alt text](https://img.shields.io/badge/Next.js-14%2B-black?logo=next.js)

![alt text](https://img.shields.io/badge/Hosted%20on-Vercel-black?logo=vercel)
✨ Živá Ukážka ✨
(Nahraďte your-vercel-deployment-url.vercel.app vašou skutočnou URL z Vercelu)
🎯 Hlavné Ciele Projektu
Aplikácia rieši problémy troch kľúčových skupín:
Zákazníci: Poskytuje jednoduché a rýchle rozhranie na prezeranie menu, objednávanie jedál a sledovanie histórie objednávok.
Personál Kuchyne: Automaticky generuje denný súhrn všetkých objednaných jedál, čím odstraňuje potrebu ručného sčítavania.
Rozvoz: Poskytuje dennú, tlačiteľnú súpisku s detailmi objednávok pre jednoduchšiu logistiku.
🌟 Kľúčové Funkcionality (v1.0)
Pre Zákazníkov:
✅ Prezeranie Menu: Dynamické načítavanie jedálneho lístka z Airtable, zoskupeného po týždňoch.
✅ Autentifikácia: Kompletný systém registrácie a prihlásenia (Email/Heslo) cez Firebase.
✅ Objednávkový Proces: Možnosť vybrať si jedlo a počet kusov a odoslať objednávku.
✅ História Objednávok: Stránka /moje-objednavky so zoznamom všetkých predchádzajúcich objednávok.
Pre Administrátora / Personál:
✅ Správa Obsahu (CMS): Jedálny lístok sa plne spravuje v používateľsky prívetivom rozhraní Airtable.
✅ Denná Súpiska: Chránená stránka /admin/rozvoz dostupná iba pre administrátora, ktorá zobrazuje:
Agregovaný súhrn všetkých jedál na aktuálny deň.
Detailný zoznam jednotlivých objednávok.
Možnosť tlače.
🛠️ Technologický Stack
Projekt je postavený na modernom, serverless prístupe s dôrazom na rýchlosť vývoja a nízke prevádzkové náklady.
Frontend & Hosting: Next.js 14+ (App Router) v TypeScripte, nasadený na Vercel.
Backend Logika: Vercel Serverless Functions (implementované ako API Routes v app/api/).
Databáza & CMS: Airtable slúži ako databáza a zároveň ako okamžité CMS.
Autentifikácia: Firebase Authentication pre správu používateľov a Firebase Admin SDK pre overovanie na serveri.
Správa Kódu: GitHub.
⚙️ Lokálne Spustenie Projektu
Pre spustenie projektu na vašom lokálnom stroji postupujte podľa nasledujúcich krokov:
1. Predpoklady:
Nainštalovaný Node.js (v18 alebo novší)
Nainštalovaný Git
2. Klonovanie Repozitára:
git clone https://github.com/palkoskoda/galaxia-objednavky.git
cd galaxia-objednavky
Use code with caution.
Bash
3. Inštalácia Závislostí:
npm install
Use code with caution.
Bash
4. Nastavenie Premenných Prostredia:
Vytvorte v koreňovom adresári projektu súbor s názvom .env.local a skopírujte do neho obsah zo súboru .env.example (ak existuje) alebo použite nasledujúcu šablónu:
# Airtable
AIRTABLE_API_KEY="keyXXXXXXXXXXXXXX"
AIRTABLE_BASE_ID="appXXXXXXXXXXXXXX"

# Firebase - Klientské premenné (bezpečné pre zdieľanie)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="1:..."

# Firebase - Serverová premenná (tajná!)
# Obsah celého service account JSON súboru, ako jeden riadok alebo správne escapovaný.
FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", ...}'

# Admin UID
# Firebase UID používateľa, ktorý bude mať prístup k admin sekcii.
ADMIN_UID="xxxxxxxxxxxxxxxxxxxx"
Use code with caution.
Env
Kde získať kľúče?
AIRTABLE_*: V nastaveniach vášho Airtable účtu a konkrétnej databázy (Base).
NEXT_PUBLIC_FIREBASE_*: Vo vašom Firebase projekte -> Project settings -> General -> Your apps -> SDK setup and configuration.
FIREBASE_SERVICE_ACCOUNT_KEY: Vo vašom Firebase projekte -> Project settings -> Service accounts -> Generate new private key.
ADMIN_UID: Vo vašom Firebase projekte -> Authentication. Je to UID používateľa, ktorého chcete nastaviť ako admina.
5. Spustenie Vývojového Servera:
npm run dev
Use code with caution.
Bash
Aplikácia bude dostupná na adrese http://localhost:3000.
🗂️ Štruktúra Projektu
/app: Jadro aplikácie s využitím App Routeru.
/api: Backendové API endpointy (serverless funkcie).
/(auth): Skupina pre routy týkajúce sa autentifikácie.
/admin: Routy dostupné len pre administrátora.
layout.tsx: Hlavný layout aplikácie.
page.tsx: Hlavná stránka s jedálnym lístkom.
/components: Zdieľané React komponenty (napr. Header).
/context: React Context pre globálny stav (napr. AuthContext).
/lib: Pomocné funkcie a konfigurácie (napr. firebase.ts, firebase-admin.ts).
/public: Statické súbory (obrázky, ikony).
💡 Možné Rozšírenia (Roadmap)
Správa Používateľov: Ukladanie mien a adries pri registrácii do Airtable.
Platobná Brána: Integrácia Stripe pre online platby za obedy.
Notifikácie: Posielanie emailových potvrdení o objednávke.
Uzávierka Objednávok: Automatické zablokovanie objednávok na daný deň po určitom čase.
Storno Objednávky: Možnosť pre zákazníka zrušiť objednávku.
Tento projekt bol vytvorený s cieľom naučiť sa a demonštrovať prácu s moderným webovým stackom. Akékoľvek príspevky alebo nápady sú vítané
