const USERS_SPREADSHEET_ID = "1ZGeOrVkK9eUbwf7IxxTuj7DpbHW3-5PNw8zavPNyYzU";
const USERS_SHEET_NAME = "Užívatelia";
const USER_HEADERS = ["Email", "Heslo hash", "Salt", "Rola", "Aktívny", "Vytvorené"];
const SESSION_TTL_SECONDS = 21600;
const LOGIN_WINDOW_SECONDS = 900;
const MAX_FAILED_LOGINS = 5;

function doGet() {
    return HtmlService.createHtmlOutputFromFile("Login")
        .setTitle("ROVOLT — prihlásenie")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function initializeAuth_() {
    const sheet = getUsersSheet_();
    if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]);
    } else {
        validateHeaders_(sheet);
    }

    const properties = PropertiesService.getScriptProperties();
    if (!properties.getProperty("PASSWORD_PEPPER")) {
        properties.setProperty("PASSWORD_PEPPER", `${Utilities.getUuid()}${Utilities.getUuid()}`);
    }
}

function login(email, password) {
    const normalizedEmail = normalizeEmail_(email);
    if (!isValidEmail_(normalizedEmail) || typeof password !== "string" || !password) {
        throw new Error("Zadajte platný e-mail a heslo.");
    }

    const cache = CacheService.getScriptCache();
    const attemptsKey = getLoginAttemptsKey_(normalizedEmail);
    if (Number(cache.get(attemptsKey) || 0) >= MAX_FAILED_LOGINS) {
        throw new Error("Príliš veľa pokusov. Skúste to znova o 15 minút.");
    }

    const sheet = getUsersSheet_();
    const values = sheet.getDataRange().getValues();
    validateHeaders_(sheet);
    const userIndex = values.findIndex((row, index) =>
        index > 0 && normalizeEmail_(row[0]) === normalizedEmail
    );

    if (userIndex < 0) {
        recordFailedLogin_(attemptsKey);
        throw new Error("E-mail alebo heslo nesedia alebo účet nie je aktívny.");
    }

    const userRow = values[userIndex];
    const storedHash = String(userRow[1] || "");
    const salt = String(userRow[2] || "");
    const isActive = ["true", "áno", "ano", "1", "yes"].includes(
        String(userRow[4]).trim().toLowerCase()
    );
    if (!isActive || !salt || !constantTimeEquals_(storedHash, hashPassword_(password, salt))) {
        recordFailedLogin_(attemptsKey);
        throw new Error("E-mail alebo heslo nesedia alebo účet nie je aktívny.");
    }

    cache.remove(attemptsKey);
    const profile = {
        email: normalizedEmail,
        role: normalizeRole_(userRow[3])
    };
    const token = `${Utilities.getUuid()}${Utilities.getUuid()}`;
    cache.put(`session:${token}`, JSON.stringify(profile), SESSION_TTL_SECONDS);
    return { token, profile };
}

function register(email, password) {
    const normalizedEmail = normalizeEmail_(email);
    if (!isValidEmail_(normalizedEmail)) {
        throw new Error("Zadajte platnú e-mailovú adresu.");
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 256) {
        throw new Error("Heslo musí mať 8 až 256 znakov.");
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const sheet = getUsersSheet_();
        validateHeaders_(sheet);
        const values = sheet.getDataRange().getValues();
        const existingUser = values.slice(1).some(row => normalizeEmail_(row[0]) === normalizedEmail);
        if (existingUser) throw new Error("Účet s týmto e-mailom už existuje.");

        const salt = Utilities.getUuid();
        sheet.appendRow([
            normalizedEmail,
            hashPassword_(password, salt),
            salt,
            "customer",
            true,
            new Date()
        ]);
    } finally {
        lock.releaseLock();
    }

    return login(normalizedEmail, password);
}

function getSession(token) {
    if (typeof token !== "string" || !token) return null;
    const session = CacheService.getScriptCache().get(`session:${token}`);
    if (!session) return null;
    return JSON.parse(session);
}

function logout(token) {
    if (typeof token === "string" && token) {
        CacheService.getScriptCache().remove(`session:${token}`);
    }
    return true;
}

function getUsersSheet_() {
    const spreadsheet = SpreadsheetApp.openById(USERS_SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
    if (!sheet) throw new Error(`V tabuľke chýba hárok „${USERS_SHEET_NAME}“.`);
    return sheet;
}

function validateHeaders_(sheet) {
    const headers = sheet.getRange(1, 1, 1, USER_HEADERS.length)
        .getDisplayValues()[0]
        .map(value => value.trim());
    if (USER_HEADERS.some((header, index) => headers[index] !== header)) {
        throw new Error(`Prvý riadok hárka „${USERS_SHEET_NAME}“ musí obsahovať: ${USER_HEADERS.join(" | ")}.`);
    }
}

function normalizeEmail_(email) {
    return String(email || "").trim().toLowerCase();
}

function isValidEmail_(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeRole_(role) {
    return String(role || "").trim().toLowerCase() === "admin" ? "admin" : "customer";
}

function hashPassword_(password, salt) {
    const pepper = PropertiesService.getScriptProperties().getProperty("PASSWORD_PEPPER");
    if (!pepper) throw new Error("Prihlasovanie ešte nie je inicializované. Spustite initializeAuth_ v Apps Scripte.");
    const signature = Utilities.computeHmacSha256Signature(`${salt}:${password}`, pepper);
    return Utilities.base64Encode(signature);
}

function constantTimeEquals_(first, second) {
    if (first.length !== second.length) return false;
    let difference = 0;
    for (let index = 0; index < first.length; index += 1) {
        difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
    }
    return difference === 0;
}

function getLoginAttemptsKey_(email) {
    const digest = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        email,
        Utilities.Charset.UTF_8
    );
    return `failed-login:${Utilities.base64EncodeWebSafe(digest)}`;
}

function recordFailedLogin_(key) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const cache = CacheService.getScriptCache();
        const attempts = Number(cache.get(key) || 0) + 1;
        cache.put(key, String(attempts), LOGIN_WINDOW_SECONDS);
    } finally {
        lock.releaseLock();
    }
}
