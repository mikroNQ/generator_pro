/**
 * BarGen Storage Module
 *
 * @description Handles localStorage persistence, import/export
 * @module Storage
 *
 * @example
 * // Load data on startup
 * BarGen.Storage.load();
 *
 * // Save after changes
 * BarGen.Storage.save();
 *
 * // Export backup
 * BarGen.Storage.exportData();
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};

    var Config = global.BarGen.Config;

    /**
     * Load data from localStorage
     *
     * @description Loads persisted data and handles migration of legacy items
     * Legacy savedItems are moved to a new folder on first load
     */
    function load() {
        var State = global.BarGen.State;

        try {
            var data = localStorage.getItem(Config.STORAGE_KEY);
            if (data) {
                var parsed = JSON.parse(data);

                // Restore state
                State.savedItems = parsed.savedItems || [];
                State.dm.folders = parsed.dmFolders || [];
                State.wc.folders = parsed.wcFolders || [];
                State.sg.folders = parsed.sgFolders || [];
                State.history.items = parsed.history || [];
            }

            // Migration: Move legacy items to folder
            if (State.savedItems.length > 0 && State.dm.folders.length === 0) {
                State.dm.folders.push({
                    id: 'dmf_legacy',
                    name: 'Импортированные',
                    items: State.savedItems.slice()
                });
                State.savedItems = [];
                save();
            }
        } catch (e) {
            console.error('[BarGen Storage] Load error:', e);
        }
    }

    /**
     * Save current state to localStorage
     */
    function save() {
        var State = global.BarGen.State;

        try {
            var data = {
                savedItems: State.savedItems,
                dmFolders: State.dm.folders,
                wcFolders: State.wc.folders,
                sgFolders: State.sg.folders,
                history: State.history.items
            };
            localStorage.setItem(Config.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('[BarGen Storage] Save error:', e);
        }
    }

    /**
     * Export all data as JSON file
     *
     * @description Creates downloadable backup file with current date
     */
    function exportData() {
        var State = global.BarGen.State;

        var data = {
            savedItems: State.savedItems,
            dmFolders: State.dm.folders,
            wcFolders: State.wc.folders,
            sgFolders: State.sg.folders,
            history: State.history.items
        };

        var blob = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: 'application/json' }
        );

        var filename = 'bargen_backup_' + new Date().toISOString().slice(0, 10) + '.json';

        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();

        // Clean up
        URL.revokeObjectURL(link.href);
    }

    /**
     * Import data from JSON file
     *
     * @param {File} file - JSON file to import
     */
    function importData(file) {
        var State = global.BarGen.State;

        var reader = new FileReader();

        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);

                if (confirm('Заменить текущие данные загруженным файлом?')) {
                    State.savedItems = data.savedItems || [];
                    State.dm.folders = data.dmFolders || [];
                    State.wc.folders = data.wcFolders || [];
                    State.sg.folders = data.sgFolders || [];
                    State.history.items = data.history || [];

                    save();
                    location.reload();
                }
            } catch (err) {
                alert('Ошибка чтения файла. Проверьте формат JSON.');
                console.error('[BarGen Storage] Import error:', err);
            }
        };

        reader.onerror = function() {
            alert('Ошибка чтения файла');
        };

        reader.readAsText(file);
    }

    /**
     * Clear all stored data
     *
     * @param {boolean} [confirm=true] - Show confirmation dialog
     * @returns {boolean} True if cleared
     */
    function clearAll(showConfirm) {
        if (showConfirm !== false && !confirm('Удалить все данные?')) {
            return false;
        }

        localStorage.removeItem(Config.STORAGE_KEY);
        location.reload();
        return true;
    }

    /**
     * Get storage size in bytes
     *
     * @returns {number} Size in bytes
     */
    function getSize() {
        var data = localStorage.getItem(Config.STORAGE_KEY);
        return data ? data.length * 2 : 0; // UTF-16 = 2 bytes per char
    }

    /**
     * Check if storage is available
     *
     * @returns {boolean} True if localStorage is available
     */
    function isAvailable() {
        try {
            var test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Export to namespace
    global.BarGen.Storage = {
        load: load,
        save: save,
        exportData: exportData,
        importData: importData,
        clearAll: clearAll,
        getSize: getSize,
        isAvailable: isAvailable
    };

})(window);
