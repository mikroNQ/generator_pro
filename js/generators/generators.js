/**
 * BarGen Generators Module
 *
 * @description Barcode and DataMatrix code generation functions
 * @module Generators
 *
 * @requires bwip-js (external) - for DataMatrix rendering
 * @requires JsBarcode (external) - for linear barcode rendering
 *
 * @example
 * // Generate DataMatrix code
 * var result = BarGen.Generators.generateDM('4810099003310', 'type1');
 *
 * // Generate weight barcode
 * var barcode = BarGen.Generators.generateWeightBarcode('77', '12345', 1500);
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};

    var Config = global.BarGen.Config;
    var Utils = global.BarGen.Utils;
    var State = global.BarGen.State;

    /**
     * Generate DataMatrix code
     *
     * @description Generates DataMatrix code using template from Config.
     * If no barcode provided, uses next demo GTIN from list.
     *
     * @param {string} [barcode] - GTIN barcode (optional, uses demo if empty)
     * @param {string} [templateId='type1'] - Template ID ('type1' or 'type2')
     * @returns {Object} Result object
     * @returns {string} result.code - Generated DataMatrix code
     * @returns {string} result.barcode - Used GTIN barcode
     * @returns {string} result.templateName - Template display name
     *
     * @example
     * var result = generateDM('4810099003310', 'type1');
     * // { code: '010481009900331021...', barcode: '4810099003310', templateName: 'Тип 1' }
     */
    function generateDM(barcode, templateId) {
        var template = Config.TEMPLATES[templateId || State.dm.selectedTemplate];
        var usedBarcode = barcode;

        // Use demo GTIN if no barcode provided
        if (!usedBarcode) {
            usedBarcode = State.getNextDemoGtin();
        }

        var code = template.generate(usedBarcode);

        // Add to history
        State.addToHistory({ type: 'DM', code: code });

        return {
            code: code,
            templateName: template.name,
            barcode: usedBarcode
        };
    }

    /**
     * Render DataMatrix code to canvas
     *
     * @description Uses bwip-js library to render DataMatrix
     *
     * @param {HTMLElement} container - Container element for canvas
     * @param {string} code - DataMatrix code to render
     */
    function renderDM(container, code) {
        if (!container) return;

        container.innerHTML = '';

        try {
            var canvas = document.createElement('canvas');
            // @ts-ignore - bwipjs is loaded externally
            bwipjs.toCanvas(canvas, {
                bcid: 'datamatrix',
                text: code,
                scale: 4,
                padding: 2
            });
            container.appendChild(canvas);
        } catch (e) {
            container.innerHTML = '<div style="color:red">Ошибка генерации</div>';
            console.error('[BarGen Generators] DataMatrix render error:', e);
        }
    }

    /**
     * Generate weight barcode
     *
     * @description Generates barcode with weight data for different systems:
     * - 77: CAS scale format (Code128, 16 chars)
     * - 49: Code128 with discount (19 chars)
     * - 22: EAN-13 weight format (13 chars)
     *
     * @param {string} prefix - Barcode prefix ('77', '49', or '22')
     * @param {string} plu - Product lookup code
     * @param {number} weight - Weight in grams
     * @param {number} [discount=0] - Discount percentage (for prefix 49)
     * @returns {Object} Generated barcode data
     * @returns {string} result.code - Full barcode with check digit
     * @returns {string} result.format - Barcode format ('CODE128' or 'EAN13')
     * @returns {number} result.weight - Weight in grams
     * @returns {string} result.plu - PLU code
     * @returns {string} result.prefix - Prefix used
     * @returns {number} result.discount - Discount if applicable
     *
     * @example
     * var bc = generateWeightBarcode('77', '12345', 1500);
     * // { code: '770001234500150000', format: 'CODE128', ... }
     */
    function generateWeightBarcode(prefix, plu, weight, discount) {
        var code, ctrl, format;

        if (prefix === '77') {
            // CAS format: 77 + PLU(6) + Weight(7) + Control(1) = 16
            code = '77' + Utils.padZeros(plu, 6) + Utils.padZeros(weight, 7);
            ctrl = '0'; // Fixed control for CAS
            format = 'CODE128';
        } else if (prefix === '49') {
            // Code128 weight with discount: 49 + PLU(9) + Disc(2) + Weight(5) + Control(1) = 19
            code = '49' + Utils.padZeros(plu, 9) + Utils.padZeros(discount || 0, 2) + Utils.padZeros(weight, 5);
            ctrl = Utils.calcControlCore(code).toString();
            format = 'CODE128';
        } else {
            // EAN-13 weight: 22 + PLU(5) + Weight(5) + Control(1) = 13
            code = '22' + Utils.padZeros(plu, 5) + Utils.padZeros(weight, 5);
            ctrl = Utils.calcControlEAN13(code).toString();
            format = 'EAN13';
        }

        return {
            code: code + ctrl,
            format: format,
            weight: weight,
            plu: plu,
            prefix: prefix,
            discount: discount
        };
    }

    /**
     * Render linear barcode to SVG element
     *
     * @description Uses JsBarcode library to render barcode
     *
     * @param {SVGElement} svg - SVG element to render to
     * @param {string} code - Barcode value
     * @param {string} [format='CODE128'] - Barcode format
     */
    function renderBarcode(svg, code, format) {
        if (!svg) return;

        svg.innerHTML = '';

        try {
            // @ts-ignore - JsBarcode is loaded externally
            JsBarcode(svg, code, {
                format: format || 'CODE128',
                height: 70,
                displayValue: true,
                fontSize: 14,
                margin: 10,
                width: 2
            });
        } catch (e) {
            // Fallback to CODE128 if format fails
            try {
                // @ts-ignore
                JsBarcode(svg, code, {
                    format: 'CODE128',
                    height: 70,
                    displayValue: true,
                    width: 2
                });
            } catch (err) {
                console.error('[BarGen Generators] Barcode render error:', err);
            }
        }
    }

    /**
     * Generate simple barcode
     *
     * @description Generates barcode for SimpleGen module.
     * Automatically calculates EAN-13 check digit if needed.
     *
     * @param {string} value - Barcode value
     * @param {string} type - Barcode type ('CODE128', 'EAN13', 'UPC', 'ITF14')
     * @returns {Object} Result object
     * @returns {string} result.code - Generated barcode
     * @returns {string} result.format - Barcode format
     *
     * @example
     * var bc = generateSimple('590123412345', 'EAN13');
     * // { code: '5901234123457', format: 'EAN13' }
     */
    function generateSimple(value, type) {
        var code = value.trim();

        // Auto-calculate EAN-13 check digit if 12 digits provided
        if (type === 'EAN13' && code.length === 12 && /^\d+$/.test(code)) {
            code += Utils.calcControlEAN13(code);
        }

        return {
            code: code,
            format: type
        };
    }

    /**
     * Generate barcode from config
     *
     * @description Used by Barcode tab to generate codes based on BARCODE_CONFIGS
     *
     * @param {string} typeId - Config type ID (e.g., 'code128_19_piece')
     * @param {Object} values - Field values
     * @param {boolean} [simulateError=false] - Generate wrong check digit
     * @returns {Object|null} Generated barcode or null on error
     */
    function generateFromConfig(typeId, values, simulateError) {
        var cfg = Config.BARCODE_CONFIGS[typeId];
        if (!cfg) return null;

        var code = cfg.prefix;
        var hasError = false;

        // Build code from fields
        cfg.fields.forEach(function(field) {
            var value = values[field.name] || '';
            value = value.replace(/\D/g, '');

            if (value.length > field.length) {
                hasError = true;
            }

            code += Utils.padZeros(value, field.length);
        });

        if (hasError) return null;

        // Calculate control digit
        var ctrl;
        if (cfg.fixedControl !== undefined) {
            ctrl = cfg.fixedControl;
        } else if (typeId === 'ean13_weight') {
            ctrl = Utils.calcControlEAN13(code).toString();
        } else {
            ctrl = Utils.calcControlCore(code).toString();
        }

        // Simulate error if requested
        if (simulateError && cfg.fixedControl === undefined) {
            var badCtrl = Math.floor(Math.random() * 10).toString();
            while (badCtrl === ctrl) {
                badCtrl = Math.floor(Math.random() * 10).toString();
            }
            ctrl = badCtrl;
        }

        return {
            code: code + ctrl,
            format: cfg.format
        };
    }

    // Export to namespace
    global.BarGen.Generators = {
        generateDM: generateDM,
        renderDM: renderDM,
        generateWeightBarcode: generateWeightBarcode,
        renderBarcode: renderBarcode,
        generateSimple: generateSimple,
        generateFromConfig: generateFromConfig
    };

})(window);
