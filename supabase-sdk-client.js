(function() {
    const projectUrl = "https://yswulzliyygeehfbgarr.supabase.co";
    const publishableKey = "sb_publishable_p4Y2liphbtLQXlTkXONgVQ_TfmvfAf8";
    const adminEmail = "info@rovolt.sk";
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let accessTokenProvider = async () => null;
    const client = window.supabase.createClient(projectUrl, publishableKey, {
        auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false
        },
        accessToken: async () => accessTokenProvider()
    });

    function assertAdminToken(token) {
        if (!token) throw new Error("Prihláste sa cez Auth0 účet administrátora pre úpravu katalógu.");
        try {
            const encodedPayload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            const payload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
            const claims = JSON.parse(atob(payload));
            if (claims.role !== "authenticated") {
                throw new Error("Auth0 token nemá rolu authenticated. Skontrolujte a nasaďte Auth0 Post Login Action.");
            }
            if (claims.email?.toLowerCase() !== adminEmail || claims.email_verified !== true) {
                throw new Error("Administrátorské úpravy povoľuje iba overený Auth0 účet info@rovolt.sk.");
            }
        } catch (error) {
            if (error instanceof SyntaxError || error instanceof TypeError) {
                throw new Error("Auth0 neposkytol platný ID token pre Supabase.");
            }
            throw error;
        }
    }

    function unwrap(result) {
        if (result.error) throw new Error(result.error.message);
        return result.data;
    }

    function publicImageUrl(path) {
        return client.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }

    async function loadCatalog() {
        const [categoryRows, productRows, imageRows] = await Promise.all([
            client.from("categories").select("id,name").order("name"),
            client.from("products").select("*").order("created_at"),
            client.from("product_images").select("*").order("sort_order")
        ]);
        const categoryNames = new Map(unwrap(categoryRows).map(category => [category.id, category.name]));
        const imagesByProduct = new Map();
        unwrap(imageRows).forEach(image => {
            const images = imagesByProduct.get(image.product_id) || [];
            images.push({ ...image, url: publicImageUrl(image.object_path) });
            imagesByProduct.set(image.product_id, images);
        });

        return {
            categories: unwrap(categoryRows),
            products: unwrap(productRows).map(product => {
                const productImages = imagesByProduct.get(product.id) || [];
                const mainIndex = Math.max(0, productImages.findIndex(image => image.is_main));
                return {
                    id: product.id,
                    categoryId: product.category_id,
                    category: categoryNames.get(product.category_id) || "Ostatné",
                    name: product.name,
                    description: product.description,
                    price: Number(product.price),
                    discount: Number(product.discount) || 0,
                    availability: product.availability,
                    icon: product.icon || "⚡",
                    images: productImages.map(image => image.url),
                    imageRecords: productImages,
                    mainImageIndex: mainIndex
                };
            })
        };
    }

    async function ensureCategory(name) {
        const existing = unwrap(await client.from("categories").select("id,name").eq("name", name).maybeSingle());
        if (existing) return existing;
        return unwrap(await client.from("categories").insert({ name }).select("id,name").single());
    }

    async function uploadImage(dataUrl, productId) {
        const blob = await fetch(dataUrl).then(response => response.blob());
        const objectPath = `${productId}/${crypto.randomUUID()}.webp`;
        unwrap(await client.storage.from("product-images").upload(objectPath, blob, {
            contentType: blob.type || "image/webp",
            upsert: false
        }));
        return objectPath;
    }

    async function saveProduct(product, productId, images, mainImageIndex, token) {
        assertAdminToken(token);
        if (productId && !uuidPattern.test(productId)) {
            throw new Error("Tento produkt je uložený iba v tomto prehliadači. Najskôr preneste katalóg do databázy.");
        }

        const category = await ensureCategory(product.category);
        const row = {
            category_id: category.id,
            name: product.name,
            description: product.description,
            price: product.price,
            discount: product.discount,
            availability: product.availability,
            icon: product.icon
        };
        const savedProduct = productId
            ? unwrap(await client.from("products").update(row).eq("id", productId).select().single())
            : unwrap(await client.from("products").insert(row).select().single());
        const existingImages = productId
            ? unwrap(await client.from("product_images").select("*").eq("product_id", savedProduct.id))
            : [];
        const nextImages = [];
        for (const [index, image] of images.entries()) {
            let objectPath;
            if (image.startsWith("data:image/")) {
                objectPath = await uploadImage(image, savedProduct.id);
            } else {
                const existingImage = existingImages.find(item => publicImageUrl(item.object_path) === image);
                if (!existingImage) throw new Error("Obrázok nie je uložený v Supabase úložisku.");
                objectPath = existingImage.object_path;
            }
            nextImages.push({
                product_id: savedProduct.id,
                object_path: objectPath,
                alt_text: product.name,
                sort_order: index,
                is_main: index === mainImageIndex
            });
        }

        if (existingImages.length) {
            unwrap(await client.from("product_images").delete().eq("product_id", savedProduct.id));
        }
        if (nextImages.length) {
            unwrap(await client.from("product_images").insert(nextImages));
        }
        const retainedPaths = new Set(nextImages.map(image => image.object_path));
        const removedPaths = existingImages.map(image => image.object_path).filter(path => !retainedPaths.has(path));
        if (removedPaths.length) {
            unwrap(await client.storage.from("product-images").remove(removedPaths));
        }
        return savedProduct.id;
    }

    async function deleteProduct(productId, token) {
        assertAdminToken(token);
        if (!uuidPattern.test(productId)) throw new Error("Tento produkt nie je uložený v databáze.");
        const images = unwrap(await client.from("product_images").select("object_path").eq("product_id", productId));
        if (images.length) {
            unwrap(await client.storage.from("product-images").remove(images.map(image => image.object_path)));
        }
        unwrap(await client.from("products").delete().eq("id", productId));
    }

    async function saveCategory(name, token) {
        assertAdminToken(token);
        return ensureCategory(name);
    }

    async function importLegacyCatalog(categories, products, token) {
        assertAdminToken(token);
        const existing = unwrap(await client.from("products").select("id").limit(1));
        if (existing.length) throw new Error("Databáza už obsahuje produkty; import bol zastavený.");
        for (const category of categories) await ensureCategory(category);
        for (const product of products) {
            const images = Array.isArray(product.images) && product.images.length > 0
                ? product.images
                : product.image ? [product.image] : [];
            await saveProduct(product, "", images, Number(product.mainImageIndex) || 0, token);
        }
    }

    async function deleteCategory(categoryId, token) {
        assertAdminToken(token);
        if (!uuidPattern.test(categoryId)) throw new Error("Táto kategória ešte nie je uložená v databáze.");
        unwrap(await client.from("categories").delete().eq("id", categoryId));
    }

    window.rovoltSupabase = {
        configureAccessToken(provider) {
            accessTokenProvider = provider;
        },
        loadCatalog,
        saveProduct,
        deleteProduct,
        saveCategory,
        deleteCategory,
        importLegacyCatalog
    };
})();
