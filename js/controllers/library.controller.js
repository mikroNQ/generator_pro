/**
 * BarGen Library Controller
 *
 * @description Handles GTIN library management and folder operations
 * @module Controllers.Library
 *
 * @example
 * // Add barcodes from textarea
 * BarGen.Controllers.Library.addBarcodes();
 *
 * // Select all items
 * BarGen.Controllers.Library.selectAll();
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

    /**
     * Add barcodes from textarea input
     *
     * @description Parses textarea, validates barcodes, adds to selected folder
     */
    function addBarcodes() {
        var value = Utils.$('barcode-input').value;
        if (!value.trim()) return;

        // Get folder name
        var folderName = State.dm.isNewFolderMode || State.dm.folders.length === 0 ?
            Utils.$('dmFolderInput').value.trim() :
            Utils.$('dmFolderSelect').value;

        if (!folderName) {
            alert('Укажите название папки!');
            return;
        }

        // Parse barcodes
        var items = value.split('\n').map(function(line, index) {
            var barcode = line.trim().replace(/\D/g, '');

            if (barcode.length >= 8) {
                return {
                    id: Date.now() + '_' + index,
                    barcode: barcode,
                    template: State.dm.selectedTemplate,
                    active: true
                };
            }
            return null;
        }).filter(function(x) { return x; });

        if (items.length === 0) {
            alert('Нет валидных баркодов (минимум 8 цифр)');
            return;
        }

        // Find or create folder
        var folder = State.dm.folders.find(function(f) {
            return f.name.toLowerCase() === folderName.toLowerCase();
        });

        if (!folder) {
            folder = {
                id: 'dmf_' + Date.now(),
                name: folderName,
                items: []
            };
            State.dm.folders.push(folder);
        }

        // Add items
        folder.items = folder.items.concat(items);
        State.dm.selectedFolderId = folder.id;

        Storage.save();
        UI.renderDmFolders();
        UI.renderDmItems();

        // Clear form
        Utils.$('barcode-input').value = '';

        if (State.dm.isNewFolderMode) {
            Utils.$('dmFolderInput').value = '';
            toggleFolderMode(false);
        }

        alert('Добавлено: ' + items.length + ' GTIN');
    }

    /**
     * Toggle folder creation mode
     *
     * @param {boolean} [force] - Force specific mode
     */
    function toggleFolderMode(force) {
        var select = Utils.$('dmFolderSelect');
        var input = Utils.$('dmFolderInput');
        var btn = Utils.$('dmFolderModeBtn');

        var isNew = force !== undefined ? force : !State.dm.isNewFolderMode;
        State.dm.isNewFolderMode = isNew;

        if (isNew) {
            select.classList.add('d-none');
            input.classList.remove('d-none');
            input.focus();
            btn.textContent = '☰';
            btn.classList.remove('btn-purple');
            btn.classList.add('btn-secondary');
        } else {
            select.classList.remove('d-none');
            input.classList.add('d-none');
            btn.textContent = '＋';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-purple');
        }
    }

    /**
     * Select all items in current folder
     */
    function selectAll() {
        var folder = State.getDmFolder();
        if (folder) {
            folder.items.forEach(function(item) { item.active = true; });
            Storage.save();
            UI.renderDmItems();
            UI.renderDmFolders();
        }
    }

    /**
     * Deselect all items in current folder
     */
    function deselectAll() {
        var folder = State.getDmFolder();
        if (folder) {
            folder.items.forEach(function(item) { item.active = false; });
            Storage.save();
            UI.renderDmItems();
            UI.renderDmFolders();
        }
    }

    /**
     * Delete selected items from current folder
     */
    function clearSelected() {
        var folder = State.getDmFolder();
        if (folder && confirm('Удалить выбранные элементы?')) {
            folder.items = folder.items.filter(function(x) { return !x.active; });
            Storage.save();
            UI.renderDmItems();
            UI.renderDmFolders();
        }
    }

    /**
     * Delete current folder
     */
    function deleteFolder() {
        var folder = State.getDmFolder();
        if (folder && confirm('Удалить папку "' + folder.name + '"?')) {
            State.dm.folders = State.dm.folders.filter(function(x) {
                return x.id !== folder.id;
            });
            State.dm.selectedFolderId = null;
            Storage.save();
            UI.renderDmFolders();
            UI.renderDmItems();

            // Stop rotation if it was running
            global.BarGen.Controllers.DM.stopRotation();
        }
    }

    /**
     * Rename current folder
     */
    function renameFolder() {
        var folder = State.getDmFolder();
        if (folder) {
            var newName = prompt('Новое имя папки:', folder.name);
            if (newName && newName.trim()) {
                folder.name = newName.trim();
                Storage.save();
                UI.renderDmFolders();
            }
        }
    }

    // Export to namespace
    global.BarGen.Controllers.Library = {
        addBarcodes: addBarcodes,
        toggleFolderMode: toggleFolderMode,
        selectAll: selectAll,
        deselectAll: deselectAll,
        clearSelected: clearSelected,
        deleteFolder: deleteFolder,
        renameFolder: renameFolder
    };

})(window);
