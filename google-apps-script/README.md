# Prihlasovanie cez Google Sheets

Prihlasovanie používa Apps Script ako serverovú vrstvu. Heslá sa nikdy neposielajú do verejného CSV a do hárka sa ukladajú len ako HMAC-SHA-256 hash so samostatnou soľou. Apps Script tajný kľúč drží v Script Properties. Stránka prihlasovania je vložená do e-shopu cez iframe, aby prehliadač nemusel posielať heslo na verejný endpoint.

## Zoznam používateľov

Apps Script je nastavený na súkromný Google zošit, ktorý si poslal. Používa jeho hárok **Užívatelia**; ID zošita je uložené v `USERS_SPREADSHEET_ID` v `Code.gs`. Hárok musí byť v tomto zošite a nesmie byť publikovaný na webe. Zdieľaj zošit iba s dôveryhodnými administrátormi. Apps Script počas inicializácie vytvorí hlavičky, ak je hárok prázdny.

## Katalóg produktov

Hárok **Produkty** naďalej používa existujúci verejný katalóg z [google-sheets-catalog.js](../google-sheets-catalog.js). Publikuj iba hárok Produkty v zošite katalógu. Nepublikuj používateľský zošit ani hárok Užívatelia. Samotné skrytie hárka nestačí.

Ak už hárok Užívatelia obsahoval skutočné heslá a bol verejne publikovaný, okamžite zruš jeho publikovanie, odstráň pôvodné heslá a požiadaj používateľov o vytvorenie nového hesla.

## Nasadenie

1. V Apps Script vytvor nový projekt alebo použi **Rozšírenia → Apps Script** v používateľskom zošite. Kód otvorí tento zošit cez `USERS_SPREADSHEET_ID`.
2. Nahraď obsah `Code.gs` kódom z tohto priečinka. Vytvor HTML súbor s názvom `Login` a vlož obsah `Login.html`.
3. Skontroluj, že prvý riadok hárka **Užívatelia** je presne:
   `Email | Heslo hash | Salt | Rola | Aktívny | Vytvorené`
   Inicializačná funkcia existujúci neprázdny hárok neprepíše; pri iných hlavičkách ich najskôr uprav podľa tohto zoznamu. Staré heslá nekopíruj do stĺpca hashu.
4. V editore Apps Script vyberte funkciu `initializeAuth_`, spustite ju a potvrďte požadované oprávnenia. Táto funkcia skontroluje hlavičky a vytvorí tajný `PASSWORD_PEPPER` v **Nastavenia projektu → Vlastnosti skriptu**. Tajný kľúč nezdieľajte a nevkladajte do webovej stránky.
5. Vytvorte nasadenie cez **Nasadiť → Nové nasadenie → Webová aplikácia**. Nastavte **Spúšťať ako: Ja** a prístup **Všetci**. Webová aplikácia musí byť dostupná ako iframe; `doGet()` preto povoľuje vloženie stránky.
6. Skopírujte nasadenú URL, ktorá končí na `/exec`, do `GOOGLE_AUTH_APP_URL` v [../google-sheets-auth.js](../google-sheets-auth.js). Aktualizuj nasadenie po každej zmene Apps Script kódu.

## Kontrola nasadenej URL

Nasadenie aktuálne zobrazuje stránku **ROVOLT — prihlásenie** a jeho URL je zapojená v e-shope. Po zmene Apps Script kódu publikuj novú verziu cez **Nasadiť → Spravovať nasadenia → Upraviť → Nová verzia → Nasadiť**.

Registrácia vytvorí aktívny účet s rolou `customer`. Rolu `admin` zmeňte ručne iba v súkromnom hárku. Deaktivácia účtu sa vykoná nastavením stĺpca **Aktívny** na `FALSE`.
