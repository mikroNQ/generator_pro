/**
 * BarGen Utilities Module
 *
 * @description Helper functions for string manipulation, calculations, and DOM operations
 * @module Utils
 *
 * @example
 * // Generate random serial number
 * var serial = BarGen.Utils.generateSerial('0', 7);
 *
 * // Calculate EAN-13 check digit
 * var checkDigit = BarGen.Utils.calcControlEAN13('590123412345');
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};

    /**
     * Character sets for random generation
     * @private
     */
    var CHARS = {
        alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        hex: '0123456789ABCDEF',
        base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    };

    /**
     * Get random character from alphanumeric set
     * @returns {string} Single random character
     */
    function getRandomChar() {
        return CHARS.alphanumeric.charAt(Math.floor(Math.random() * CHARS.alphanumeric.length));
    }

    /**
     * Generate serial number with prefix
     *
     * @param {string} [prefix=''] - Prefix to start with
     * @param {number} [length=13] - Total length of serial
     * @returns {string} Generated serial number
     *
     * @example
     * generateSerial('0', 7) // '0a3Kx9Q'
     */
    function generateSerial(prefix, length) {
        var serial = prefix || '';
        var targetLength = length || 13;
        while (serial.length < targetLength) {
            serial += getRandomChar();
        }
        return serial;
    }

    /**
     * Generate random digits
     *
     * @param {number} n - Number of digits
     * @returns {string} Random digit string
     *
     * @example
     * randomDigits(5) // '38291'
     */
    function randomDigits(n) {
        var result = '';
        for (var i = 0; i < n; i++) {
            result += Math.floor(Math.random() * 10);
        }
        return result;
    }

    /**
     * Generate random hex string
     *
     * @param {number} n - Number of characters
     * @returns {string} Random hex string (uppercase)
     *
     * @example
     * randomHex(4) // 'A3F1'
     */
    function randomHex(n) {
        var result = '';
        for (var i = 0; i < n; i++) {
            result += CHARS.hex[Math.floor(Math.random() * 16)];
        }
        return result;
    }

    /**
     * Generate random Base64 string
     *
     * @param {number} n - Number of characters
     * @returns {string} Random Base64 string
     *
     * @example
     * randomBase64(8) // 'aB3+Kx9/'
     */
    function randomBase64(n) {
        var result = '';
        for (var i = 0; i < n; i++) {
            result += CHARS.base64[Math.floor(Math.random() * 64)];
        }
        return result;
    }

    /**
     * Pad barcode to 14 digits (GTIN format)
     *
     * @param {string} barcode - Input barcode
     * @returns {string} 14-digit padded barcode
     *
     * @example
     * padBarcode('4810099003310') // '04810099003310'
     */
    function padBarcode(barcode) {
        var cleaned = barcode.replace(/\D/g, '');
        while (cleaned.length < 14) {
            cleaned = '0' + cleaned;
        }
        return cleaned.slice(0, 14);
    }

    /**
     * Pad number with leading zeros
     *
     * @param {string|number} value - Value to pad
     * @param {number} length - Target length
     * @returns {string} Zero-padded string
     *
     * @example
     * padZeros(42, 5) // '00042'
     */
    function padZeros(value, length) {
        return (value + '').replace(/\D/g, '').padStart(length, '0');
    }

    /**
     * Calculate control digit (sum of digits mod 10)
     * Used for Code128 weight barcodes
     *
     * @param {string} code - Barcode without check digit
     * @returns {number} Control digit (0-9)
     *
     * @example
     * calcControlCore('49000000100001000') // 6
     */
    function calcControlCore(code) {
        var sum = 0;
        var digits = code.split('').filter(function(c) {
            return /\d/.test(c);
        });
        for (var i = 0; i < digits.length; i++) {
            sum += parseInt(digits[i]);
        }
        return sum % 10;
    }

    /**
     * Calculate EAN-13 check digit
     *
     * @description Uses standard EAN-13 algorithm:
     * - Odd positions (1,3,5...) multiplied by 1
     * - Even positions (2,4,6...) multiplied by 3
     * - Check digit = (10 - (sum mod 10)) mod 10
     *
     * @param {string} code - First 12 digits of EAN-13
     * @returns {number} Check digit (0-9)
     *
     * @example
     * calcControlEAN13('590123412345') // 7
     */
    function calcControlEAN13(code) {
        var digits = code.split('').map(function(c) {
            return parseInt(c) || 0;
        });
        var sum = 0;
        for (var i = 0; i < digits.length; i++) {
            sum += digits[i] * (i % 2 ? 3 : 1);
        }
        return (10 - (sum % 10)) % 10;
    }

    /**
     * Generate random weight in grams
     *
     * @param {number} min - Minimum weight
     * @param {number} max - Maximum weight
     * @returns {number} Random weight value
     *
     * @example
     * randomWeight(150, 8000) // 3427
     */
    function randomWeight(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Escape HTML special characters
     *
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML-safe string
     *
     * @example
     * escapeHtml('<script>') // '&lt;script&gt;'
     */
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Smooth scroll to element
     *
     * @param {HTMLElement} element - Target element
     * @param {number} [offset=20] - Offset from top in pixels
     */
    function scrollToElement(element, offset) {
        if (!element) return;
        var rect = element.getBoundingClientRect();
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var targetY = rect.top + scrollTop - (offset || 20);
        window.scrollTo({ top: targetY, behavior: 'smooth' });
    }

    /**
     * Get element by ID with null check
     *
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null
     */
    function $(id) {
        return document.getElementById(id);
    }

    /**
     * Query selector shorthand
     *
     * @param {string} selector - CSS selector
     * @param {HTMLElement} [context=document] - Context element
     * @returns {HTMLElement|null} First matching element
     */
    function $$(selector, context) {
        return (context || document).querySelector(selector);
    }

    /**
     * Query selector all shorthand
     *
     * @param {string} selector - CSS selector
     * @param {HTMLElement} [context=document] - Context element
     * @returns {NodeList} All matching elements
     */
    function $$$(selector, context) {
        return (context || document).querySelectorAll(selector);
    }

    /**
     * Add event listener shorthand
     *
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    function on(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    /**
     * Format timestamp to time string
     *
     * @param {string} isoString - ISO timestamp
     * @returns {string} Formatted time (HH:MM)
     *
     * @example
     * formatTime('2024-01-15T14:30:00') // '14:30'
     */
    function formatTime(isoString) {
        return new Date(isoString).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Format weight in grams to kg string
     *
     * @param {number} grams - Weight in grams
     * @returns {string} Formatted weight
     *
     * @example
     * formatWeight(1500) // '1.500 кг'
     */
    function formatWeight(grams) {
        return (grams / 1000).toFixed(3) + ' кг';
    }

    /**
     * Generate unique ID
     *
     * @param {string} [prefix='id'] - ID prefix
     * @returns {string} Unique ID string
     *
     * @example
     * generateId('item') // 'item_1705312800000'
     */
    function generateId(prefix) {
        return (prefix || 'id') + '_' + Date.now();
    }

    // Export to namespace
    global.BarGen.Utils = {
        getRandomChar: getRandomChar,
        generateSerial: generateSerial,
        randomDigits: randomDigits,
        randomHex: randomHex,
        randomBase64: randomBase64,
        padBarcode: padBarcode,
        padZeros: padZeros,
        calcControlCore: calcControlCore,
        calcControlEAN13: calcControlEAN13,
        randomWeight: randomWeight,
        escapeHtml: escapeHtml,
        scrollToElement: scrollToElement,
        $: $,
        $$: $$,
        $$$: $$$,
        on: on,
        formatTime: formatTime,
        formatWeight: formatWeight,
        generateId: generateId
    };

})(window);
