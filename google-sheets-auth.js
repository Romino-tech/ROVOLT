(function() {
    const rememberedEmailKey = "rovoltRememberedEmail";
    const authOverlay = document.getElementById("authOverlay");
    const emailForm = document.getElementById("rememberEmailForm");
    const emailInput = document.getElementById("rememberedEmail");
    const status = document.getElementById("rememberEmailStatus");
    const accountButton = document.getElementById("accountButton");
    const orderEmailInput = document.querySelector('#orderForm input[name="email"]');

    function setAccountButton(email) {
        accountButton.textContent = email ? `✉️ ${email}` : "✉️ E-mail";
    }

    function showStorageError(error) {
        console.error("Remembered email storage failed:", error);
        status.textContent = "E-mail sa nepodarilo uložiť v tomto prehliadači.";
    }

    try {
        const rememberedEmail = localStorage.getItem(rememberedEmailKey) || "";
        emailInput.value = rememberedEmail;
        setAccountButton(rememberedEmail);
        if (rememberedEmail && orderEmailInput && !orderEmailInput.value) {
            orderEmailInput.value = rememberedEmail;
        }
    } catch (error) {
        setAccountButton("");
        status.textContent = "Prehliadač nepovolil prístup k lokálnemu uloženiu e-mailu.";
        console.error("Could not read remembered email:", error);
    }

    window.openAuth = function() {
        authOverlay.classList.add("open");
        emailInput.focus();
    };

    window.closeAuth = function() {
        authOverlay.classList.remove("open");
    };

    emailForm.addEventListener("submit", event => {
        event.preventDefault();
        if (!emailInput.reportValidity()) return;

        const email = emailInput.value.trim().toLowerCase();
        try {
            localStorage.setItem(rememberedEmailKey, email);
            emailInput.value = email;
            setAccountButton(email);
            if (orderEmailInput && !orderEmailInput.value) {
                orderEmailInput.value = email;
            }
            status.textContent = "E-mail je zapamätaný v tomto prehliadači.";
        } catch (error) {
            showStorageError(error);
        }
    });

    document.getElementById("forgetRememberedEmail").addEventListener("click", () => {
        const previousEmail = emailInput.value;
        try {
            localStorage.removeItem(rememberedEmailKey);
            emailInput.value = "";
            setAccountButton("");
            if (orderEmailInput && orderEmailInput.value === previousEmail) {
                orderEmailInput.value = "";
            }
            status.textContent = "Zapamätaný e-mail bol odstránený.";
        } catch (error) {
            showStorageError(error);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") window.closeAuth();
    });
})();
