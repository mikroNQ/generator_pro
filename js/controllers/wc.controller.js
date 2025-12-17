/**
 * BarGen Weight Carousel Controller
 *
 * @description Handles weight barcode generation and carousel rotation
 * @module Controllers.WC
 *
 * @example
 * // Add items to carousel
 * BarGen.Controllers.WC.addItems();
 *
 * // Start rotation
 * BarGen.Controllers.WC.startRotation();
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};
    global.BarGen.Controllers = global.BarGen.Controllers || {};

    var Utils = global.BarGen.Utils;
    var State = global.BarGen.State;
    var Storage = global.BarGen.Storage;
    var UI = global.BarGen.UI;
    var Generators = global.BarGen.Generators;

    /**
     * Add items to weight carousel
     *
     * @description Generates weight barcodes based on form inputs and adds to folder
     */
    function addItems() {
        var folderName = Utils.$('wcFolderName').value.trim();
        var pluRaw = Utils.$('wcProductCode').value.trim();
        var variations = parseInt(Utils.$('wcVariations').value) || 10;

        // Get weight mode
        var modeEl = document.querySelector('input[name="weightMode"]:checked');
        var mode = modeEl ? modeEl.value : 'random';

        // Get selected prefixes
        var use77 = Utils.$('wcPrefix77').checked;
        var use22 = Utils.$('wcPrefix22').checked;
        var use49 = Utils.$('wcPrefix49').checked;

        if (!use77 && !use22 && !use49) {
            alert('Выберите хотя бы один префикс!');
            return;
        }

        var prefixes = [];
        if (use77) prefixes.push('77');
        if (use22) prefixes.push('22');
        if (use49) prefixes.push('49');

        // Parse PLU codes
        var pluList = pluRaw.split('\n')
            .map(function(l) { return l.trim().replace(/\D/g, ''); })
            .filter(function(c) { return c.length > 0; });

        if (pluList.length === 0) {
            alert('Введите хотя бы один PLU код!');
            return;
        }

        // Get discount settings
        var discModeEl = document.querySelector('input[name="discountMode"]:checked');
        var discMode = discModeEl ? discModeEl.value : 'fixed';
        var fixedDisc = parseInt(Utils.$('wcDiscount').value) || 0;
        var discMin = parseInt(Utils.$('wcDiscMin').value) || 0;
        var discMax = parseInt(Utils.$('wcDiscMax').value) || 0;

        if (discMin > discMax) {
            var tmp = discMin;
            discMin = discMax;
            discMax = tmp;
        }

        // Get weight settings
        var weightMin = 150, weightMax = 8000, fixedWeight = 500;

        if (mode === 'fixed') {
            fixedWeight = parseInt(Utils.$('wcFixedWeight').value) || 500;
        } else {
            weightMin = parseInt(Utils.$('wcWeightMin').value) || 150;
            weightMax = parseInt(Utils.$('wcWeightMax').value) || 8000;

            if (weightMin >= weightMax) {
                alert('Мин. вес должен быть меньше макс.!');
                return;
            }
        }

        // Generate items
        var items = [];
        var baseId = Date.now();

        pluList.forEach(function(plu, pluIdx) {
            for (var i = 0; i < variations; i++) {
                var weight = mode === 'fixed' ? fixedWeight : Utils.randomWeight(weightMin, weightMax);
                var discount = discMode === 'fixed' ? fixedDisc : Utils.randomWeight(discMin, discMax);

                prefixes.forEach(function(prefix) {
                    var bc = Generators.generateWeightBarcode(prefix, plu, weight, discount);

                    items.push({
                        id: baseId + '_' + pluIdx + '_' + i + '_' + prefix,
                        code: bc.code,
                        format: bc.format,
                        plu: bc.plu,
                        weight: weight,
                        prefix: prefix,
                        active: true,
                        discount: prefix === '49' ? discount : undefined
                    });
                });
            }
        });

        // Find or create folder
        var folder;

        if (folderName) {
            folder = State.wc.folders.find(function(f) {
                return f.name.toLowerCase() === folderName.toLowerCase();
            });

            if (!folder) {
                folder = {
                    id: baseId + '_f',
                    name: folderName,
                    items: []
                };
                State.wc.folders.push(folder);
            }
        } else if (State.wc.selectedFolderId) {
            folder = State.getWcFolder();
        } else {
            // Create default folder name
            var defaultName = (mode === 'fixed' ? 'FIX ' + fixedWeight : 'RND') + ' PLU ' + pluList[0];
            folder = {
                id: baseId + '_f',
                name: defaultName,
                items: []
            };
            State.wc.folders.push(folder);
        }

        // Add items to folder
        folder.items = folder.items.concat(items);
        State.wc.selectedFolderId = folder.id;

        Storage.save();
        UI.renderWcFolders();
        UI.renderWcItems();

        // Clear form
        Utils.$('wcFolderName').value = '';
        Utils.$('wcProductCode').value = '';

        alert('Добавлено ' + items.length + ' штрихкодов');
    }

    /**
     * Start barcode rotation
     */
    function startRotation() {
        var folder = State.getWcFolder();

        if (!folder) {
            alert('Выберите папку!');
            return;
        }

        var active = folder.items.filter(function(x) { return x.active; });

        if (active.length === 0) {
            alert('Выберите штрихкоды для ротации!');
            return;
        }

        State.wc.rotationItems = active;
        State.wc.rotationIndex = 0;
        State.wc.isRotating = true;

        // Update UI
        Utils.$('wc-start-btn').style.display = 'none';
        Utils.$('wc-stop-btn').style.display = 'inline-flex';
        Utils.$('wcCarouselDisplay').style.display = 'block';

        UI.updateWcStatus();
        displayBarcode();
        startTimer();

        // Scroll to carousel
        setTimeout(function() {
            Utils.scrollToElement(Utils.$('wcCarouselDisplay'), 100);
        }, 100);
    }

    /**
     * Stop rotation
     */
    function stopRotation() {
        State.wc.isRotating = false;
        stopTimer();

        Utils.$('wc-start-btn').style.display = 'inline-flex';
        Utils.$('wc-stop-btn').style.display = 'none';

        // Stop animation, keep barcode static
        var wrapper = document.querySelector('.barcode-svg-wrapper');
        if (wrapper) {
            wrapper.classList.remove('barcode-pulse', 'barcode-slide');
            wrapper.classList.add('barcode-static');
        }

        UI.updateWcStatus();
    }

    /**
     * Display barcode with fly-through animation (auto-rotation)
     */
    function displayBarcode() {
        var items = State.wc.rotationItems;
        if (items.length === 0) return;

        var item = items[State.wc.rotationIndex % items.length];

        // Update info display
        var weight = Utils.formatWeight(item.weight);
        var discountText = item.prefix === '49' && item.discount !== undefined ?
            ' | Скидка: ' + item.discount + '%' : '';

        Utils.$('wcBarcodeInfo').innerHTML =
            '<b>PLU:</b> ' + item.plu + ' | <b>Вес:</b> ' + weight + discountText;
        Utils.$('wcBarcodeText').textContent = item.code;
        Utils.$('wcCarouselCounter').textContent =
            ((State.wc.rotationIndex % items.length) + 1) + '/' + items.length;

        // Render barcode
        var svg = Utils.$('wcBarcodeSvg');
        var wrapper = document.querySelector('.barcode-svg-wrapper');

        Generators.renderBarcode(svg, item.code, item.format);

        // Fly-through animation
        if (wrapper) {
            wrapper.classList.remove('barcode-pulse', 'barcode-static', 'barcode-slide');
            void wrapper.offsetWidth; // Force reflow
            wrapper.classList.add('barcode-pulse');
        }

        State.wc.rotationIndex++;

        // Add to history
        State.addToHistory({ type: 'WC', code: item.code });
    }

    /**
     * Display barcode with slide animation (manual navigation)
     */
    function displayBarcodeManual() {
        var items = State.wc.rotationItems;
        if (items.length === 0) return;

        var item = items[State.wc.rotationIndex % items.length];

        var weight = Utils.formatWeight(item.weight);
        var discountText = item.prefix === '49' && item.discount !== undefined ?
            ' | Скидка: ' + item.discount + '%' : '';

        Utils.$('wcBarcodeInfo').innerHTML =
            '<b>PLU:</b> ' + item.plu + ' | <b>Вес:</b> ' + weight + discountText;
        Utils.$('wcBarcodeText').textContent = item.code;
        Utils.$('wcCarouselCounter').textContent =
            ((State.wc.rotationIndex % items.length) + 1) + '/' + items.length;

        var svg = Utils.$('wcBarcodeSvg');
        var wrapper = document.querySelector('.barcode-svg-wrapper');

        Generators.renderBarcode(svg, item.code, item.format);

        // Simple slide animation for manual nav
        if (wrapper) {
            wrapper.classList.remove('barcode-pulse', 'barcode-static', 'barcode-slide');
            void wrapper.offsetWidth;
            wrapper.classList.add('barcode-slide');
        }

        State.wc.rotationIndex++;
    }

    /**
     * Manual navigation: next
     */
    function manualNext() {
        if (State.wc.rotationItems.length > 0) {
            displayBarcodeManual();
        }
    }

    /**
     * Manual navigation: previous
     */
    function manualPrev() {
        if (State.wc.rotationItems.length > 0) {
            var len = State.wc.rotationItems.length;
            State.wc.rotationIndex = (State.wc.rotationIndex - 2 + len) % len;
            if (State.wc.rotationIndex < 0) {
                State.wc.rotationIndex = len - 1;
            }
            displayBarcodeManual();
        }
    }

    /**
     * Start automatic timer
     */
    function startTimer() {
        stopTimer();

        State.wc.remaining = State.wc.timerValue;

        State.wc.timerInterval = setInterval(function() {
            State.wc.remaining -= 0.1;

            if (State.wc.remaining <= 0.05) {
                displayBarcode();
                State.wc.remaining = State.wc.timerValue;
            }
        }, 100);
    }

    /**
     * Stop automatic timer
     */
    function stopTimer() {
        if (State.wc.timerInterval) {
            clearInterval(State.wc.timerInterval);
            State.wc.timerInterval = null;
        }
    }

    /**
     * Set timer interval
     *
     * @param {number} value - Interval in seconds
     */
    function setInterval(value) {
        if (isNaN(value) || value <= 0) return;

        State.wc.timerValue = value;

        if (State.wc.isRotating) {
            startTimer();
        }
    }

    /**
     * Select all items in current folder
     */
    function selectAll() {
        var folder = State.getWcFolder();
        if (folder) {
            folder.items.forEach(function(item) { item.active = true; });
            Storage.save();
            UI.renderWcItems();
        }
    }

    /**
     * Deselect all items in current folder
     */
    function deselectAll() {
        var folder = State.getWcFolder();
        if (folder) {
            folder.items.forEach(function(item) { item.active = false; });
            Storage.save();
            UI.renderWcItems();
        }
    }

    /**
     * Delete selected items from current folder
     */
    function clearSelected() {
        var folder = State.getWcFolder();
        if (folder && confirm('Удалить выбранные штрихкоды?')) {
            folder.items = folder.items.filter(function(x) { return !x.active; });
            Storage.save();
            UI.renderWcItems();
        }
    }

    /**
     * Delete current folder
     */
    function deleteFolder() {
        var folder = State.getWcFolder();
        if (folder && confirm('Удалить папку "' + folder.name + '"?')) {
            State.wc.folders = State.wc.folders.filter(function(x) {
                return x.id !== folder.id;
            });
            State.wc.selectedFolderId = null;
            Storage.save();
            UI.renderWcFolders();
            UI.renderWcItems();
            stopRotation();
        }
    }

    /**
     * Rename current folder
     */
    function renameFolder() {
        var folder = State.getWcFolder();
        if (folder) {
            var newName = prompt('Новое имя папки:', folder.name);
            if (newName && newName.trim()) {
                folder.name = newName.trim();
                Storage.save();
                UI.renderWcFolders();
            }
        }
    }

    // Export to namespace
    global.BarGen.Controllers.WC = {
        addItems: addItems,
        startRotation: startRotation,
        stopRotation: stopRotation,
        displayBarcode: displayBarcode,
        displayBarcodeManual: displayBarcodeManual,
        manualNext: manualNext,
        manualPrev: manualPrev,
        startTimer: startTimer,
        stopTimer: stopTimer,
        setInterval: setInterval,
        selectAll: selectAll,
        deselectAll: deselectAll,
        clearSelected: clearSelected,
        deleteFolder: deleteFolder,
        renameFolder: renameFolder
    };

})(window);
