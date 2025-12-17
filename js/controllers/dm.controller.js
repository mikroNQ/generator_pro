/**
 * BarGen DataMatrix Controller
 *
 * @description Handles DataMatrix generation, timer, and carousel navigation
 * @module Controllers.DM
 *
 * @example
 * // Generate and display code
 * BarGen.Controllers.DM.generateAndDisplay();
 *
 * // Start rotation
 * BarGen.Controllers.DM.startRotation();
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};
    global.BarGen.Controllers = global.BarGen.Controllers || {};

    var Config = global.BarGen.Config;
    var Utils = global.BarGen.Utils;
    var State = global.BarGen.State;
    var UI = global.BarGen.UI;
    var Generators = global.BarGen.Generators;

    /**
     * Generate DataMatrix code and display it
     *
     * @description Main generation function. Uses rotation list if active,
     * otherwise generates demo codes.
     */
    function generateAndDisplay() {
        var dm = State.dm;
        var result, barcode;

        if (dm.isRotating && dm.rotationList.length > 0) {
            // Rotation mode: use items from folder
            var item = dm.rotationList[dm.rotationIndex];
            barcode = item.barcode;
            result = Generators.generateDM(barcode, item.template);

            // Cache generated code
            var currentRotationIdx = dm.rotationIndex;
            dm.generatedCodes.push({
                code: result.code,
                barcode: barcode,
                templateName: result.templateName,
                rotationIdx: currentRotationIdx
            });
            dm.codeHistoryIndex = dm.generatedCodes.length - 1;
            dm.rotationIndex = (dm.rotationIndex + 1) % dm.rotationList.length;

            showCodeInfo(barcode, result.templateName, currentRotationIdx + 1, dm.rotationList.length);
            updateBadge(true, dm.rotationList.length);
        } else {
            // Demo mode
            result = Generators.generateDM();

            // Cache demo codes too
            dm.generatedCodes.push({
                code: result.code,
                barcode: result.barcode,
                templateName: result.templateName,
                rotationIdx: dm.generatedCodes.length
            });
            dm.codeHistoryIndex = dm.generatedCodes.length - 1;

            showCodeInfo(result.barcode, result.templateName, dm.codeHistoryIndex + 1, Config.DEMO_GTINS.length);
            updateBadge(true, Config.DEMO_GTINS.length);
        }

        // Render DataMatrix
        Generators.renderDM(Utils.$('datamatrix-container'), result.code);

        // Update code text with flash animation
        var codeEl = Utils.$('current-code');
        if (codeEl) {
            codeEl.textContent = result.code;
            codeEl.classList.add('flash');
            setTimeout(function() {
                codeEl.classList.remove('flash');
            }, 300);
        }
    }

    /**
     * Display code from cache by index
     *
     * @param {number} index - Cache index
     */
    function displayFromCache(index) {
        var dm = State.dm;

        if (index < 0 || index >= dm.generatedCodes.length) return;

        var cached = dm.generatedCodes[index];
        dm.codeHistoryIndex = index;

        Generators.renderDM(Utils.$('datamatrix-container'), cached.code);

        var codeEl = Utils.$('current-code');
        if (codeEl) {
            codeEl.textContent = cached.code;
            codeEl.classList.add('flash');
            setTimeout(function() {
                codeEl.classList.remove('flash');
            }, 300);
        }

        // Update info display
        var isRotationMode = dm.rotationList.length > 0;
        var displayIdx = cached.rotationIdx !== undefined ? cached.rotationIdx + 1 : index + 1;
        var total = isRotationMode ? dm.rotationList.length : Config.DEMO_GTINS.length;

        showCodeInfo(cached.barcode, cached.templateName, displayIdx, total);
        updateBadge(true, total);
    }

    /**
     * Start automatic timer for code rotation
     */
    function startTimer() {
        var dm = State.dm;

        stopTimer();

        // If viewing history, jump to end first
        if (dm.generatedCodes.length > 0 && dm.codeHistoryIndex < dm.generatedCodes.length - 1) {
            dm.codeHistoryIndex = dm.generatedCodes.length - 1;
            displayFromCache(dm.codeHistoryIndex);
        }

        dm.remaining = dm.timerValue;
        updateCountdown();
        togglePlayState(true);

        dm.timerInterval = setInterval(function() {
            dm.remaining -= 0.1;

            if (dm.remaining <= 0.05) {
                generateAndDisplay();
                dm.remaining = dm.timerValue;
            }

            updateCountdown();
        }, 100);
    }

    /**
     * Stop automatic timer
     */
    function stopTimer() {
        var dm = State.dm;

        if (dm.timerInterval) {
            clearInterval(dm.timerInterval);
            dm.timerInterval = null;
        }

        togglePlayState(false);
    }

    /**
     * Set timer interval
     *
     * @param {number} value - Interval in seconds
     */
    function setInterval(value) {
        if (isNaN(value) || value <= 0) return;

        State.dm.timerValue = value;
        State.dm.remaining = value;
        startTimer();
    }

    /**
     * Start rotation from selected folder
     */
    function startRotation() {
        var folder = State.getDmFolder();

        if (!folder) {
            alert('Выберите папку!');
            return;
        }

        var active = folder.items.filter(function(x) { return x.active; });

        if (active.length === 0) {
            alert('Выберите GTIN в папке!');
            return;
        }

        var dm = State.dm;
        dm.rotationList = active;
        dm.rotationIndex = 0;
        dm.isRotating = true;
        dm.generatedCodes = [];
        dm.codeHistoryIndex = -1;

        // Switch to DataMatrix tab
        global.BarGen.Controllers.Tab.switchTo('datamatrix');

        // Update UI
        Utils.$('start-btn').style.display = 'none';
        Utils.$('stop-btn').style.display = 'inline-flex';

        UI.updateRotationStatus();
        generateAndDisplay();
        startTimer();
    }

    /**
     * Stop rotation and reset state
     */
    function stopRotation() {
        var dm = State.dm;

        dm.isRotating = false;
        stopTimer();

        // Reset rotation state
        dm.rotationList = [];
        dm.rotationIndex = 0;
        dm.generatedCodes = [];
        dm.codeHistoryIndex = -1;

        // Update UI
        Utils.$('start-btn').style.display = 'inline-flex';
        Utils.$('stop-btn').style.display = 'none';

        UI.updateRotationStatus();
        hideCodeInfo();
        updateBadge(false);

        // Generate fresh demo code
        generateAndDisplay();
    }

    /**
     * Manual navigation: next code
     */
    function manualNext() {
        var dm = State.dm;

        // If viewing history, show next from cache
        if (dm.generatedCodes.length > 0 && dm.codeHistoryIndex < dm.generatedCodes.length - 1) {
            displayFromCache(dm.codeHistoryIndex + 1);
        } else if (dm.rotationList.length > 0) {
            // Rotation mode: check if all GTINs generated
            if (dm.generatedCodes.length >= dm.rotationList.length) {
                return; // All done
            }

            // Generate new code
            var item = dm.rotationList[dm.rotationIndex];
            var result = Generators.generateDM(item.barcode, item.template);
            var currentRotationIdx = dm.rotationIndex;

            dm.generatedCodes.push({
                code: result.code,
                barcode: item.barcode,
                templateName: result.templateName,
                rotationIdx: currentRotationIdx
            });
            dm.codeHistoryIndex = dm.generatedCodes.length - 1;
            dm.rotationIndex = (dm.rotationIndex + 1) % dm.rotationList.length;

            Generators.renderDM(Utils.$('datamatrix-container'), result.code);

            var codeEl = Utils.$('current-code');
            if (codeEl) {
                codeEl.textContent = result.code;
                codeEl.classList.add('flash');
                setTimeout(function() {
                    codeEl.classList.remove('flash');
                }, 300);
            }

            showCodeInfo(item.barcode, result.templateName, currentRotationIdx + 1, dm.rotationList.length);
            updateBadge(true, dm.rotationList.length);
        }
        // Demo mode: no infinite generation on manual nav
    }

    /**
     * Manual navigation: previous code
     */
    function manualPrev() {
        var dm = State.dm;

        // Navigate back in cache if possible
        if (dm.generatedCodes.length > 0 && dm.codeHistoryIndex > 0) {
            displayFromCache(dm.codeHistoryIndex - 1);
        }
    }

    /**
     * Update countdown display
     */
    function updateCountdown() {
        var el = Utils.$('countdown');
        if (el) {
            el.textContent = 'через ' + Math.max(0, State.dm.remaining).toFixed(1) + ' сек';
        }
    }

    /**
     * Toggle play/pause button states
     *
     * @param {boolean} isPlaying - True if timer is running
     */
    function togglePlayState(isPlaying) {
        var playBtn = Utils.$('dm-play-btn');
        var pauseBtn = Utils.$('dm-pause-btn');
        var navArrows = Utils.$('dm-nav-arrows');

        if (isPlaying) {
            if (playBtn) playBtn.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'inline-flex';
            if (navArrows) navArrows.style.display = 'none';
        } else {
            if (playBtn) playBtn.style.display = 'inline-flex';
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (navArrows) navArrows.style.display = 'flex';
        }
    }

    /**
     * Show code information panel
     *
     * @param {string} barcode - GTIN barcode
     * @param {string} templateName - Template name
     * @param {number} index - Current index
     * @param {number} total - Total count
     */
    function showCodeInfo(barcode, templateName, index, total) {
        Utils.$('code-info').style.display = 'block';
        Utils.$('info-barcode').textContent = barcode;
        Utils.$('info-template').textContent = templateName;
        Utils.$('info-counter').textContent = (index === 0 ? total : index) + '/' + total;
    }

    /**
     * Hide code information panel
     */
    function hideCodeInfo() {
        Utils.$('code-info').style.display = 'none';
    }

    /**
     * Update mode badge
     *
     * @param {boolean} isRotating - True if rotating
     * @param {number} [count] - GTIN count
     */
    function updateBadge(isRotating, count) {
        var badge = Utils.$('mode-badge');

        if (isRotating) {
            badge.textContent = '🔄 ' + count + ' GTIN';
            badge.className = 'mode-badge list';
            badge.style.display = 'inline-block';
        } else {
            badge.className = 'mode-badge default';
            badge.style.display = 'none';
        }
    }

    // Export to namespace
    global.BarGen.Controllers.DM = {
        generateAndDisplay: generateAndDisplay,
        displayFromCache: displayFromCache,
        startTimer: startTimer,
        stopTimer: stopTimer,
        setInterval: setInterval,
        startRotation: startRotation,
        stopRotation: stopRotation,
        manualNext: manualNext,
        manualPrev: manualPrev,
        updateCountdown: updateCountdown,
        togglePlayState: togglePlayState,
        showCodeInfo: showCodeInfo,
        hideCodeInfo: hideCodeInfo,
        updateBadge: updateBadge
    };

})(window);
