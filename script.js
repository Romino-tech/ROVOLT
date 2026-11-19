if (window.location.protocol === "http:" && window.location.hostname !== "localhost" && !window.location.hostname.startsWith("127.")) {
    window.location.replace(window.location.href.replace(/^http:/i, "https:"));
}

const contactButton = document.getElementById("contactButton");

if (contactButton) {
    contactButton.addEventListener("click", () => {
        window.location.href = "kontakt.html";
    });
}

const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-menu");
const menuDetails = menuToggle ? menuToggle.closest(".menu-details") : null;

if (menuDetails && navMenu) {
    const desktopMenuQuery = window.matchMedia("(min-width: 721px)");

    const syncMenuWithViewport = (mediaQuery) => {
        menuDetails.open = mediaQuery.matches;
    };

    syncMenuWithViewport(desktopMenuQuery);

    if (desktopMenuQuery.addEventListener) {
        desktopMenuQuery.addEventListener("change", syncMenuWithViewport);
    } else {
        desktopMenuQuery.addListener(syncMenuWithViewport);
    }

    menuDetails.addEventListener("toggle", () => {
        menuToggle.setAttribute("aria-expanded", String(menuDetails.open));
    });

    navMenu.addEventListener("click", (event) => {
        if (event.target.closest(".nav-link")) {
            menuDetails.removeAttribute("open");
        }
    });
}

const contactForm = document.getElementById("contactForm");
const messageResult = document.getElementById("messageResult");
const installationButton = document.getElementById("installationButton");
const installationDialog = document.getElementById("installationDialog");
const installationDialogClose = document.getElementById("installationDialogClose");
const installationForm = document.getElementById("installationForm");
const installationResult = document.getElementById("installationResult");

if (installationButton && installationDialog) {
    installationButton.addEventListener("click", () => {
        if (!installationDialog.open) {
            installationDialog.showModal();
        }
    });

    installationDialogClose.addEventListener("click", () => {
        installationDialog.close();
    });

    installationDialog.addEventListener("click", (event) => {
        if (event.target === installationDialog) {
            installationDialog.close();
        }
    });

    installationDialog.addEventListener("close", () => {
        installationButton.focus();
    });
}

const showFormResult = (element, message, isError = false) => {
    if (!element) {
        return;
    }

    element.hidden = false;
    element.style.display = "block";
    element.textContent = message;
    element.style.background = isError
        ? "rgba(248, 113, 113, 0.2)"
        : "rgba(34, 197, 94, 0.15)";
    element.style.borderColor = isError
        ? "rgba(248, 113, 113, 0.4)"
        : "rgba(34, 197, 94, 0.3)";
};

if (installationForm) {
    installationForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitButton = installationForm.querySelector('button[type="submit"]');
        const selectedService = installationForm.querySelector('input[name="Rozsah[]"]:checked');

        if (!selectedService) {
            showFormResult(installationResult, "Vyberte prosím aspoň jedno požadované riešenie.", true);
            return;
        }

        if (!installationForm.reportValidity()) {
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Odosielam...";

        try {
            const response = await fetch(installationForm.action, {
                method: "POST",
                body: new FormData(installationForm),
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Požiadavku sa nepodarilo odoslať.");
            }

            showFormResult(
                installationResult,
                "Požiadavka bola úspešne odoslaná. Čoskoro vás budeme kontaktovať s ďalšími krokmi."
            );
            installationForm.reset();
        } catch (error) {
            showFormResult(
                installationResult,
                "Požiadavku sa nepodarilo odoslať. Skúste to prosím znovu alebo nás kontaktujte na info@rovolt.sk.",
                true
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Odoslať požiadavku";
        }
    });
}

if (contactForm) {
    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nameInput = document.getElementById("name");
        const emailInput = document.getElementById("email");
        const messageInput = document.getElementById("message");
        const name = nameInput ? nameInput.value.trim() : "";
        const email = emailInput ? emailInput.value.trim() : "";
        const message = messageInput ? messageInput.value.trim() : "";
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!name || !email || !message) {
            if (messageResult) {
                messageResult.style.display = "block";
                messageResult.textContent = "Prosím, vyplňte všetky polia.";
                messageResult.style.background = "rgba(248, 113, 113, 0.2)";
                messageResult.style.borderColor = "rgba(248, 113, 113, 0.4)";
            }
            return;
        }

        if (!emailPattern.test(email)) {
            if (messageResult) {
                messageResult.style.display = "block";
                messageResult.textContent = "Zadajte platný e-mail.";
                messageResult.style.background = "rgba(248, 113, 113, 0.2)";
                messageResult.style.borderColor = "rgba(248, 113, 113, 0.4)";
            }
            return;
        }

        const formData = new FormData(contactForm);

        try {
            const response = await fetch(contactForm.action, {
                method: "POST",
                body: formData,
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Nastala chyba pri odoslaní správy.");
            }

            if (messageResult) {
                messageResult.style.display = "block";
                messageResult.textContent = "Správa bola úspešne odoslaná. Čoskoro vám odpovieme na info@rovolt.sk. O chvíľu budete presmerovaný späť na hlavnú stránku.";
                messageResult.style.background = "rgba(34, 197, 94, 0.15)";
                messageResult.style.borderColor = "rgba(34, 197, 94, 0.3)";
            }
            contactForm.reset();
            setTimeout(() => {
                window.location.href = "index.html";
            }, 3000);
        } catch (error) {
            if (messageResult) {
                messageResult.style.display = "block";
                messageResult.textContent = "Chyba pri odosielaní správy. Skúste prosím neskôr.";
                messageResult.style.background = "rgba(248, 113, 113, 0.2)";
                messageResult.style.borderColor = "rgba(248, 113, 113, 0.4)";
            }
        }
    });
}
