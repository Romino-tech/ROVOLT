(function() {
    const authAppUrl = "https://script.google.com/macros/s/AKfycbzKXIlvZV2oOKoq-6bkGMpd6EJXOHVgfM5QqWZ3xbuY0xk-_xwEEfMvtuNO8xd2ThkfwA/exec";
    const authFrame = document.getElementById("googleAuthFrame");
    const authOverlay = document.getElementById("authOverlay");
    let currentUser = null;

    localStorage.removeItem("rovoltSession");
    localStorage.removeItem("rovoltUser");
    if (authAppUrl) authFrame.src = authAppUrl;

    window.openAuth = function() {
        authOverlay.classList.add("open");
        const setupNote = document.getElementById("authSetupNote");
        if (!authAppUrl) {
            setupNote.hidden = false;
            setupNote.textContent = "Prihlásenie aktivujete nasadením Google Apps Scriptu podľa návodu v priečinku google-apps-script.";
            authFrame.hidden = true;
            return;
        }

        setupNote.hidden = true;
        authFrame.hidden = false;
    };

    window.closeAuth = function() {
        authOverlay.classList.remove("open");
    };

    window.addEventListener("message", event => {
        if (event.source !== authFrame.contentWindow || event.data?.source !== "rovolt-google-auth") return;

        if (event.data.event === "authenticated") {
            const profile = event.data.profile;
            if (!profile || typeof profile.email !== "string" || typeof profile.role !== "string") return;
            currentUser = profile;
            document.getElementById("accountButton").textContent = `👤 ${profile.email}`;
            const emailInput = document.querySelector('#orderForm input[name="email"]');
            if (emailInput && !emailInput.value) emailInput.value = profile.email;
            return;
        }

        if (event.data.event === "signed-out") {
            currentUser = null;
            document.getElementById("accountButton").textContent = "👤 Prihlásenie";
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") window.closeAuth();
    });
})();
