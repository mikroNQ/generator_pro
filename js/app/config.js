/**
 * BarGen Configuration Module
 *
 * @description Contains all constants, demo data, and barcode configurations
 * @module Config
 *
 * @example
 * // Access demo GTINs
 * var gtin = BarGen.Config.DEMO_GTINS[0];
 *
 * // Get barcode config
 * var cfg = BarGen.Config.BARCODE_CONFIGS.code128_19_piece;
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};

    /**
     * Application version
     * @type {string}
     */
    var VERSION = '2.5.0';

    /**
     * LocalStorage key for persisting data
     * @type {string}
     */
    var STORAGE_KEY = 'barcode_gen_v5';

    /**
     * Default timer interval in seconds
     * @type {number}
     */
    var DEFAULT_INTERVAL = 0.7;

    /**
     * Maximum history items to store
     * @type {number}
     */
    var MAX_HISTORY_ITEMS = 50;

    /**
     * Real GTIN codes for demo mode
     * These are actual product barcodes for testing
     * @type {string[]}
     */
    var DEMO_GTINS = [
        '4811220000307', '4811220000215', '4810206001604', '4810206001598', '4810206001543',
        '4810099003310', '4810168005436', '4810099003464', '4810099004522', '4810168007157',
        '4811468003047', '4810322002547', '4810268011436', '4810093009318', '4810099004775',
        '4810806002230', '4811293001829', '4810806002223', '4810206002076', '4810806002537',
        '4810439004557', '4810168006853', '4810268007842', '4810405002211', '4810223004695',
        '4810223010924', '4810223003865', '4810168007829', '4810268011429', '4810405002198',
        '4810223003728', '4810268011412', '4810168007645', '4810108006837', '4810099007769',
        '4810099007752', '4810927001020', '4810168007836', '4810168007669', '4810268009037',
        '4811198003317', '4810206001710', '4810099003600', '4810093002500', '4810099003662',
        '4810108002372', '4810268008702', '4810099007561', '4810099003150', '4607037122574',
        '4810206001628', '4810268010828', '4810099004645', '4810099003471', '4811293000808',
        '4810223003698', '4810268008801', '4810223003773', '4810099008346', '4810099008353',
        '4810099008438', '4810099008445', '4810223004107', '4810223004190', '4810439001754',
        '4810065000787', '4810223004060', '4810268011672', '4810268010712', '4810268010613',
        '4810223004084', '4810223004077', '4810701000126', '4810405002327', '4810099003624',
        '4810168007843', '4810168007867', '4810268002298', '4810806001493', '4810099004539',
        '4810099004454', '4810223004022', '4810223004251', '4810806000748', '4810273001446',
        '4810223004145', '4810108005465', '4810405001412', '4810099003341', '4810021000325',
        '4810206002090', '4810557006341', '4810099005734', '4810405002976', '4810206001765',
        '4810168045494', '4811194005575', '4811377000588', '4810223003810', '4810263009032',
        '4810168007096', '4810168007102', '4810206001666', '4810099004300', '4810268004001',
        '4811585000035', '4810268012723', '4810439001747', '4810099007103', '4810806002544',
        '4811220002127', '4810065000893', '4810223004565', '4811269002522', '4810099007783',
        '4810099007806', '4810223002417', '4810223002738', '4810223004046', '4810223002226',
        '4811220003209', '4810268005572', '4810767003529', '4810806000137', '4810223003940',
        '4810099003587', '4810108001726', '4810065001081', '4810206001758', '4811220005418',
        '4810099004478', '4811234005855'
    ];

    /**
     * DataMatrix code templates
     *
     * @description Templates for generating DataMatrix codes
     * Type 1: Tobacco/Water products (shorter serial)
     * Type 2: Clothing/Shoes (longer serial with crypto)
     *
     * @type {Object}
     */
    var TEMPLATES = {
        type1: {
            name: 'Тип 1',
            description: 'Табак/Вода - короткий серийник',
            /**
             * Generate Type 1 DataMatrix code
             * @param {string} barcode - GTIN barcode
             * @returns {string} Generated code
             */
            generate: function(barcode) {
                var gs = String.fromCharCode(29);
                var gtin = BarGen.Utils.padBarcode(barcode);
                var serial = BarGen.Utils.generateSerial('0', 7);
                var crypto = BarGen.Utils.randomBase64(4).substring(0, 4);
                return '01' + gtin + '21' + serial + gs + '93' + crypto;
            }
        },
        type2: {
            name: 'Тип 2',
            description: 'Одежда/Обувь - длинный серийник',
            /**
             * Generate Type 2 DataMatrix code
             * @param {string} barcode - GTIN barcode
             * @returns {string} Generated code
             */
            generate: function(barcode) {
                var gs = String.fromCharCode(29);
                var gtin = BarGen.Utils.padBarcode(barcode);
                var serial = BarGen.Utils.generateSerial('5', 13);
                var hex = BarGen.Utils.randomHex(4);
                var crypto = BarGen.Utils.randomBase64(44);
                return '01' + gtin + '21' + serial + gs + '91' + hex + gs + '92' + crypto;
            }
        }
    };

    /**
     * Barcode type configurations
     *
     * @description Defines structure for different barcode formats:
     * - code128_19_piece: Piece goods (prefix 47)
     * - code128_19_weight: Weight goods with discount (prefix 49)
     * - code128_19_price: Price-based (prefix 44)
     * - code128_16_cas: CAS system (prefix 77)
     * - ean13_weight: EAN-13 weight (prefix 22)
     *
     * @type {Object}
     */
    var BARCODE_CONFIGS = {
        code128_19_piece: {
            prefix: '47',
            fields: [
                { name: 'productCode', label: 'Код товара (9)', length: 9 },
                { name: 'discount', label: 'Скидка (2)', length: 2 },
                { name: 'quantity', label: 'Кол-во (5)', length: 5 }
            ],
            format: 'CODE128',
            description: 'Штучный товар - 19 символов'
        },
        code128_19_weight: {
            prefix: '49',
            fields: [
                { name: 'productCode', label: 'Код товара (9)', length: 9 },
                { name: 'discount', label: 'Скидка (2)', length: 2 },
                { name: 'weight', label: 'Вес (5)', length: 5 }
            ],
            format: 'CODE128',
            description: 'Весовой товар со скидкой - 19 символов'
        },
        code128_19_price: {
            prefix: '44',
            fields: [
                { name: 'productCode', label: 'Код товара (9)', length: 9 },
                { name: 'price', label: 'Цена (7)', length: 7 }
            ],
            format: 'CODE128',
            description: 'Товар с ценой - 19 символов'
        },
        code128_16_cas: {
            prefix: '77',
            fields: [
                { name: 'productCode', label: 'Код товара (6)', length: 6 },
                { name: 'weight', label: 'Вес (7)', length: 7 }
            ],
            format: 'CODE128',
            fixedControl: '0',
            description: 'CAS весы - 16 символов'
        },
        ean13_weight: {
            prefix: '22',
            fields: [
                { name: 'productCode', label: 'Код товара (5)', length: 5 },
                { name: 'weight', label: 'Вес (5)', length: 5 }
            ],
            format: 'EAN13',
            description: 'EAN-13 весовой - 13 символов'
        }
    };

    /**
     * Supported simple barcode formats
     * @type {string[]}
     */
    var SIMPLE_FORMATS = ['CODE128', 'EAN13', 'UPC', 'ITF14'];

    /**
     * Weight range defaults (in grams)
     * @type {Object}
     */
    var WEIGHT_DEFAULTS = {
        min: 150,
        max: 8000,
        fixed: 500
    };

    /**
     * Discount range defaults (percentage)
     * @type {Object}
     */
    var DISCOUNT_DEFAULTS = {
        min: 5,
        max: 30,
        fixed: 0
    };

    // Export to namespace
    global.BarGen.Config = {
        VERSION: VERSION,
        STORAGE_KEY: STORAGE_KEY,
        DEFAULT_INTERVAL: DEFAULT_INTERVAL,
        MAX_HISTORY_ITEMS: MAX_HISTORY_ITEMS,
        DEMO_GTINS: DEMO_GTINS,
        TEMPLATES: TEMPLATES,
        BARCODE_CONFIGS: BARCODE_CONFIGS,
        SIMPLE_FORMATS: SIMPLE_FORMATS,
        WEIGHT_DEFAULTS: WEIGHT_DEFAULTS,
        DISCOUNT_DEFAULTS: DISCOUNT_DEFAULTS
    };

})(window);
