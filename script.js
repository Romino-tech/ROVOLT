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

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const message = document.getElementById("message").value.trim();

        if (!name || !email || !message) {
            messageResult.style.display = "block";
            messageResult.textContent = "Prosím, vyplňte všetky polia.";
            messageResult.style.background = "rgba(248, 113, 113, 0.2)";
            messageResult.style.borderColor = "rgba(248, 113, 113, 0.4)";
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

            messageResult.style.display = "block";
            messageResult.textContent = "Správa bola úspešne odoslaná. Čoskoro vám odpovieme na info@rovolt.sk.";
            messageResult.style.background = "rgba(34, 197, 94, 0.15)";
            messageResult.style.borderColor = "rgba(34, 197, 94, 0.3)";
            contactForm.reset();
        } catch (error) {
            messageResult.style.display = "block";
            messageResult.textContent = "Chyba pri odosielaní správy. Skúste prosím neskôr.";
            messageResult.style.background = "rgba(248, 113, 113, 0.2)";
            messageResult.style.borderColor = "rgba(248, 113, 113, 0.4)";
        }
    });
}
