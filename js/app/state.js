/**
 * BarGen State Management Module
 *
 * @description Centralized application state management
 * @module State
 *
 * @example
 * // Get current DM folder
 * var folder = BarGen.State.getDmFolder();
 *
 * // Add to history
 * BarGen.State.addToHistory({ type: 'DM', code: '...' });
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};

    var Config = global.BarGen.Config;

    /**
     * Current demo GTIN index for cycling through demo codes
     * @type {number}
     */
    var demoGtinIndex = 0;

    /**
     * Application State Object
     *
     * @description Holds all application data organized by feature:
     * - dm: DataMatrix generator state
     * - wc: Weight Carousel state
     * - sg: Simple Generator state
     * - savedItems: Legacy items (migrated to folders)
     * - history: Code generation history
     *
     * @type {Object}
     */
    var AppState = {
        /**
         * DataMatrix module state
         */
        dm: {
            timerValue: Config.DEFAULT_INTERVAL,
            remaining: Config.DEFAULT_INTERVAL,
            timerInterval: null,
            isRotating: false,
            rotationList: [],
            rotationIndex: 0,
            selectedTemplate: 'type1',
            generatedCodes: [],
            codeHistoryIndex: -1,
            folders: [],
            selectedFolderId: null,
            isNewFolderMode: false
        },

        /**
         * Legacy saved items (migrated to dm.folders on load)
         */
        savedItems: [],

        /**
         * Weight Carousel module state
         */
        wc: {
            folders: [],
            selectedFolderId: null,
            timerValue: Config.DEFAULT_INTERVAL,
            remaining: Config.DEFAULT_INTERVAL,
            timerInterval: null,
            isRotating: false,
            rotationIndex: 0,
            rotationItems: []
        },

        /**
         * Simple Generator module state
         */
        sg: {
            folders: [],
            selectedFolderId: null,
            carouselIndex: 0,
            isNewFolderMode: false
        },

        /**
         * Code generation history
         */
        history: {
            items: [],
            maxItems: Config.MAX_HISTORY_ITEMS
        }
    };

    /**
     * Get DataMatrix folder by ID
     *
     * @param {string} [id] - Folder ID (defaults to selected folder)
     * @returns {Object|null} Folder object or null
     */
    function getDmFolder(id) {
        var folderId = id || AppState.dm.selectedFolderId;
        for (var i = 0; i < AppState.dm.folders.length; i++) {
            if (AppState.dm.folders[i].id === folderId) {
                return AppState.dm.folders[i];
            }
        }
        return null;
    }

    /**
     * Get items from current DataMatrix folder
     *
     * @returns {Array} Array of items or empty array
     */
    function getDmFolderItems() {
        var folder = getDmFolder();
        return folder ? folder.items : [];
    }

    /**
     * Get Weight Carousel folder by ID
     *
     * @param {string} [id] - Folder ID (defaults to selected folder)
     * @returns {Object|null} Folder object or null
     */
    function getWcFolder(id) {
        var folderId = id || AppState.wc.selectedFolderId;
        for (var i = 0; i < AppState.wc.folders.length; i++) {
            if (AppState.wc.folders[i].id === folderId) {
                return AppState.wc.folders[i];
            }
        }
        return null;
    }

    /**
     * Get items from current Weight Carousel folder
     *
     * @returns {Array} Array of items or empty array
     */
    function getWcFolderItems() {
        var folder = getWcFolder();
        return folder ? folder.items : [];
    }

    /**
     * Get Simple Generator folder by ID
     *
     * @param {string} [id] - Folder ID (defaults to selected folder)
     * @returns {Object|null} Folder object or null
     */
    function getSgFolder(id) {
        var folderId = id || AppState.sg.selectedFolderId;
        for (var i = 0; i < AppState.sg.folders.length; i++) {
            if (AppState.sg.folders[i].id === folderId) {
                return AppState.sg.folders[i];
            }
        }
        return null;
    }

    /**
     * Add entry to code generation history
     *
     * @param {Object} entry - History entry
     * @param {string} entry.type - Code type ('DM', 'BC', 'WC')
     * @param {string} entry.code - Generated code
     */
    function addToHistory(entry) {
        AppState.history.items.unshift({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            type: entry.type,
            code: entry.code
        });

        // Trim history if exceeds max
        if (AppState.history.items.length > AppState.history.maxItems) {
            AppState.history.items = AppState.history.items.slice(0, AppState.history.maxItems);
        }

        // Save and update UI
        global.BarGen.Storage.save();
        global.BarGen.UI.renderHistory();
    }

    /**
     * Clear all history items
     */
    function clearHistory() {
        AppState.history.items = [];
        global.BarGen.Storage.save();
        global.BarGen.UI.renderHistory();
    }

    /**
     * Get next demo GTIN (cycles through list)
     *
     * @returns {string} GTIN barcode
     */
    function getNextDemoGtin() {
        var gtin = Config.DEMO_GTINS[demoGtinIndex];
        demoGtinIndex = (demoGtinIndex + 1) % Config.DEMO_GTINS.length;
        return gtin;
    }

    /**
     * Reset demo GTIN index to start
     */
    function resetDemoIndex() {
        demoGtinIndex = 0;
    }

    /**
     * Get current demo GTIN index
     *
     * @returns {number} Current index
     */
    function getDemoIndex() {
        return demoGtinIndex;
    }

    // Export to namespace
    global.BarGen.State = AppState;

    // Export helper methods
    global.BarGen.State.getDmFolder = getDmFolder;
    global.BarGen.State.getDmFolderItems = getDmFolderItems;
    global.BarGen.State.getWcFolder = getWcFolder;
    global.BarGen.State.getWcFolderItems = getWcFolderItems;
    global.BarGen.State.getSgFolder = getSgFolder;
    global.BarGen.State.addToHistory = addToHistory;
    global.BarGen.State.clearHistory = clearHistory;
    global.BarGen.State.getNextDemoGtin = getNextDemoGtin;
    global.BarGen.State.resetDemoIndex = resetDemoIndex;
    global.BarGen.State.getDemoIndex = getDemoIndex;

})(window);
