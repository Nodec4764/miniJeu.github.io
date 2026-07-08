document.addEventListener('DOMContentLoaded', () => {
    // Top Bar Container
    const topBar = document.createElement('div');
    topBar.id = 'common-topbar';
    document.body.appendChild(topBar);

    // Only show the UI if coming from the Hub
    if (window.location.search.includes('fromHub=1')) {
        // Back Button (Top Left)
        const backBtn = document.createElement('button');
        backBtn.className = 'topbar-btn back-btn';
        backBtn.innerHTML = '← Retour';
        backBtn.onclick = () => {
            window.location.href = '../../index.html';
        };
        topBar.appendChild(backBtn);

        // Copy URL Button (Top Center)
        const copyBtn = document.createElement('button');
        copyBtn.className = 'topbar-btn copy-btn';
        copyBtn.innerHTML = 'Copier le lien';
        copyBtn.onclick = () => {
            // Build clean URL without the ?fromHub param
            const cleanUrl = window.location.origin + window.location.pathname;
            navigator.clipboard.writeText(cleanUrl).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = 'Copié !';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            });
        };
        topBar.appendChild(copyBtn);

        // Next Button (Top Right)
        if (typeof projects !== 'undefined') {
            const currentPath = window.location.pathname;
            let currentIndex = -1;
            
            for (let i = 0; i < projects.length; i++) {
                // Remove './' and check if current path includes it
                const urlPart = projects[i].url.replace('./', '');
                if (currentPath.includes(urlPart)) {
                    currentIndex = i;
                    break;
                }
            }

            // If there's a next project, show the button
            if (currentIndex !== -1 && currentIndex < projects.length - 1) {
                const nextBtn = document.createElement('button');
                nextBtn.className = 'topbar-btn next-btn';
                nextBtn.innerHTML = 'Suivant →';
                nextBtn.onclick = () => {
                    const nextUrlPart = projects[currentIndex + 1].url.replace('./', '');
                    window.location.href = '../../' + nextUrlPart + '?fromHub=1';
                };
                topBar.appendChild(nextBtn);
            }
        }
    }
});
