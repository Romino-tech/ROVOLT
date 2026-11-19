(function() {
    const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSl0B7cJxNEi7v9j63K8dEcjADML6Ga6mxx8MgWRGaCK2oH4LiydjI1KHlwHyg3NIawz0i-et0h6s_8/pub?output=csv";

    function parseCsv(csv) {
        const rows = [];
        let row = [];
        let field = "";
        let quoted = false;

        for (let index = 0; index < csv.length; index += 1) {
            const character = csv[index];
            if (character === '"' && quoted && csv[index + 1] === '"') {
                field += '"';
                index += 1;
            } else if (character === '"') {
                quoted = !quoted;
            } else if (character === "," && !quoted) {
                row.push(field);
                field = "";
            } else if ((character === "\n" || character === "\r") && !quoted) {
                if (character === "\r" && csv[index + 1] === "\n") index += 1;
                row.push(field);
                if (row.some(value => value.trim())) rows.push(row);
                row = [];
                field = "";
            } else {
                field += character;
            }
        }

        row.push(field);
        if (row.some(value => value.trim())) rows.push(row);
        if (quoted) throw new Error("Google tabuľka obsahuje neúplné úvodzovky v CSV dátach.");
        return rows;
    }

    function normalizeText(value) {
        return String(value || "")
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function parsePrice(value, productName) {
        const normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(",", ".");
        const price = Number(normalized);
        if (!Number.isFinite(price) || price < 0) {
            throw new Error(`Produkt „${productName}“ má v Google tabuľke neplatnú cenu.`);
        }
        return price;
    }

    function getImageUrl(value) {
        const url = String(value || "").trim();
        if (!url || !/^https?:\/\//i.test(url)) return "";

        try {
            const parsedUrl = new URL(url);
            const driveFileId = parsedUrl.hostname === "drive.google.com"
                ? parsedUrl.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
                : null;
            return driveFileId
                ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w1200`
                : url;
        } catch {
            return "";
        }
    }

    function mapProduct(row) {
        const stock = normalizeText(row["Sklad"]);
        const numericStock = Number(stock.replace(",", "."));
        const availability = Number.isFinite(numericStock) && stock !== ""
            ? numericStock > 0 ? "stock" : "unavailable"
            : stock.includes("objednav") ? "order" : "unavailable";
        const image = getImageUrl(row["Obrázok URL"]);
        const stableId = normalizeText(`${row["Kategória"]}-${row["Názov produktu"]}`)
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        return {
            id: `sheet-${stableId}`,
            name: row["Názov produktu"].trim(),
            category: row["Kategória"].trim(),
            description: row["Popis"].trim(),
            price: parsePrice(row["Cena s DPH"], row["Názov produktu"]),
            discount: 0,
            availability,
            icon: "⚡",
            images: image ? [image] : [],
            mainImageIndex: 0
        };
    }

    async function loadProducts() {
        const response = await fetch(sheetUrl, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Google tabuľku sa nepodarilo načítať (${response.status}).`);
        }

        const rows = parseCsv(await response.text());
        if (rows.length < 2) throw new Error("Google tabuľka neobsahuje žiadne produkty.");

        const headers = rows[0].map(value => value.trim().replace(/^\uFEFF/, ""));
        const products = rows.slice(1)
            .map(values => Object.fromEntries(
                headers.map((header, column) => [header, (values[column] || "").trim()])
            ))
            .filter(row =>
                ["ano", "true", "1"].includes(normalizeText(row["Aktívny"]))
                && row["Názov produktu"]
                && row["Kategória"]
                && row["Popis"]
            )
            .map(mapProduct);

        if (!products.length) throw new Error("V Google tabuľke nie sú označené aktívne produkty.");
        if (new Set(products.map(product => product.id)).size !== products.length) {
            throw new Error("Google tabuľka obsahuje produkty s rovnakým názvom v rovnakej kategórii.");
        }
        return products;
    }

    window.rovoltGoogleSheet = { loadProducts };
})();
