document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const trainingEntryForm = document.getElementById('training-entry-form');
    const trainingIdInput = document.getElementById('training-id'); // Hidden ID for editing
    const saveTrainingBtn = document.getElementById('save-training-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const trainingListDiv = document.getElementById('training-list');
    const searchInput = document.getElementById('search-input');
    const performSearchBtn = document.getElementById('perform-search');
    const searchResultsDiv = document.getElementById('search-results');
    const exportDataBtn = document.getElementById('export-data');
    const importDataInput = document.getElementById('import-data');

    // Modal elements
    const diagramModal = document.getElementById('diagram-modal');
    const closeModalButton = document.querySelector('.close-button');
    const enlargedDiagramCanvas = document.getElementById('enlarged-diagram-canvas');
    const modalTitleDate = document.getElementById('modal-title-date');
    const editTrainingBtn = document.getElementById('edit-training-btn');
    const deleteTrainingBtn = document.getElementById('delete-training-btn');

    // Modal Detail elements
    const modalLocation = document.getElementById('modal-location');
    const modalSailHours = document.getElementById('modal-sail-hours');
    const modalWind = document.getElementById('modal-wind');
    const modalSeaState = document.getElementById('modal-sea-state');
    const modalConditions = document.getElementById('modal-conditions');
    const modalSailSetup = document.getElementById('modal-sail-setup');
    const modalMastRake = document.getElementById('modal-mast-rake');
    const modalLuffTension = document.getElementById('modal-luff-tension');
    const modalFootTension = document.getElementById('modal-foot-tension');
    const modalSpeed = document.getElementById('modal-speed');
    const modalPerformance = document.getElementById('modal-performance');
    const modalExercises = document.getElementById('modal-exercises');
    const modalGoals = document.getElementById('modal-goals');
    const modalWhatLearned = document.getElementById('modal-what-learned');
    const modalNextSteps = document.getElementById('modal-next-steps');
    const modalNotes = document.getElementById('modal-notes');

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');

    // Interactive Polar Diagram on Entry Page
    const interactivePolarDiagramCanvas = document.getElementById('interactive-polar-diagram');
    const polarRangeInputs = document.querySelectorAll('.polar-diagram-input-grid input[type="range"]');
    const rangeValueSpans = document.querySelectorAll('.polar-diagram-input-grid .range-value'); // Collection of all range value display spans

    let trainingSessions = []; // Array to store all training data
    let currentTrainingIdForModal = null; // To keep track of which training is open in modal

    // Define the labels for the polar diagram based on your HTML structure and desired order
    // THESE MUST MATCH THE IDS IN index.html AND THE DESIRED ORDER FOR DRAWING
    const polarDiagramLabels = [
        "Amwind-Geschwindigkeit",
        "Vorwind-Geschwindigkeit",
        "Wenden",
        "Halsen",
        "Start",
        "Taktik Amwindschenkel",
        "Taktik Vorwindschenkel",
        "Runden der Bojen",
        "Zielspurt",
        "Mentale Stärke",
        "Physische Fitness",
        "Ruhe und Selbstvertrauen"
    ];

    // Helper function to convert label to valid HTML ID
    function getPolarIdFromLabel(label) {
        return label.toLowerCase()
                    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss') // Handle German umlauts
                    .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
                    .replace(/-+/g, '-')       // Replace multiple hyphens with a single one
                    .replace(/^-|-$/g, '');    // Remove leading/trailing hyphens
    }

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        });
    }

    // --- Theme Toggling ---
    function applyTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        localStorage.setItem('theme', theme);
        const icon = themeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
        // Redraw canvases to update colors immediately
        // This is important because canvas elements don't automatically pick up CSS var changes
        renderTrainingGallery(); // Redraw gallery mini-diagrams
        if (diagramModal.style.display === 'flex' && currentTrainingIdForModal) {
            const currentSession = trainingSessions.find(s => s.id === currentTrainingIdForModal);
            if (currentSession) {
                 // The modal will be recreated/redrawn if still open and currentTrainingIdForModal is set
                 // but a direct redraw here is safer
                 const valuesArray = polarDiagramLabels.map(label => {
                     const fieldId = getPolarIdFromLabel(label);
                     return currentSession.polarValues[fieldId] || 0;
                 });
                 drawPolarDiagram(enlargedDiagramCanvas, valuesArray, polarDiagramLabels);
            }
        }
        // Redraw interactive diagram on entry page if it's the active tab
        if (document.getElementById('entry').classList.contains('active')) {
             updateInteractivePolarDiagram();
        }
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = localStorage.getItem('theme') || 'light';
        applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    });

    // Initialize theme on page load
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);


    // --- Tab Switching Logic ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Remove 'active' from all buttons and content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add 'active' to the clicked button and its corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Specific actions for each tab when activated
            if (targetTab === 'gallery') {
                renderTrainingGallery(); // Ensure gallery is up-to-date
            } else if (targetTab === 'entry') {
                resetEntryForm(); // Ensure form is clean or prepared for new entry
                updateInteractivePolarDiagram(); // Draw initial empty or default diagram
            } else if (targetTab === 'search') {
                searchResultsDiv.innerHTML = ''; // Clear previous search results
                searchInput.value = ''; // Clear search input
            }
        });
    });

    // --- Local Storage Management ---
    function saveTrainingSessions() {
        localStorage.setItem('sailingTrainingData', JSON.stringify(trainingSessions));
    }

    function loadTrainingSessions() {
        const data = localStorage.getItem('sailingTrainingData');
        if (data) {
            trainingSessions = JSON.parse(data);
        }
    }

    // --- Polar Diagram Drawing Function ---
    function drawPolarDiagram(canvas, values, labels) {
        if (!canvas || !canvas.getContext) {
            console.warn("Canvas element not found or not supported.");
            return;
        }

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.75;
        const numSections = labels.length;
        const spokeLength = baseRadius;

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawing

        // Get colors from CSS variables
        const polarLineColor = getComputedStyle(document.body).getPropertyValue('--polar-line-color').trim();
        const polarSpokeColor = getComputedStyle(document.body).getPropertyValue('--polar-spoke-color').trim();
        const polarFillColor = getComputedStyle(document.body).getPropertyValue('--polar-fill-color').trim();
        const polarOutlineColor = getComputedStyle(document.body).getPropertyValue('--polar-outline-color').trim();
        const polarPointColor = getComputedStyle(document.body).getPropertyValue('--polar-point-color').trim();
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color').trim(); // For labels

        // Draw concentric circles (grid)
        ctx.strokeStyle = polarLineColor;
        ctx.lineWidth = 1;
        for (let i = 2; i <= 10; i += 2) { // Draw circles for 2, 4, 6, 8, 10
            ctx.beginPath();
            ctx.arc(centerX, centerY, baseRadius * (i / 10), 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw spokes and labels
        ctx.fillStyle = textColor; // Use text color for labels
        const fontSize = canvas.width < 300 ? '10px Arial' : '12px Arial';
        ctx.font = fontSize;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = polarSpokeColor; // Spokes color

        labels.forEach((label, i) => {
            const angle = (i * (360 / numSections) - 90) * Math.PI / 180; // Start from top (-90 deg)
            const x = centerX + spokeLength * Math.cos(angle);
            const y = centerY + spokeLength * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();

            // Label positioning - slightly further out
            const labelDistance = spokeLength + 25; // Increased distance for labels
            const labelX = centerX + labelDistance * Math.cos(angle);
            const labelY = centerY + labelDistance * Math.sin(angle);

            // Handle multi-line labels
            const words = label.split(' ');
            let line = '';
            let lines = [];
            for (let j = 0; j < words.length; j++) {
                const testLine = line + words[j] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > (canvas.width / numSections * 1.5) && j > 0) { // If line too long, or last word is reached
                    lines.push(line.trim());
                    line = words[j] + ' ';
                } else {
                    line = testLine;
                }
            }
            if (line.trim() !== '') { // Add any remaining part
                lines.push(line.trim());
            }

            const lineHeight = parseInt(fontSize) * 1.2;
            const startY = labelY - (lines.length - 1) * lineHeight / 2;

            lines.forEach((l, idx) => {
                ctx.fillText(l, labelX, startY + idx * lineHeight);
            });
        });

        // Draw the "performance polygon"
        ctx.beginPath();
        ctx.strokeStyle = polarOutlineColor;
        ctx.lineWidth = 3;
        ctx.fillStyle = polarFillColor;

        const points = [];
        values.forEach((value, index) => {
            // Ensure value is a number and normalize to 0-1, clamp values
            const normalizedValue = Math.min(Math.max(parseFloat(value) || 0, 0), 10) / 10;
            const pointRadius = baseRadius * normalizedValue;
            const angle = (index * (360 / numSections) - 90) * Math.PI / 180;

            const x = centerX + pointRadius * Math.cos(angle);
            const y = centerY + pointRadius * Math.sin(angle);
            points.push({ x, y });

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.closePath();
        ctx.stroke();
        ctx.fill();

        // Draw points at each vertex
        ctx.fillStyle = polarPointColor;
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2); // Small circle at each point
            ctx.fill();
        });
    }

    // --- Interactive Polar Diagram on Entry Form ---
    function updateInteractivePolarDiagram() {
        const currentPolarValues = [];
        polarDiagramLabels.forEach(label => {
            const id = getPolarIdFromLabel(label); // Use helper for consistent ID
            const inputElement = document.getElementById(id);
            if (inputElement) {
                currentPolarValues.push(parseInt(inputElement.value, 10));
                // Update the numeric value displayed next to the slider
                const valueSpan = document.querySelector(`.range-value[data-target="${id}"]`);
                if (valueSpan) {
                    valueSpan.textContent = inputElement.value;
                }
            } else {
                console.warn(`Input element with ID '${id}' not found for label '${label}'. Check HTML IDs.`);
                currentPolarValues.push(0); // Add a default value to prevent drawing errors
            }
        });
        drawPolarDiagram(interactivePolarDiagramCanvas, currentPolarValues, polarDiagramLabels);
    }

    // Attach event listeners to all range inputs for the interactive diagram
    polarRangeInputs.forEach(input => {
        input.addEventListener('input', updateInteractivePolarDiagram);
    });

    // --- Entry Form Submission (Create & Update) ---
    trainingEntryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = trainingIdInput.value ? parseInt(trainingIdInput.value, 10) : Date.now();
        const trainingDate = document.getElementById('training-date').value;
        const trainingTitle = document.getElementById('training-title').value;

        // Collect all form data including new fields
        const trainingData = {
            id: id,
            date: trainingDate,
            title: trainingTitle,
            location: document.getElementById('location').value,
            sailHours: parseFloat(document.getElementById('sail-hours').value) || 0, // Ensure number
            windDirection: document.getElementById('wind-direction').value,
            windStrength: parseInt(document.getElementById('wind-strength').value, 10) || 0, // Ensure number
            seaState: document.getElementById('sea-state').value,
            conditions: document.getElementById('conditions').value,
            sailSetup: document.getElementById('sail-setup').value,
            mastRake: document.getElementById('mast-rake').value,
            luffTension: document.getElementById('luff-tension').value,
            footTension: document.getElementById('foot-tension').value,
            speed: parseFloat(document.getElementById('speed').value) || 0, // Ensure number
            performance: parseInt(document.getElementById('performance').value, 10) || 0, // Ensure number
            exercises: document.getElementById('exercises').value,
            goals: document.getElementById('goals').value,
            whatLearned: document.getElementById('what-learned').value,
            nextSteps: document.getElementById('next-steps').value,
            notes: document.getElementById('notes').value,
            polarValues: {}
        };

        polarDiagramLabels.forEach(label => {
            const fieldId = getPolarIdFromLabel(label); // Use helper for consistent ID
            const inputElement = document.getElementById(fieldId);
            trainingData.polarValues[fieldId] = inputElement ? parseInt(inputElement.value, 10) : 0; // Ensure fallback to 0
        });

        if (trainingIdInput.value) { // Editing existing training
            const index = trainingSessions.findIndex(t => t.id === id);
            if (index !== -1) {
                trainingSessions[index] = trainingData;
                alert('Training erfolgreich aktualisiert!');
            }
        } else { // New training
            trainingSessions.push(trainingData);
            alert('Training erfolgreich gespeichert!');
        }

        saveTrainingSessions();
        resetEntryForm(); // Clear form after saving
        
        // Programmatically click the Gallery tab button to switch
        // This will also trigger renderTrainingGallery()
        document.querySelector('.tab-button[data-tab="gallery"]').click();
    });

    // --- Reset Entry Form ---
    function resetEntryForm() {
        trainingEntryForm.reset();
        trainingIdInput.value = ''; // Clear hidden ID
        saveTrainingBtn.innerHTML = '<i class="fas fa-save"></i> Training speichern'; // Reset button text
        cancelEditBtn.classList.add('hidden'); // Hide cancel button

        // Explicitly set range inputs to 0 and update their value spans
        polarRangeInputs.forEach(input => {
            input.value = 0;
            const valueSpan = document.querySelector(`.range-value[data-target="${input.id}"]`);
            if (valueSpan) {
                valueSpan.textContent = '0';
            }
        });
        updateInteractivePolarDiagram(); // Redraw diagram for reset state (all 0s)
    }

    cancelEditBtn.addEventListener('click', resetEntryForm);

    // --- Gallery Rendering ---
    function renderTrainingGallery(sessionsToDisplay = trainingSessions, targetDiv = trainingListDiv) {
        targetDiv.innerHTML = ''; // Clear previous entries

        if (sessionsToDisplay.length === 0) {
            let message = 'Noch keine Trainings eingetragen. Starte mit dem "Eintragen" Tab!';
            if (targetDiv === searchResultsDiv) {
                message = 'Keine Trainings gefunden, die zu Ihrer Suche passen.';
            }
            targetDiv.innerHTML = `<p class="empty-message">${message}</p>`;
            return;
        }

        // Sort by date descending
        sessionsToDisplay.sort((a, b) => new Date(b.date) - new Date(a.date));

        sessionsToDisplay.forEach(session => {
            const card = document.createElement('div');
            card.classList.add('training-card');
            card.dataset.id = session.id;

            // Display title, date, and mini polar diagram
            card.innerHTML = `
                <h3>${session.title}</h3>
                <p>Datum: ${session.date}</p>
                <canvas class="mini-diagram" width="200" height="200"></canvas>
            `;

            const canvas = card.querySelector('.mini-diagram');
            // IMPORTANT: Map polarValues from stored object back to an array in the correct order for drawing
            const valuesArray = polarDiagramLabels.map(label => {
                const fieldId = getPolarIdFromLabel(label);
                return session.polarValues[fieldId] || 0; // Use 0 if value is missing for any reason
            });
            drawPolarDiagram(canvas, valuesArray, polarDiagramLabels);


            card.addEventListener('click', () => {
                showEnlargedDiagram(session);
            });

            targetDiv.appendChild(card);
        });
    }

    // --- Show Enlarged Diagram / Detailed View Modal ---
    function showEnlargedDiagram(session) {
        currentTrainingIdForModal = session.id; // Store ID for edit/delete

        modalTitleDate.textContent = `${session.title} (${session.date})`;

        // Populate modal details, using || 'N/A' for missing data
        modalLocation.textContent = session.location || 'N/A';
        modalSailHours.textContent = session.sailHours !== undefined && session.sailHours !== null ? `${session.sailHours} Std.` : 'N/A';
        modalWind.textContent = `${session.windDirection || 'N/A'} ${session.windStrength !== undefined && session.windStrength !== null ? `(${session.windStrength} Bft)` : ''}`.trim();
        modalSeaState.textContent = session.seaState || 'N/A';
        modalConditions.textContent = session.conditions || 'N/A';
        modalSailSetup.textContent = session.sailSetup || 'N/A';
        modalMastRake.textContent = session.mastRake || 'N/A';
        modalLuffTension.textContent = session.luffTension || 'N/A';
        modalFootTension.textContent = session.footTension || 'N/A';
        modalSpeed.textContent = session.speed !== undefined && session.speed !== null ? `${session.speed} kn` : 'N/A';
        modalPerformance.textContent = session.performance !== undefined && session.performance !== null ? `${session.performance} / 10` : 'N/A';
        modalExercises.textContent = session.exercises || 'Keine Angaben.';
        modalGoals.textContent = session.goals || 'Keine Angaben.';
        modalWhatLearned.textContent = session.whatLearned || 'Keine Angaben.';
        modalNextSteps.textContent = session.nextSteps || 'Keine Angaben.';
        modalNotes.textContent = session.notes || 'Keine Notizen vorhanden.';

        // IMPORTANT: Map polarValues from stored object back to an array in the correct order for drawing
        const valuesArray = polarDiagramLabels.map(label => {
            const fieldId = getPolarIdFromLabel(label);
            return session.polarValues[fieldId] || 0; // Use 0 if value is missing
        });
        drawPolarDiagram(enlargedDiagramCanvas, valuesArray, polarDiagramLabels);

        diagramModal.style.display = 'flex'; // Display modal
    }

    // Close modal event listeners
    closeModalButton.addEventListener('click', () => {
        diagramModal.style.display = 'none';
        currentTrainingIdForModal = null; // Clear active training ID
    });

    window.addEventListener('click', (event) => {
        if (event.target === diagramModal) {
            diagramModal.style.display = 'none';
            currentTrainingIdForModal = null; // Clear active training ID
        }
    });

    // --- Edit Training from Modal ---
    editTrainingBtn.addEventListener('click', () => {
        if (currentTrainingIdForModal) {
            const sessionToEdit = trainingSessions.find(s => s.id === currentTrainingIdForModal);
            if (sessionToEdit) {
                // Populate the entry form with session data
                document.getElementById('training-id').value = sessionToEdit.id;
                document.getElementById('training-date').value = sessionToEdit.date || '';
                document.getElementById('training-title').value = sessionToEdit.title || '';
                document.getElementById('location').value = sessionToEdit.location || '';
                document.getElementById('sail-hours').value = sessionToEdit.sailHours || 0; // Set to 0 if null/undefined
                document.getElementById('wind-direction').value = sessionToEdit.windDirection || '';
                document.getElementById('wind-strength').value = sessionToEdit.windStrength || 0;
                document.getElementById('sea-state').value = sessionToEdit.seaState || '';
                document.getElementById('conditions').value = sessionToEdit.conditions || '';
                document.getElementById('sail-setup').value = sessionToEdit.sailSetup || '';
                document.getElementById('mast-rake').value = sessionToEdit.mastRake || '';
                document.getElementById('luff-tension').value = sessionToEdit.luffTension || '';
                document.getElementById('foot-tension').value = sessionToEdit.footTension || '';
                document.getElementById('speed').value = sessionToEdit.speed || 0;
                document.getElementById('performance').value = sessionToEdit.performance || 0;
                document.getElementById('exercises').value = sessionToEdit.exercises || '';
                document.getElementById('goals').value = sessionToEdit.goals || '';
                document.getElementById('what-learned').value = sessionToEdit.whatLearned || '';
                document.getElementById('next-steps').value = sessionToEdit.nextSteps || '';
                document.getElementById('notes').value = sessionToEdit.notes || '';

                // Populate polar diagram sliders and their value displays
                polarDiagramLabels.forEach(label => {
                    const fieldId = getPolarIdFromLabel(label); // Use helper for consistent ID
                    const inputElement = document.getElementById(fieldId);
                    if (inputElement) {
                        inputElement.value = sessionToEdit.polarValues[fieldId] !== undefined ? sessionToEdit.polarValues[fieldId] : 0;
                        const valueSpan = document.querySelector(`.range-value[data-target="${fieldId}"]`);
                        if (valueSpan) valueSpan.textContent = inputElement.value;
                    }
                });
                updateInteractivePolarDiagram(); // Redraw interactive diagram with loaded values

                saveTrainingBtn.innerHTML = '<i class="fas fa-save"></i> Training aktualisieren'; // Update button text
                cancelEditBtn.classList.remove('hidden'); // Show cancel button

                diagramModal.style.display = 'none'; // Close modal
                document.querySelector('.tab-button[data-tab="entry"]').click(); // Switch to Entry tab
            } else {
                console.error('Session to edit not found:', currentTrainingIdForModal);
                alert('Fehler: Das zu bearbeitende Training wurde nicht gefunden.');
            }
        }
    });

    // --- Delete Training from Modal ---
    deleteTrainingBtn.addEventListener('click', () => {
        if (currentTrainingIdForModal && confirm('Sind Sie sicher, dass Sie dieses Training löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            trainingSessions = trainingSessions.filter(s => s.id !== currentTrainingIdForModal);
            saveTrainingSessions();
            renderTrainingGallery(); // Re-render gallery after deletion
            diagramModal.style.display = 'none';
            currentTrainingIdForModal = null; // Clear active training ID
            alert('Training erfolgreich gelöscht.');
        }
    });


    // --- Search Functionality ---
    performSearchBtn.addEventListener('click', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm === '') {
            searchResultsDiv.innerHTML = '<p class="empty-message">Bitte geben Sie einen Suchbegriff ein, um Trainings zu finden.</p>';
            return;
        }

        const filteredSessions = trainingSessions.filter(session => {
            // Check all relevant text fields for the search term
            const searchableFields = [
                session.title,
                session.location,
                session.windDirection,
                session.seaState,
                session.conditions,
                session.sailSetup,
                session.mastRake,
                session.luffTension,
                session.footTension,
                session.exercises,
                session.goals,
                session.whatLearned,
                session.nextSteps,
                session.notes,
                session.date // Date string can be searched directly for exact matches or parts
            ];
            // Add numeric fields converted to string for search
            if (session.sailHours) searchableFields.push(String(session.sailHours));
            if (session.windStrength) searchableFields.push(String(session.windStrength));
            if (session.speed) searchableFields.push(String(session.speed));
            if (session.performance) searchableFields.push(String(session.performance));

            // Also search within polarValues (by value or by the label)
            for (const key in session.polarValues) {
                if (session.polarValues.hasOwnProperty(key)) {
                    searchableFields.push(String(session.polarValues[key])); // Search by numeric value
                    const originalLabel = polarDiagramLabels.find(l => getPolarIdFromLabel(l) === key);
                    if (originalLabel) searchableFields.push(originalLabel); // Search by the label name itself
                }
            }


            return searchableFields.some(field =>
                field && String(field).toLowerCase().includes(searchTerm)
            );
        });
        renderTrainingGallery(filteredSessions, searchResultsDiv); // Render results in searchResultsDiv
    });

    // --- Export/Import Functionality ---
    exportDataBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(trainingSessions, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'segeltraining_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Daten erfolgreich exportiert!');
    });

    importDataInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    // Basic validation for imported data structure (check if it's an array of objects with 'id', 'date', 'title')
                    if (Array.isArray(importedData) && importedData.every(item => typeof item === 'object' && item !== null && 'id' in item && 'date' in item && 'title' in item)) {
                        // Option: Merge or replace. Here, we replace for simplicity.
                        trainingSessions = importedData;
                        saveTrainingSessions();
                        alert('Daten erfolgreich importiert!');
                        // Switch to gallery tab to show imported data
                        document.querySelector('.tab-button[data-tab="gallery"]').click();
                    } else {
                        alert('Ungültiges Datenformat. Bitte eine gültige JSON-Datei mit Trainingsdaten importieren. Erwartetes Format: Array von Objekten mit id, date, title.');
                    }
                } catch (error) {
                    alert('Fehler beim Parsen der JSON-Datei: ' + error.message);
                    console.error("Import error:", error);
                } finally {
                    importDataInput.value = ''; // Clear the file input for security and re-import
                }
            };
            reader.readAsText(file);
        }
    });

    // --- Initial Load Operations ---
    loadTrainingSessions();
    // Determine which tab to open initially
    if (trainingSessions.length > 0) {
        // If data exists, show gallery tab
        document.querySelector('.tab-button[data-tab="gallery"]').click();
    } else {
        // Otherwise, default to entry tab
        document.querySelector('.tab-button[data-tab="entry"]').click();
    }
    // The .click() above handles the initial rendering and diagram updates
});