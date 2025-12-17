/**
 * BarGen Simple Generator Controller
 *
 * @description Handles simple barcode generation and folder management
 * @module Controllers.SG
 *
 * @example
 * // Open folder carousel
 * BarGen.Controllers.SG.openFolder('folder_123');
 *
 * // Save barcode
 * BarGen.Controllers.SG.save();
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
     * Open folder and show carousel view
     *
     * @param {string} folderId - Folder ID to open
     */
    function openFolder(folderId) {
        State.sg.selectedFolderId = folderId;
        State.sg.carouselIndex = 0;

        var folder = State.getSgFolder();
        if (!folder) return;

        Utils.$('sg-view-list').style.display = 'none';
        Utils.$('sg-view-carousel').style.display = 'block';
        Utils.$('sgActiveFolderName').textContent = folder.name;

        UI.renderSgCarousel();
    }

    /**
     * Close folder and return to list view
     */
    function closeFolder() {
        State.sg.selectedFolderId = null;

        Utils.$('sg-view-carousel').style.display = 'none';
        Utils.$('sg-view-list').style.display = 'block';

        UI.renderSgFolders();
    }

    /**
     * Navigate to next item in carousel
     */
    function next() {
        var folder = State.getSgFolder();
        if (folder && folder.items.length > 0) {
            State.sg.carouselIndex = (State.sg.carouselIndex + 1) % folder.items.length;
            UI.renderSgCarousel();
        }
    }

    /**
     * Navigate to previous item in carousel
     */
    function prev() {
        var folder = State.getSgFolder();
        if (folder && folder.items.length > 0) {
            State.sg.carouselIndex = (State.sg.carouselIndex - 1 + folder.items.length) % folder.items.length;
            UI.renderSgCarousel();
        }
    }

    /**
     * Delete current item from carousel
     */
    function deleteItem() {
        var folder = State.getSgFolder();
        if (folder && folder.items.length > 0 && confirm('Удалить этот штрихкод?')) {
            folder.items.splice(State.sg.carouselIndex, 1);

            if (State.sg.carouselIndex >= folder.items.length) {
                State.sg.carouselIndex = Math.max(0, folder.items.length - 1);
            }

            Storage.save();
            UI.renderSgCarousel();
        }
    }

    /**
     * Delete current folder
     */
    function deleteFolder() {
        if (confirm('Удалить папку со всем содержимым?')) {
            State.sg.folders = State.sg.folders.filter(function(f) {
                return f.id !== State.sg.selectedFolderId;
            });
            Storage.save();
            closeFolder();
        }
    }

    /**
     * Rename current folder
     */
    function renameFolder() {
        var folder = State.getSgFolder();
        if (folder) {
            var newName = prompt('Новое имя папки:', folder.name);
            if (newName && newName.trim()) {
                folder.name = newName.trim();
                Storage.save();
                Utils.$('sgActiveFolderName').textContent = folder.name;
            }
        }
    }

    /**
     * Rename current item
     */
    function renameItem() {
        var folder = State.getSgFolder();
        if (folder && folder.items.length > 0) {
            var item = folder.items[State.sg.carouselIndex];
            var newName = prompt('Новое название:', item.name);

            if (newName !== null && newName.trim()) {
                item.name = newName.trim();
                Storage.save();
                UI.renderSgCarousel();
            }
        }
    }

    /**
     * Edit current item code
     */
    function editItemCode() {
        var folder = State.getSgFolder();
        if (folder && folder.items.length > 0) {
            var item = folder.items[State.sg.carouselIndex];
            var newCode = prompt('Новый код:', item.code);

            if (newCode !== null && newCode.trim()) {
                item.code = newCode.trim();
                Storage.save();
                UI.renderSgCarousel();
            }
        } else {
            alert('Нет папки или элементов');
        }
    }

    /**
     * Toggle folder creation mode
     *
     * @param {boolean} [force] - Force specific mode
     */
    function toggleFolderMode(force) {
        var select = Utils.$('sgFolderSelect');
        var input = Utils.$('sgFolderInput');
        var btn = Utils.$('sgFolderModeBtn');

        var isNew = force !== undefined ? force : !State.sg.isNewFolderMode;
        State.sg.isNewFolderMode = isNew;

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
     * Save barcode to folder
     */
    function save() {
        var value = Utils.$('sgValue').value.trim();
        var type = Utils.$('sgType').value;
        var name = Utils.$('sgName').value.trim() || 'Без названия';

        var folderName = State.sg.isNewFolderMode || State.sg.folders.length === 0 ?
            Utils.$('sgFolderInput').value.trim() :
            Utils.$('sgFolderSelect').value;

        if (!value) {
            alert('Введите значение штрихкода!');
            return;
        }

        if (!folderName) {
            alert('Укажите название папки!');
            return;
        }

        var result = Generators.generateSimple(value, type);

        // Find or create folder
        var folder = State.sg.folders.find(function(f) {
            return f.name.toLowerCase() === folderName.toLowerCase();
        });

        if (!folder) {
            folder = {
                id: 'sgf_' + Date.now(),
                name: folderName,
                items: []
            };
            State.sg.folders.push(folder);
        }

        // Add item
        folder.items.push({
            id: 'sgi_' + Date.now(),
            code: result.code,
            type: type,
            name: name
        });

        Storage.save();
        UI.renderSgFolders();

        // Clear form
        Utils.$('sgValue').value = '';
        Utils.$('sgName').value = '';
        Utils.$('sgSvg').style.display = 'none';

        // Reset folder mode
        if (State.sg.isNewFolderMode) {
            Utils.$('sgFolderInput').value = '';
            toggleFolderMode(false);

            setTimeout(function() {
                Utils.$('sgFolderSelect').value = folder.name;
            }, 50);
        }

        alert('Сохранено в папку: ' + folder.name);
    }

    /**
     * Update barcode preview
     */
    function updatePreview() {
        var type = Utils.$('sgType').value;
        var value = Utils.$('sgValue').value.trim();
        var svg = Utils.$('sgSvg');

        if (!value) {
            svg.style.display = 'none';
            return;
        }

        var result = Generators.generateSimple(value, type);
        svg.style.display = 'block';
        Generators.renderBarcode(svg, result.code, result.format);
    }

    // Export to namespace
    global.BarGen.Controllers.SG = {
        openFolder: openFolder,
        closeFolder: closeFolder,
        next: next,
        prev: prev,
        deleteItem: deleteItem,
        deleteFolder: deleteFolder,
        renameFolder: renameFolder,
        renameItem: renameItem,
        editItemCode: editItemCode,
        toggleFolderMode: toggleFolderMode,
        save: save,
        updatePreview: updatePreview
    };

})(window);
