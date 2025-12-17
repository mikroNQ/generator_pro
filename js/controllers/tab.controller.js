/**
 * BarGen Tab Controller
 *
 * @description Handles tab navigation and lifecycle
 * @module Controllers.Tab
 *
 * @example
 * // Switch to tab
 * BarGen.Controllers.Tab.switchTo('datamatrix');
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};
    global.BarGen.Controllers = global.BarGen.Controllers || {};

    var State = global.BarGen.State;
    var UI = global.BarGen.UI;

    /**
     * Current active tab
     * @type {string}
     */
    var currentTab = 'datamatrix';

    /**
     * Switch to specified tab
     *
     * @description Handles tab switching with proper lifecycle:
     * - Stops timers when leaving tabs
     * - Initializes content when entering tabs
     *
     * @param {string} tabName - Tab name to switch to
     */
    function switchTo(tabName) {
        var Controllers = global.BarGen.Controllers;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(function(btn) {
            btn.classList.remove('active');
        });

        document.querySelectorAll('.tab-content').forEach(function(content) {
            content.classList.remove('active');
        });

        var btn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
        var content = document.getElementById('tab-' + tabName);

        if (btn) btn.classList.add('active');
        if (content) content.classList.add('active');

        // Lifecycle: leaving current tab
        if (currentTab === 'datamatrix') {
            Controllers.DM.stopTimer();
        }

        if (currentTab === 'weightcarousel' && State.wc.isRotating) {
            Controllers.WC.stopRotation();
        }

        // Lifecycle: entering new tab
        switch (tabName) {
            case 'datamatrix':
                Controllers.DM.generateAndDisplay();
                Controllers.DM.startTimer();
                break;

            case 'library':
                UI.renderDmFolders();
                UI.renderDmItems();
                UI.renderHistory();
                break;

            case 'barcode':
                UI.renderBarcodeFields();
                break;

            case 'weightcarousel':
                UI.renderWcFolders();
                UI.renderWcItems();
                break;

            case 'simplegen':
                UI.renderSgFolders();
                Controllers.SG.closeFolder();
                break;
        }

        currentTab = tabName;
    }

    /**
     * Get current tab name
     *
     * @returns {string} Current tab name
     */
    function getCurrent() {
        return currentTab;
    }

    // Export to namespace
    global.BarGen.Controllers.Tab = {
        switchTo: switchTo,
        getCurrent: getCurrent,
        // Expose current for backwards compatibility
        get current() { return currentTab; }
    };

})(window);
