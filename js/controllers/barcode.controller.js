/**
 * BarGen Barcode Controller
 *
 * @description Handles barcode generation from form fields
 * @module Controllers.Barcode
 *
 * @example
 * // Generate barcode from form
 * BarGen.Controllers.Barcode.generate();
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};
    global.BarGen.Controllers = global.BarGen.Controllers || {};

    var Config = global.BarGen.Config;
    var Utils = global.BarGen.Utils;
    var State = global.BarGen.State;
    var Generators = global.BarGen.Generators;

    /**
     * Generate barcode from form fields
     *
     * @description Reads form values, validates, generates barcode with check digit
     */
    function generate() {
        var typeSelect = Utils.$('barcodeType');
        var type = typeSelect.value;
        var cfg = Config.BARCODE_CONFIGS[type];

        if (!cfg) return;

        // Clear previous errors
        cfg.fields.forEach(function(field) {
            var errorEl = Utils.$(field.name + '-error');
            if (errorEl) errorEl.textContent = '';
        });

        // Build code from fields
        var code = cfg.prefix;
        var hasError = false;

        cfg.fields.forEach(function(field) {
            var inputEl = Utils.$(field.name);
            var value = inputEl ? inputEl.value.replace(/\D/g, '') : '';

            if (value.length > field.length) {
                Utils.$(field.name + '-error').textContent = 'Максимум ' + field.length + ' цифр';
                hasError = true;
            }

            code += Utils.padZeros(value, field.length);
        });

        if (hasError) return;

        // Calculate control digit
        var ctrl;
        if (cfg.fixedControl !== undefined) {
            ctrl = cfg.fixedControl;
        } else if (type === 'ean13_weight') {
            ctrl = Utils.calcControlEAN13(code).toString();
        } else {
            ctrl = Utils.calcControlCore(code).toString();
        }

        // Simulate error if checkbox checked
        var simulateError = Utils.$('simulateError').checked;
        if (simulateError && cfg.fixedControl === undefined) {
            var badCtrl = Math.floor(Math.random() * 10).toString();
            while (badCtrl === ctrl) {
                badCtrl = Math.floor(Math.random() * 10).toString();
            }
            ctrl = badCtrl;
        }

        var finalCode = code + ctrl;

        // Display result
        Utils.$('barcodeResult').style.display = 'block';
        Utils.$('barcodeText').textContent = finalCode;

        Generators.renderBarcode(Utils.$('barcodeSvg'), finalCode, cfg.format);

        // Add to history
        State.addToHistory({ type: 'BC', code: finalCode });
    }

    // Export to namespace
    global.BarGen.Controllers.Barcode = {
        generate: generate
    };

})(window);
