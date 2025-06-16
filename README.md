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
Projektový Návrh: Systém "Galaxia Obedy" - Verzia 3.0 (Stavový Model)
1. Vízia a Ciele Projektu
Vytvoriť inteligentný systém pre plánovanie a správu dodávok obedov. Cieľom je nahradiť klasický model "nákupného košíka" dynamickým a živým plánom, kde zákazník priamo upravuje požadované množstvá jedál na dni vopred. Systém musí byť pre zákazníka maximálne flexibilný a pre prevádzkovateľa musí poskytovať presné, real-time dáta pre kuchyňu, logistiku a financie.
2. Kľúčoví Používatelia a Ich Úlohy
Zákazník:
Cieľ: Priamo v jedálnom lístku vidieť a upravovať svoj osobný plán dodávok. Jednoduchým klikaním +/- okamžite a záväzne mení počet kusov jedál na ľubovoľný deň v budúcnosti, až do momentu uzávierky danej položky.
Personál (Kuchyňa & Rozvoz):
Cieľ: Mať prístup k dennej súpiske, ktorá je finálnym a uzamknutým súhrnom všetkých naplánovaných dodávok na daný deň. Tento súhrn slúži na varenie a logistiku.
Administrátor (Prevádzkovateľ):
Cieľ: Spravovať ponuku jedál, definovať uzávierky, sledovať finančné toky a mať kompletný prehľad o naplánovaných dodávkach a histórii.
3. Funkčné Požiadavky
Knižnica Jedál: Administrátor centrálne spravuje všetky ponúkané jedlá (názov, popis, alergény, cena).
Definícia Uzávierok: Administrátor priraďuje ku každému jedlu typ uzávierky (napr. "Štandardná" - deň vopred 14:30; "Expresná" - v daný deň 9:00).
Tvorba Denného Menu: Administrátor zostavuje jedálny lístok na dni vopred priradením jedál z knižnice. Systém automaticky zobrazuje finálny čas uzávierky pre každú položku.
"Živý" Jedálny Lístok:
Po prihlásení sa používateľovi zobrazí štandardný jedálny lístok.
Kľúčová funkcia: Systém automaticky načíta a pri každej položke zobrazí aktuálne naplánovaný počet kusov pre daného používateľa (napr. vedľa "Rezeň" sa zobrazí číslo "2").
Plánovanie a Úprava v Reálnom Čase:
Používateľ mení počet kusov pomocou tlačidiel + a -.
Každé kliknutie okamžite volá API a aktualizuje stav v databáze. Neexistuje krok "odoslať objednávku". Zmena je hneď záväzná.
Ak používateľ zníži počet na 0, jeho plán pre danú položku sa z databázy odstráni.
Tlačidlá + a - sa automaticky zablokujú pre každú položku, ktorej čas uzávierky už uplynul.
História Dodávok (Stránka /historia):
Slúži ako pasívny prehľad minulých, už uzamknutých a doručených dodávok. Používateľ tu vidí, čo mal objednané, v akom stave to bolo doručené a či to bolo zaplatené.
Denná Súpiska (Admin Rozhranie):
Generuje sa po čase finálnej uzávierky dňa.
Obsahuje agregovaný súhrn pre kuchyňu (napr. "Rezeň: 35x") a detailný zoznam pre rozvoz (Meno, Adresa, Telefón, Zoznam jedál, Stav platby).
Správa Stavov: Personál rozvozu môže meniť stav doručenia a označiť platbu ako prijatú.
4. Dátový Model (v Angličtine)
Table: Users
Attributes: UserID (PK), FirstName, LastName, Email, Address, Phone, AuthIdentifier.
Table: MenuItems (Knižnica jedál)
Attributes: ItemID (PK), Name, Description, Allergens, Price, DeadlineType (Text: "Standard"/"Express").
Table: DailyMenu (Denná ponuka)
Attributes: DailyMenuID (PK), Date, MenuItemID (FK to MenuItems), MenuSlot (Text: "MenuA", "MenuB", "Soup").
Computed: DeadlineTimestamp (Final calculated deadline for this specific item on this day).
Table: DeliveryPlanItems (KĽÚČOVÁ TABUĽKA)
Táto tabuľka nahrádza koncept "objednávok". Každý riadok je jeden konkrétny plán používateľa.
Attributes: PlanItemID (PK), UserID (FK to Users), DailyMenuID (FK to DailyMenu), Quantity (Number, Integer), LastUpdated (Timestamp).
Constraint: A composite key of (UserID, DailyMenuID) must be unique.
Table: OrderHistory (Pre archiváciu a fakturáciu)
Táto tabuľka sa plní automaticky (napr. skriptom) po uzávierke, keď sa plán "zamkne".
Attributes: HistoryID (PK), UserID (FK), Date, ItemsJSON (JSON snapshot of delivered items), TotalPrice, DeliveryStatus, PaymentStatus.
5. Architektúra a API (Stavový Model)
Systém má oddelený frontend a backend, ktoré komunikujú cez API.
Frontend (Klientska Aplikácia):
Zodpovedá za interaktívne používateľské rozhranie.
Backend (Serverová Aplikácia s API):
Zodpovedá za všetku biznis logiku, prácu s databázou a autentifikáciu.
Kľúčové API Endpoints:
GET /api/menu-plan: (Kľúčový endpoint) Vráti jedálny lístok na zadané obdobie. Ak je používateľ prihlásený, endpoint zároveň vráti jeho aktuálne naplánované množstvá pre každú položku (Quantity z DeliveryPlanItems).
PUT /api/set-selection: (Nový hlavný endpoint) Toto je jediný endpoint, ktorý zákazník používa na plánovanie.
Prijíma: { dailyMenuId: "...", quantity: X }.
Logika:
Overí používateľa a čas uzávierky pre dané dailyMenuId.
Ak quantity > 0: Nájsť záznam v DeliveryPlanItems pre daného používateľa a menu. Ak existuje, UPDATE jeho Quantity. Ak neexistuje, CREATE nový záznam.
Ak quantity == 0: Nájsť a DELETE existujúci záznam.
GET /api/admin/summary?date=...: Vráti dennú súpisku pre administrátora (číta z DeliveryPlanItems).
PUT /api/admin/update-status: Admin mení stav doručenia a platby (zapisuje do OrderHistory).
GET /api/order-history: Vráti históriu pre prihláseného používateľa.
POST /api/auth/...: Štandardné endpointy pre registráciu a prihlásenie.
