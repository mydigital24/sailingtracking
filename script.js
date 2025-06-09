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

    // Modal Detail elements (truncated for brevity, ensure all are present)
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

    // --- NEW: Event Elements ---
    const eventEntryForm = document.getElementById('event-entry-form');
    const eventTitleInput = document.getElementById('event-title');
    const eventDateInput = document.getElementById('event-date');
    const eventTimeInput = document.getElementById('event-time');
    const eventLocationInput = document.getElementById('event-location');
    const eventsListDiv = document.getElementById('events-list');
    const noEventsMessage = document.getElementById('no-events-message');
    const nextEventCountdownBar = document.getElementById('next-event-countdown');
    const nextEventTitleSpan = document.getElementById('next-event-title');
    const countdownTimerSpan = document.getElementById('countdown-timer');

    // --- NEW: Analysis Elements ---
    const activityStatusDiv = document.getElementById('activity-status');
    const copy30DayDataBtn = document.getElementById('copy-30-day-data-btn');


    let trainingSessions = []; // Array to store all training data
    let upcomingEvents = []; // Array to store event data
    let currentTrainingIdForModal = null; // To keep track of which training is open in modal
    let countdownInterval; // To store the interval for the next event countdown


    // Define the labels for the polar diagram based on your HTML structure and desired order
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
        renderTrainingGallery(); // Redraw gallery mini-diagrams
        if (diagramModal.style.display === 'flex' && currentTrainingIdForModal) {
            const currentSession = trainingSessions.find(s => s.id === currentTrainingIdForModal);
            if (currentSession) {
                 const valuesArray = polarDiagramLabels.map(label => {
                     const fieldId = getPolarIdFromLabel(label);
                     return currentSession.polarValues[fieldId] || 0;
                 });
                 drawPolarDiagram(enlargedDiagramCanvas, valuesArray, polarDiagramLabels);
            }
        }
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
            } else if (targetTab === 'events') {
                renderEventsList(); // Render events when the tab is opened
            } else if (targetTab === 'analysis') {
                updateActivityStatus(); // Update analysis when the tab is opened
            }
            updateNextEventCountdown(); // Update countdown every time a tab is switched
        });
    });

    // --- Local Storage Management for Trainings ---
    function saveTrainingSessions() {
        localStorage.setItem('sailingTrainingData', JSON.stringify(trainingSessions));
    }

    function loadTrainingSessions() {
        const data = localStorage.getItem('sailingTrainingData');
        if (data) {
            trainingSessions = JSON.parse(data);
        }
    }

    // --- Local Storage Management for Events ---
    function saveUpcomingEvents() {
        localStorage.setItem('sailingUpcomingEvents', JSON.stringify(upcomingEvents));
    }

    function loadUpcomingEvents() {
        const data = localStorage.getItem('sailingUpcomingEvents');
        if (data) {
            upcomingEvents = JSON.parse(data);
            // Convert date strings back to Date objects if needed for comparison/sorting
            upcomingEvents.forEach(event => {
                if (typeof event.date === 'string') {
                    event.date = new Date(event.date);
                }
            });
        }
    }

    // --- Polar Diagram Drawing Function (remains the same) ---
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

    // --- Interactive Polar Diagram on Entry Form (remains the same) ---
    function updateInteractivePolarDiagram() {
        const currentPolarValues = [];
        polarDiagramLabels.forEach(label => {
            const id = getPolarIdFromLabel(label);
            const inputElement = document.getElementById(id);
            if (inputElement) {
                currentPolarValues.push(parseInt(inputElement.value, 10));
                const valueSpan = document.querySelector(`.range-value[data-target="${id}"]`);
                if (valueSpan) {
                    valueSpan.textContent = inputElement.value;
                }
            } else {
                console.warn(`Input element with ID '${id}' not found for label '${label}'. Check HTML IDs.`);
                currentPolarValues.push(0);
            }
        });
        drawPolarDiagram(interactivePolarDiagramCanvas, currentPolarValues, polarDiagramLabels);
    }

    polarRangeInputs.forEach(input => {
        input.addEventListener('input', updateInteractivePolarDiagram);
    });

    // --- Entry Form Submission (Create & Update) (remains mostly the same) ---
    trainingEntryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = trainingIdInput.value ? parseInt(trainingIdInput.value, 10) : Date.now();
        const trainingDate = document.getElementById('training-date').value;
        const trainingTitle = document.getElementById('training-title').value;

        const trainingData = {
            id: id,
            date: trainingDate,
            title: trainingTitle,
            location: document.getElementById('location').value,
            sailHours: parseFloat(document.getElementById('sail-hours').value) || 0,
            windDirection: document.getElementById('wind-direction').value,
            windStrength: parseInt(document.getElementById('wind-strength').value, 10) || 0,
            seaState: document.getElementById('sea-state').value,
            conditions: document.getElementById('conditions').value,
            sailSetup: document.getElementById('sail-setup').value,
            mastRake: document.getElementById('mast-rake').value,
            luffTension: document.getElementById('luff-tension').value,
            footTension: document.getElementById('foot-tension').value,
            speed: parseFloat(document.getElementById('speed').value) || 0,
            performance: parseInt(document.getElementById('performance').value, 10) || 0,
            exercises: document.getElementById('exercises').value,
            goals: document.getElementById('goals').value,
            whatLearned: document.getElementById('what-learned').value,
            nextSteps: document.getElementById('next-steps').value,
            notes: document.getElementById('notes').value,
            polarValues: {}
        };

        polarDiagramLabels.forEach(label => {
            const fieldId = getPolarIdFromLabel(label);
            const inputElement = document.getElementById(fieldId);
            trainingData.polarValues[fieldId] = inputElement ? parseInt(inputElement.value, 10) : 0;
        });

        if (trainingIdInput.value) {
            const index = trainingSessions.findIndex(t => t.id === id);
            if (index !== -1) {
                trainingSessions[index] = trainingData;
                alert('Training erfolgreich aktualisiert!');
            }
        } else {
            trainingSessions.push(trainingData);
            alert('Training erfolgreich gespeichert!');
        }

        saveTrainingSessions();
        resetEntryForm();
        document.querySelector('.tab-button[data-tab="gallery"]').click();
    });

    // --- Reset Entry Form (remains mostly the same) ---
    function resetEntryForm() {
        trainingEntryForm.reset();
        trainingIdInput.value = '';
        saveTrainingBtn.innerHTML = '<i class="fas fa-save"></i> Training speichern';
        cancelEditBtn.classList.add('hidden');

        polarRangeInputs.forEach(input => {
            input.value = 0;
            const valueSpan = document.querySelector(`.range-value[data-target="${input.id}"]`);
            if (valueSpan) {
                valueSpan.textContent = '0';
            }
        });
        updateInteractivePolarDiagram();
    }

    cancelEditBtn.addEventListener('click', resetEntryForm);

    // --- Gallery Rendering (remains the same) ---
    function renderTrainingGallery(sessionsToDisplay = trainingSessions, targetDiv = trainingListDiv) {
        targetDiv.innerHTML = '';

        if (sessionsToDisplay.length === 0) {
            let message = 'Noch keine Trainings eingetragen. Starte mit dem "Eintragen" Tab!';
            if (targetDiv === searchResultsDiv) {
                message = 'Keine Trainings gefunden, die zu Ihrer Suche passen.';
            }
            targetDiv.innerHTML = `<p class="empty-message">${message}</p>`;
            return;
        }

        sessionsToDisplay.sort((a, b) => new Date(b.date) - new Date(a.date));

        sessionsToDisplay.forEach(session => {
            const card = document.createElement('div');
            card.classList.add('training-card');
            card.dataset.id = session.id;

            card.innerHTML = `
                <h3>${session.title}</h3>
                <p>Datum: ${session.date}</p>
                <canvas class="mini-diagram" width="200" height="200"></canvas>
            `;

            const canvas = card.querySelector('.mini-diagram');
            const valuesArray = polarDiagramLabels.map(label => {
                const fieldId = getPolarIdFromLabel(label);
                return session.polarValues[fieldId] || 0;
            });
            drawPolarDiagram(canvas, valuesArray, polarDiagramLabels);


            card.addEventListener('click', () => {
                showEnlargedDiagram(session);
            });

            targetDiv.appendChild(card);
        });
    }

    // --- Show Enlarged Diagram / Detailed View Modal (remains the same) ---
    function showEnlargedDiagram(session) {
        currentTrainingIdForModal = session.id;

        modalTitleDate.textContent = `${session.title} (${session.date})`;

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

        const valuesArray = polarDiagramLabels.map(label => {
            const fieldId = getPolarIdFromLabel(label);
            return session.polarValues[fieldId] || 0;
        });
        drawPolarDiagram(enlargedDiagramCanvas, valuesArray, polarDiagramLabels);

        diagramModal.style.display = 'flex';
    }

    // Close modal event listeners
    closeModalButton.addEventListener('click', () => {
        diagramModal.style.display = 'none';
        currentTrainingIdForModal = null;
    });

    window.addEventListener('click', (event) => {
        if (event.target === diagramModal) {
            diagramModal.style.display = 'none';
            currentTrainingIdForModal = null;
        }
    });

    // --- Edit Training from Modal (remains the same) ---
    editTrainingBtn.addEventListener('click', () => {
        if (currentTrainingIdForModal) {
            const sessionToEdit = trainingSessions.find(s => s.id === currentTrainingIdForModal);
            if (sessionToEdit) {
                document.getElementById('training-id').value = sessionToEdit.id;
                document.getElementById('training-date').value = sessionToEdit.date || '';
                document.getElementById('training-title').value = sessionToEdit.title || '';
                document.getElementById('location').value = sessionToEdit.location || '';
                document.getElementById('sail-hours').value = sessionToEdit.sailHours || 0;
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

                polarDiagramLabels.forEach(label => {
                    const fieldId = getPolarIdFromLabel(label);
                    const inputElement = document.getElementById(fieldId);
                    if (inputElement) {
                        inputElement.value = sessionToEdit.polarValues[fieldId] !== undefined ? sessionToEdit.polarValues[fieldId] : 0;
                        const valueSpan = document.querySelector(`.range-value[data-target="${fieldId}"]`);
                        if (valueSpan) valueSpan.textContent = inputElement.value;
                    }
                });
                updateInteractivePolarDiagram();

                saveTrainingBtn.innerHTML = '<i class="fas fa-save"></i> Training aktualisieren';
                cancelEditBtn.classList.remove('hidden');

                diagramModal.style.display = 'none';
                document.querySelector('.tab-button[data-tab="entry"]').click();
            } else {
                console.error('Session to edit not found:', currentTrainingIdForModal);
                alert('Fehler: Das zu bearbeitende Training wurde nicht gefunden.');
            }
        }
    });

    // --- Delete Training from Modal (remains the same) ---
    deleteTrainingBtn.addEventListener('click', () => {
        if (currentTrainingIdForModal && confirm('Sind Sie sicher, dass Sie dieses Training löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            trainingSessions = trainingSessions.filter(s => s.id !== currentTrainingIdForModal);
            saveTrainingSessions();
            renderTrainingGallery();
            diagramModal.style.display = 'none';
            currentTrainingIdForModal = null;
            alert('Training erfolgreich gelöscht.');
            updateActivityStatus(); // Update analysis after deletion
        }
    });


    // --- Search Functionality (remains the same) ---
    performSearchBtn.addEventListener('click', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm === '') {
            searchResultsDiv.innerHTML = '<p class="empty-message">Bitte geben Sie einen Suchbegriff ein, um Trainings zu finden.</p>';
            return;
        }

        const filteredSessions = trainingSessions.filter(session => {
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
                session.date
            ];
            if (session.sailHours) searchableFields.push(String(session.sailHours));
            if (session.windStrength) searchableFields.push(String(session.windStrength));
            if (session.speed) searchableFields.push(String(session.speed));
            if (session.performance) searchableFields.push(String(session.performance));

            for (const key in session.polarValues) {
                if (session.polarValues.hasOwnProperty(key)) {
                    searchableFields.push(String(session.polarValues[key]));
                    const originalLabel = polarDiagramLabels.find(l => getPolarIdFromLabel(l) === key);
                    if (originalLabel) searchableFields.push(originalLabel);
                }
            }

            return searchableFields.some(field =>
                field && String(field).toLowerCase().includes(searchTerm)
            );
        });
        renderTrainingGallery(filteredSessions, searchResultsDiv);
    });

    // --- Export/Import Functionality (remains the same) ---
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
                    if (Array.isArray(importedData) && importedData.every(item => typeof item === 'object' && item !== null && 'id' in item && 'date' in item && 'title' in item)) {
                        trainingSessions = importedData;
                        saveTrainingSessions();
                        alert('Daten erfolgreich importiert!');
                        document.querySelector('.tab-button[data-tab="gallery"]').click();
                        updateActivityStatus(); // Update analysis after import
                    } else {
                        alert('Ungültiges Datenformat. Bitte eine gültige JSON-Datei mit Trainingsdaten importieren. Erwartetes Format: Array von Objekten mit id, date, title.');
                    }
                } catch (error) {
                    alert('Fehler beim Parsen der JSON-Datei: ' + error.message);
                    console.error("Import error:", error);
                } finally {
                    importDataInput.value = '';
                }
            };
            reader.readAsText(file);
        }
    });

    // --- NEW: Event Management Functions ---
    eventEntryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newEvent = {
            id: Date.now(),
            title: eventTitleInput.value,
            date: new Date(eventDateInput.value + (eventTimeInput.value ? `T${eventTimeInput.value}` : '')), // Combine date and time
            location: eventLocationInput.value || '',
            time: eventTimeInput.value || ''
        };

        upcomingEvents.push(newEvent);
        saveUpcomingEvents();
        renderEventsList();
        updateNextEventCountdown();
        eventEntryForm.reset();
        alert('Event erfolgreich hinzugefügt!');
    });

    function renderEventsList() {
        eventsListDiv.innerHTML = ''; // Clear previous events
        noEventsMessage.classList.add('hidden'); // Hide default message initially

        const now = new Date();
        const futureEvents = upcomingEvents.filter(event => event.date >= now);

        if (futureEvents.length === 0) {
            noEventsMessage.classList.remove('hidden'); // Show message if no events
            return;
        }

        // Sort events by date ascending
        futureEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

        futureEvents.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.classList.add('event-card');
            eventCard.dataset.id = event.id;

            const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit' };
            const eventDateStr = event.date.toLocaleDateString('de-DE', dateOptions);
            const eventTimeStr = event.hasTime ? event.date.toLocaleTimeString('de-DE', timeOptions) : (event.time || '');

            eventCard.innerHTML = `
                <h3>${event.title}</h3>
                <p><strong>Datum:</strong> ${eventDateStr}</p>
                ${eventTimeStr ? `<p><strong>Zeit:</strong> ${eventTimeStr} Uhr</p>` : ''}
                ${event.location ? `<p><strong>Ort:</strong> ${event.location}</p>` : ''}
                <div class="event-actions">
                    <button class="delete-event-btn"><i class="fas fa-trash-alt"></i> Löschen</button>
                </div>
            `;
            eventsListDiv.appendChild(eventCard);
        });

        // Attach delete listeners
        eventsListDiv.querySelectorAll('.delete-event-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = parseInt(e.target.closest('.event-card').dataset.id);
                if (confirm('Sicher, dass du dieses Event löschen möchtest?')) {
                    upcomingEvents = upcomingEvents.filter(event => event.id !== eventId);
                    saveUpcomingEvents();
                    renderEventsList(); // Re-render the list
                    updateNextEventCountdown(); // Update countdown as well
                    alert('Event gelöscht.');
                }
            });
        });
    }

    // --- NEW: Next Event Countdown ---
    function updateNextEventCountdown() {
        // Clear existing interval to prevent multiple timers
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }

        const now = new Date();
        const sortedEvents = upcomingEvents.filter(event => event.date >= now).sort((a, b) => a.date.getTime() - b.date.getTime());

        if (sortedEvents.length > 0) {
            const nextEvent = sortedEvents[0];
            nextEventCountdownBar.classList.remove('hidden');
            nextEventTitleSpan.textContent = nextEvent.title;

            // Update countdown every second
            countdownInterval = setInterval(() => {
                const timeDiff = nextEvent.date.getTime() - new Date().getTime();

                if (timeDiff <= 0) {
                    countdownTimerSpan.textContent = 'Ist jetzt!';
                    clearInterval(countdownInterval);
                    // Re-render events after the event has passed to remove it from upcoming
                    renderEventsList();
                    updateNextEventCountdown(); // Check for the *new* next event
                    return;
                }

                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

                let countdownText = '';
                if (days > 0) countdownText += `${days}d `;
                if (hours > 0 || days > 0) countdownText += `${hours}h `;
                if (minutes > 0 || hours > 0 || days > 0) countdownText += `${minutes}m `;
                countdownText += `${seconds}s`;

                countdownTimerSpan.textContent = `noch ${countdownText}`;
            }, 1000);

        } else {
            nextEventCountdownBar.classList.add('hidden');
            nextEventTitleSpan.textContent = '';
            countdownTimerSpan.textContent = '';
        }
    }

    // --- NEW: Analysis Functions ---
    function updateActivityStatus() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0); // Set to start of the day

        const trainingsLast7Days = trainingSessions.filter(session => {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0); // Normalize to start of the day
            return sessionDate >= sevenDaysAgo;
        });

        activityStatusDiv.innerHTML = ''; // Clear previous status
        activityStatusDiv.classList.remove('active-status', 'inactive-status');

        if (trainingsLast7Days.length <= 2) {
            activityStatusDiv.classList.add('inactive-status');
            activityStatusDiv.innerHTML = '<i class="fas fa-times-circle"></i> You can Sail more to Sail better!';
        } else {
            activityStatusDiv.classList.add('active-status');
            activityStatusDiv.innerHTML = '<i class="fas fa-check-circle"></i> You\'re active at the moment. Great!';
        }
    }

    // --- NEW: Copy 30-day data & Open Copilot ---
    copy30DayDataBtn.addEventListener('click', async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0); // Set to start of the day

        const trainingsLast30Days = trainingSessions.filter(session => {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0); // Normalize to start of the day
            return sessionDate >= thirtyDaysAgo;
        });

        if (trainingsLast30Days.length === 0) {
            alert('Keine Trainings in den letzten 30 Tagen gefunden, die kopiert werden könnten.');
            return;
        }

        const dataToCopy = JSON.stringify(trainingsLast30Days, null, 2);

        try {
            await navigator.clipboard.writeText(dataToCopy);
            alert('Trainingsdaten der letzten 30 Tage wurden in die Zwischenablage kopiert. Copilot wird geöffnet.');
            window.open('https://copilot.microsoft.com/', '_blank');
        } catch (err) {
            console.error('Fehler beim Kopieren der Daten:', err);
            alert('Fehler beim Kopieren der Daten. Bitte versuchen Sie es manuell oder stellen Sie sicher, dass die Berechtigung für die Zwischenablage erteilt wurde.');
        }
    });


    // --- Initial Load Operations ---
    loadTrainingSessions();
    loadUpcomingEvents();
    updateNextEventCountdown(); // Initialize countdown on load

    // Determine which tab to open initially
    if (trainingSessions.length > 0) {
        document.querySelector('.tab-button[data-tab="gallery"]').click();
    } else {
        document.querySelector('.tab-button[data-tab="entry"]').click();
    }
    // The .click() above handles the initial rendering and diagram updates, and now also analysis/events
});
