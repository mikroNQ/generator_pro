/**
 * BarGen UI Module
 *
 * @description Handles all DOM rendering and UI updates
 * @module UI
 *
 * @example
 * // Render DataMatrix folders list
 * BarGen.UI.renderDmFolders();
 *
 * // Update rotation status
 * BarGen.UI.updateRotationStatus();
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};

    var Config = global.BarGen.Config;
    var Utils = global.BarGen.Utils;
    var State = global.BarGen.State;
    var Generators = global.BarGen.Generators;

    /* ==========================================================================
       DataMatrix UI
       ========================================================================== */

    /**
     * Render DataMatrix folders list
     *
     * @description Updates folder list in Library tab and folder selector dropdown
     */
    function renderDmFolders() {
        var container = Utils.$('dmFolderList');
        if (!container) return;

        if (State.dm.folders.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет папок</div>';
        } else {
            var fragment = document.createDocumentFragment();

            State.dm.folders.forEach(function(folder) {
                var div = document.createElement('div');
                div.className = 'folder-item' + (folder.id === State.dm.selectedFolderId ? ' selected' : '');

                var activeCount = folder.items.filter(function(x) { return x.active; }).length;
                var countText = folder.items.length + ' шт' + (activeCount > 0 ? ' (' + activeCount + ' ✓)' : '');

                div.innerHTML = '<div>📁</div><div style="flex:1"><b>' + Utils.escapeHtml(folder.name) +
                    '</b><div style="font-size:.8em;color:#666">' + countText + '</div></div>';

                div.onclick = function() {
                    State.dm.selectedFolderId = folder.id;
                    renderDmFolders();
                    renderDmItems();
                };

                fragment.appendChild(div);
            });

            container.innerHTML = '';
            container.appendChild(fragment);
        }

        // Update current folder name badge
        var nameEl = Utils.$('dm-current-folder-name');
        var folder = State.getDmFolder();
        if (nameEl) {
            nameEl.innerHTML = folder ?
                '<span class="current-folder-badge">📁 ' + Utils.escapeHtml(folder.name) + '</span>' : '';
        }

        // Update folder selector dropdown
        var select = Utils.$('dmFolderSelect');
        if (select) {
            if (State.dm.folders.length === 0) {
                select.innerHTML = '<option disabled selected>Нет папок</option>';
            } else {
                select.innerHTML = State.dm.folders.map(function(f) {
                    return '<option value="' + Utils.escapeHtml(f.name) + '">' + Utils.escapeHtml(f.name) + '</option>';
                }).join('');
            }
        }
    }

    /**
     * Render DataMatrix items list
     *
     * @description Updates items list for selected folder
     */
    function renderDmItems() {
        var container = Utils.$('dmItemsList');
        var items = State.getDmFolderItems();
        var countEl = Utils.$('dm-items-count');

        if (countEl) countEl.textContent = items.length;
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state">Выберите папку или добавьте GTIN</div>';
        } else {
            var fragment = document.createDocumentFragment();

            items.forEach(function(item) {
                var div = document.createElement('div');
                div.className = 'saved-item' + (item.active ? ' active' : '');

                var template = Config.TEMPLATES[item.template] || Config.TEMPLATES.type1;

                div.innerHTML = '<div class="info"><div class="barcode">' + Utils.escapeHtml(item.barcode) +
                    '</div><div style="font-size:.8em;color:#666">' + template.name + '</div></div>' +
                    '<div style="display:flex;gap:8px">' +
                    '<button class="btn btn-sm ' + (item.active ? 'btn-success' : 'btn-outline') + '" data-action="toggle">' +
                    (item.active ? '✓' : '○') + '</button>' +
                    '<button class="btn btn-sm btn-danger" data-action="delete">✕</button></div>';

                div.querySelector('[data-action="toggle"]').onclick = function() {
                    item.active = !item.active;
                    global.BarGen.Storage.save();
                    renderDmItems();
                    renderDmFolders();
                };

                div.querySelector('[data-action="delete"]').onclick = function() {
                    var folder = State.getDmFolder();
                    if (folder) {
                        folder.items = folder.items.filter(function(x) { return x.id !== item.id; });
                        global.BarGen.Storage.save();
                        renderDmItems();
                        renderDmFolders();
                    }
                };

                fragment.appendChild(div);
            });

            container.innerHTML = '';
            container.appendChild(fragment);
        }

        updateRotationStatus();
    }

    /**
     * Update rotation status display
     */
    function updateRotationStatus() {
        var el = Utils.$('rotation-status');
        var folder = State.getDmFolder();
        var active = folder ? folder.items.filter(function(x) { return x.active; }) : [];
        var startBtn = Utils.$('start-btn');
        var stopBtn = Utils.$('stop-btn');

        if (State.dm.isRotating) {
            if (el) el.textContent = '🔄 Ротация: ' + State.dm.rotationList.length + ' GTIN';
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-flex';
        } else if (active.length > 0) {
            if (el) el.textContent = '✓ ' + active.length + ' выбрано — готово к запуску';
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = State.dm.generatedCodes.length > 0 ? 'inline-flex' : 'none';
        } else if (folder) {
            if (el) el.textContent = 'Выберите GTIN для ротации';
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'none';
        } else {
            if (el) el.textContent = 'Создайте папку';
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'none';
        }

        var ctrl = Utils.$('rotation-controls');
        if (ctrl) ctrl.className = 'rotation-controls' + (State.dm.isRotating ? ' active' : '');
    }

    /* ==========================================================================
       Weight Carousel UI
       ========================================================================== */

    /**
     * Render Weight Carousel folders list
     */
    function renderWcFolders() {
        var container = Utils.$('wcFolderList');
        if (!container) return;

        if (State.wc.folders.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет папок</div>';
        } else {
            var fragment = document.createDocumentFragment();

            State.wc.folders.forEach(function(folder) {
                var div = document.createElement('div');
                div.className = 'folder-item' + (folder.id === State.wc.selectedFolderId ? ' selected' : '');

                div.innerHTML = '<div>📁</div><div style="flex:1"><b>' + Utils.escapeHtml(folder.name) +
                    '</b><div style="font-size:.8em;color:#666">' + folder.items.length + ' шт</div></div>';

                div.onclick = function() {
                    State.wc.selectedFolderId = folder.id;
                    renderWcFolders();
                    renderWcItems();
                };

                fragment.appendChild(div);
            });

            container.innerHTML = '';
            container.appendChild(fragment);
        }

        // Update folder name badge
        var nameEl = Utils.$('wc-current-folder-name');
        var folder = State.getWcFolder();
        if (nameEl) {
            nameEl.innerHTML = folder ?
                '<span class="current-folder-badge">📁 ' + Utils.escapeHtml(folder.name) + '</span>' : '';
        }
    }

    /**
     * Render Weight Carousel items list
     */
    function renderWcItems() {
        var container = Utils.$('wcItemsList');
        var items = State.getWcFolderItems();
        var countEl = Utils.$('wc-items-count');

        if (countEl) countEl.textContent = items.length;
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state">Выберите папку</div>';
        } else {
            var fragment = document.createDocumentFragment();

            items.forEach(function(item) {
                var div = document.createElement('div');
                div.className = 'weight-item' + (item.active ? ' active' : '');

                var weight = Utils.formatWeight(item.weight);
                var typeLabel = item.prefix === '77' ? 'CAS' : item.prefix === '49' ? 'C128' : 'EAN';
                var discountText = item.prefix === '49' && item.discount !== undefined ? ' | ' + item.discount + '%' : '';

                div.innerHTML = '<div class="info"><div class="code">' + item.code +
                    '</div><div style="font-size:.8em;color:#666">PLU: ' + item.plu + ' | ' +
                    weight + ' | ' + typeLabel + discountText + '</div></div>' +
                    '<div style="display:flex;gap:8px">' +
                    '<button class="btn btn-sm ' + (item.active ? 'btn-success' : 'btn-outline') +
                    '" data-action="toggle">' + (item.active ? '✓' : '○') + '</button>' +
                    '<button class="btn btn-sm btn-danger" data-action="delete">✕</button></div>';

                div.querySelector('[data-action="toggle"]').onclick = function() {
                    item.active = !item.active;
                    global.BarGen.Storage.save();
                    renderWcItems();
                };

                div.querySelector('[data-action="delete"]').onclick = function() {
                    var folder = State.getWcFolder();
                    if (folder) {
                        folder.items = folder.items.filter(function(x) { return x.id !== item.id; });
                        global.BarGen.Storage.save();
                        renderWcItems();
                    }
                };

                fragment.appendChild(div);
            });

            container.innerHTML = '';
            container.appendChild(fragment);
        }

        updateWcStatus();
    }

    /**
     * Update Weight Carousel status display
     */
    function updateWcStatus() {
        var el = Utils.$('wc-rotation-status');
        var folder = State.getWcFolder();
        var active = folder ? folder.items.filter(function(x) { return x.active; }) : [];

        if (el) {
            if (State.wc.isRotating) {
                el.textContent = '🔄 ' + State.wc.rotationItems.length + ' шт';
            } else if (folder) {
                el.textContent = '✓ ' + active.length + ' активно';
            } else {
                el.textContent = 'Создайте папку';
            }
        }

        var ctrl = Utils.$('wc-rotation-controls');
        if (ctrl) ctrl.className = 'rotation-controls' + (State.wc.isRotating ? ' active' : '');
    }

    /* ==========================================================================
       Simple Generator UI
       ========================================================================== */

    /**
     * Render Simple Generator folders list
     */
    function renderSgFolders() {
        var container = Utils.$('sgFoldersList');
        var select = Utils.$('sgFolderSelect');

        if (container) {
            if (State.sg.folders.length === 0) {
                container.innerHTML = '<div class="empty-state">Нет папок</div>';
            } else {
                var fragment = document.createDocumentFragment();

                State.sg.folders.forEach(function(folder) {
                    var div = document.createElement('div');
                    div.className = 'sg-folder-row';

                    div.innerHTML = '<div style="font-size:1.5em;margin-right:10px">📂</div>' +
                        '<div style="flex:1"><b>' + Utils.escapeHtml(folder.name) +
                        '</b><div style="font-size:.8em;color:#666">' + folder.items.length +
                        ' шт</div></div><div style="color:#aaa">❯</div>';

                    div.onclick = function() {
                        global.BarGen.Controllers.SG.openFolder(folder.id);
                    };

                    fragment.appendChild(div);
                });

                container.innerHTML = '';
                container.appendChild(fragment);
            }
        }

        if (select) {
            if (State.sg.folders.length === 0) {
                select.innerHTML = '<option disabled selected>Нет папок</option>';
                if (!State.sg.isNewFolderMode) {
                    global.BarGen.Controllers.SG.toggleFolderMode(true);
                }
            } else {
                select.innerHTML = State.sg.folders.map(function(f) {
                    return '<option value="' + Utils.escapeHtml(f.name) + '">' + Utils.escapeHtml(f.name) + '</option>';
                }).join('');
            }
        }
    }

    /**
     * Render Simple Generator carousel
     */
    function renderSgCarousel() {
        var folder = State.getSgFolder();

        if (!folder || folder.items.length === 0) {
            Utils.$('sgCarouselName').textContent = 'Пусто';
            Utils.$('sgCarouselSvg').innerHTML = '';
            Utils.$('sgCarouselCounter').textContent = '0/0';
            return;
        }

        var index = State.sg.carouselIndex;
        var item = folder.items[index];

        Utils.$('sgCarouselName').textContent = item.name;
        Utils.$('sgCarouselCounter').textContent = (index + 1) + '/' + folder.items.length;

        Generators.renderBarcode(Utils.$('sgCarouselSvg'), item.code, item.type);
    }

    /* ==========================================================================
       Barcode Form UI
       ========================================================================== */

    /**
     * Render barcode configuration form fields
     */
    function renderBarcodeFields() {
        var container = Utils.$('barcodeParams');
        var typeSelect = Utils.$('barcodeType');

        if (!container || !typeSelect) return;

        var typeId = typeSelect.value;
        var cfg = Config.BARCODE_CONFIGS[typeId];

        if (!cfg) return;

        container.innerHTML = cfg.fields.map(function(field) {
            return '<div class="form-group">' +
                '<label>' + field.label + '</label>' +
                '<input type="text" id="' + field.name + '" placeholder="до ' + field.length + '">' +
                '<div class="hint" id="' + field.name + '-error" style="color:#ef4444"></div>' +
                '</div>';
        }).join('');
    }

    /* ==========================================================================
       History UI
       ========================================================================== */

    /**
     * Render code generation history
     */
    function renderHistory() {
        var container = Utils.$('historyList');
        if (!container) return;

        if (State.history.items.length === 0) {
            container.innerHTML = '<div class="empty-state">История пуста</div>';
        } else {
            var fragment = document.createDocumentFragment();

            State.history.items.forEach(function(item) {
                var div = document.createElement('div');
                div.className = 'history-item';

                var time = Utils.formatTime(item.timestamp);
                var displayCode = item.code && item.code.length > 30 ?
                    item.code.substring(0, 30) + '...' : (item.code || '-');

                div.innerHTML = '<span class="history-time">' + time + '</span>' +
                    '<span class="history-type">' + (item.type || '?') + '</span>' +
                    '<span class="history-code">' + Utils.escapeHtml(displayCode) + '</span>';

                div.onclick = function() {
                    // Copy to clipboard
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(item.code);
                    }

                    // Navigate to appropriate tab
                    if (item.type === 'DM') {
                        global.BarGen.Controllers.Tab.switchTo('datamatrix');
                        global.BarGen.Controllers.DM.stopTimer();
                        Generators.renderDM(Utils.$('datamatrix-container'), item.code);

                        var codeEl = Utils.$('current-code');
                        if (codeEl) codeEl.textContent = item.code;

                        global.BarGen.Controllers.DM.hideCodeInfo();
                    } else if (item.type === 'BC' || item.type === 'WC') {
                        global.BarGen.Controllers.Tab.switchTo('barcode');
                        Utils.$('barcodeResult').style.display = 'block';
                        Utils.$('barcodeText').textContent = item.code;
                        Generators.renderBarcode(Utils.$('barcodeSvg'), item.code, 'CODE128');
                    }
                };

                fragment.appendChild(div);
            });

            container.innerHTML = '';
            container.appendChild(fragment);
        }
    }

    /**
     * Render all saved lists (convenience method)
     */
    function renderSavedList() {
        renderDmFolders();
        renderDmItems();
    }

    // Export to namespace
    global.BarGen.UI = {
        // DataMatrix
        renderDmFolders: renderDmFolders,
        renderDmItems: renderDmItems,
        updateRotationStatus: updateRotationStatus,
        renderSavedList: renderSavedList,

        // Weight Carousel
        renderWcFolders: renderWcFolders,
        renderWcItems: renderWcItems,
        updateWcStatus: updateWcStatus,

        // Simple Generator
        renderSgFolders: renderSgFolders,
        renderSgCarousel: renderSgCarousel,

        // Barcode
        renderBarcodeFields: renderBarcodeFields,

        // History
        renderHistory: renderHistory
    };

})(window);
