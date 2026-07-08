document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('games-container');

    // Génération des cartes
    projects.forEach((project, index) => {
        const card = document.createElement('a');
        // Le lien pointe vers l'url exacte définie dans data.js avec un paramètre pour identifier la provenance
        card.href = project.url + "?fromHub=1";
        card.className = 'game-card';
        // Décalage de l'animation pour un bel effet d'apparition en cascade
        card.style.animationDelay = `${index * 0.1}s`;

        card.innerHTML = `
            <div class="game-icon">${project.icon}</div>
            <div class="game-title">${project.displayName}</div>
            <div class="game-status">${project.status}</div>
        `;

        container.appendChild(card);
    });
});
