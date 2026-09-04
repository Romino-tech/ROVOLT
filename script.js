if (window.location.protocol === "http:" && window.location.hostname !== "localhost" && !window.location.hostname.startsWith("127.")) {
    window.location.replace(window.location.href.replace(/^http:/i, "https:"));
}

const contactButton = document.getElementById("contactButton");

if (contactButton) {
    contactButton.addEventListener("click", () => {
        window.location.href = "kontakt.html";
    });
}

const contactForm = document.getElementById("contactForm");
const messageResult = document.getElementById("messageResult");

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
