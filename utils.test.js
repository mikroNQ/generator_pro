/**
 * Comprehensive tests for the Utils object
 * Testing utility functions for barcode generation application
 */

// Mock the Utils object from app.js
const Utils = {
    getRandomChar: function() {
        var c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        return c.charAt(Math.floor(Math.random() * c.length));
    },
    generateSerial: function(p, l) {
        var s = p || '';
        while (s.length < (l || 13)) s += this.getRandomChar();
        return s;
    },
    randomDigits: function(n) {
        var s = '';
        for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
        return s;
    },
    randomHex: function(n) {
        var h = '0123456789ABCDEF', s = '';
        for (var i = 0; i < n; i++) s += h[Math.floor(Math.random() * 16)];
        return s;
    },
    randomBase64: function(n) {
        var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', s = '';
        for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * 64)];
        return s;
    },
    padBarcode: function(b) {
        b = b.replace(/\D/g, '');
        while (b.length < 14) b = '0' + b;
        return b.slice(0, 14);
    },
    padZeros: function(v, l) {
        return (v + '').replace(/\D/g, '').padStart(l, '0');
    },
    calcControlCore: function(code) {
        var sum = 0, d = code.split('').filter(function(c) { return /\d/.test(c); });
        for (var i = 0; i < d.length; i++) sum += parseInt(d[i]);
        return sum % 10;
    },
    calcControlEAN13: function(code) {
        var d = code.split('').map(function(c) { return parseInt(c) || 0; }), sum = 0;
        for (var i = 0; i < d.length; i++) sum += d[i] * (i % 2 ? 3 : 1);
        return (10 - (sum % 10)) % 10;
    },
    randomWeight: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    escapeHtml: function(t) {
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    },
    scrollToElement: function(el, offset) {
        if (!el) return;
        var rect = el.getBoundingClientRect();
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var targetY = rect.top + scrollTop - (offset || 20);
        window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
};

describe('Utils.getRandomChar', () => {
    const validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    test('should return a single character', () => {
        const result = Utils.getRandomChar();
        expect(result).toHaveLength(1);
    });

    test('should return a valid alphanumeric character', () => {
        const result = Utils.getRandomChar();
        expect(validChars).toContain(result);
    });

    test('should produce different characters over multiple calls', () => {
        const results = new Set();
        for (let i = 0; i < 100; i++) {
            results.add(Utils.getRandomChar());
        }
        // With 100 calls, we should get at least a few different characters
        expect(results.size).toBeGreaterThan(1);
    });
});

describe('Utils.generateSerial', () => {
    test('should generate serial with default length of 13', () => {
        const result = Utils.generateSerial();
        expect(result).toHaveLength(13);
    });

    test('should generate serial with custom length', () => {
        const result = Utils.generateSerial('', 20);
        expect(result).toHaveLength(20);
    });

    test('should include prefix in serial', () => {
        const prefix = 'ABC';
        const result = Utils.generateSerial(prefix, 10);
        expect(result).toHaveLength(10);
        expect(result.startsWith(prefix)).toBe(true);
    });

    test('should handle prefix longer than target length', () => {
        const prefix = 'ABCDEFGHIJKLMNOP';
        const result = Utils.generateSerial(prefix, 10);
        expect(result.length).toBeGreaterThanOrEqual(10);
    });

    test('should generate only alphanumeric characters', () => {
        const result = Utils.generateSerial('', 50);
        expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });

    test('should handle numeric prefix', () => {
        const result = Utils.generateSerial('0', 7);
        expect(result).toHaveLength(7);
        expect(result[0]).toBe('0');
    });

    test('should handle empty prefix', () => {
        const result = Utils.generateSerial('', 10);
        expect(result).toHaveLength(10);
    });
});

describe('Utils.randomDigits', () => {
    test('should generate string of specified length', () => {
        expect(Utils.randomDigits(5)).toHaveLength(5);
        expect(Utils.randomDigits(10)).toHaveLength(10);
        expect(Utils.randomDigits(1)).toHaveLength(1);
    });

    test('should contain only digits', () => {
        const result = Utils.randomDigits(20);
        expect(result).toMatch(/^\d+$/);
    });

    test('should handle zero length', () => {
        const result = Utils.randomDigits(0);
        expect(result).toBe('');
    });

    test('should produce different values', () => {
        const results = new Set();
        for (let i = 0; i < 50; i++) {
            results.add(Utils.randomDigits(10));
        }
        expect(results.size).toBeGreaterThan(1);
    });

    test('should include all digits 0-9 over many calls', () => {
        const digits = new Set();
        for (let i = 0; i < 100; i++) {
            Utils.randomDigits(10).split('').forEach(d => digits.add(d));
        }
        expect(digits.size).toBe(10);
    });
});

describe('Utils.randomHex', () => {
    test('should generate hex string of specified length', () => {
        expect(Utils.randomHex(4)).toHaveLength(4);
        expect(Utils.randomHex(8)).toHaveLength(8);
        expect(Utils.randomHex(16)).toHaveLength(16);
    });

    test('should contain only valid hex characters', () => {
        const result = Utils.randomHex(32);
        expect(result).toMatch(/^[0-9A-F]+$/);
    });

    test('should handle zero length', () => {
        const result = Utils.randomHex(0);
        expect(result).toBe('');
    });

    test('should produce different values', () => {
        const results = new Set();
        for (let i = 0; i < 50; i++) {
            results.add(Utils.randomHex(8));
        }
        expect(results.size).toBeGreaterThan(1);
    });

    test('should use uppercase letters', () => {
        const result = Utils.randomHex(100);
        const hasUppercase = /[A-F]/.test(result);
        // With 100 characters, very likely to have at least one A-F
        expect(hasUppercase).toBe(true);
    });
});

describe('Utils.randomBase64', () => {
    const validBase64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    test('should generate base64 string of specified length', () => {
        expect(Utils.randomBase64(10)).toHaveLength(10);
        expect(Utils.randomBase64(20)).toHaveLength(20);
        expect(Utils.randomBase64(44)).toHaveLength(44);
    });

    test('should contain only valid base64 characters', () => {
        const result = Utils.randomBase64(50);
        result.split('').forEach(char => {
            expect(validBase64Chars).toContain(char);
        });
    });

    test('should handle zero length', () => {
        const result = Utils.randomBase64(0);
        expect(result).toBe('');
    });

    test('should produce different values', () => {
        const results = new Set();
        for (let i = 0; i < 50; i++) {
            results.add(Utils.randomBase64(10));
        }
        expect(results.size).toBeGreaterThan(1);
    });
});

describe('Utils.padBarcode', () => {
    test('should pad short barcode to 14 digits', () => {
        expect(Utils.padBarcode('123')).toBe('00000000000123');
    });

    test('should handle exact 14 digit barcode', () => {
        expect(Utils.padBarcode('12345678901234')).toBe('12345678901234');
    });

    test('should truncate barcode longer than 14 digits', () => {
        expect(Utils.padBarcode('123456789012345678')).toBe('12345678901234');
    });

    test('should remove non-digit characters', () => {
        expect(Utils.padBarcode('ABC123DEF456')).toBe('00000000123456');
    });

    test('should handle empty string', () => {
        expect(Utils.padBarcode('')).toBe('00000000000000');
    });

    test('should handle barcode with spaces', () => {
        // '123 456 789' has 9 digits total -> padded to 14: '00000123456789'
        expect(Utils.padBarcode('123 456 789')).toBe('00000123456789');
    });

    test('should handle barcode with dashes', () => {
        expect(Utils.padBarcode('123-456-789-012')).toBe('00123456789012');
    });

    test('should handle single digit', () => {
        expect(Utils.padBarcode('5')).toBe('00000000000005');
    });

    test('should handle all non-digit input', () => {
        expect(Utils.padBarcode('ABCDEF')).toBe('00000000000000');
    });
});

describe('Utils.padZeros', () => {
    test('should pad number to specified length', () => {
        expect(Utils.padZeros('123', 6)).toBe('000123');
        expect(Utils.padZeros('5', 4)).toBe('0005');
    });

    test('should handle exact length', () => {
        expect(Utils.padZeros('12345', 5)).toBe('12345');
    });

    test('should handle number longer than length', () => {
        expect(Utils.padZeros('123456', 4)).toBe('123456');
    });

    test('should remove non-digit characters', () => {
        expect(Utils.padZeros('ABC123', 6)).toBe('000123');
    });

    test('should handle numeric input', () => {
        expect(Utils.padZeros(123, 6)).toBe('000123');
    });

    test('should handle zero', () => {
        expect(Utils.padZeros(0, 5)).toBe('00000');
    });

    test('should handle empty string', () => {
        expect(Utils.padZeros('', 5)).toBe('00000');
    });

    test('should handle zero length', () => {
        expect(Utils.padZeros('123', 0)).toBe('123');
    });

    test('should handle mixed alphanumeric', () => {
        expect(Utils.padZeros('1A2B3C', 8)).toBe('00000123');
    });
});

describe('Utils.calcControlCore', () => {
    test('should calculate control digit for simple code', () => {
        // Sum of 1+2+3+4+5 = 15, 15 % 10 = 5
        expect(Utils.calcControlCore('12345')).toBe(5);
    });

    test('should calculate control digit for code with non-digits', () => {
        // Should only sum digits: 1+2+3 = 6
        expect(Utils.calcControlCore('A1B2C3')).toBe(6);
    });

    test('should handle all zeros', () => {
        expect(Utils.calcControlCore('0000')).toBe(0);
    });

    test('should handle sum equal to 10', () => {
        // 5+5 = 10, 10 % 10 = 0
        expect(Utils.calcControlCore('55')).toBe(0);
    });

    test('should handle sum greater than 10', () => {
        // 9+9+9 = 27, 27 % 10 = 7
        expect(Utils.calcControlCore('999')).toBe(7);
    });

    test('should handle empty string', () => {
        expect(Utils.calcControlCore('')).toBe(0);
    });

    test('should handle single digit', () => {
        expect(Utils.calcControlCore('7')).toBe(7);
    });

    test('should handle long code', () => {
        // 1+2+3+4+5+6+7+8+9+0 = 45, 45 % 10 = 5
        expect(Utils.calcControlCore('1234567890')).toBe(5);
    });

    test('should ignore non-digit characters', () => {
        expect(Utils.calcControlCore('ABC')).toBe(0);
    });
});

describe('Utils.calcControlEAN13', () => {
    test('should calculate EAN13 check digit correctly', () => {
        // Real EAN13: 978014300723 (without check digit)
        // Calculation: (9*1 + 7*3 + 8*1 + 0*3 + 1*1 + 4*3 + 3*1 + 0*3 + 0*1 + 7*3 + 2*1 + 3*3) = 9+21+8+0+1+12+3+0+0+21+2+9 = 86
        // Check digit: (10 - (86 % 10)) % 10 = (10 - 6) % 10 = 4
        expect(Utils.calcControlEAN13('978014300723')).toBe(4);
    });

    test('should handle alternating positions correctly', () => {
        // 1*1 + 0*3 + 1*1 + 0*3 + 1*1 + 0*3 = 1+0+1+0+1+0 = 3
        // (10 - 3) % 10 = 7
        expect(Utils.calcControlEAN13('101010')).toBe(7);
    });

    test('should handle all zeros', () => {
        // All zeros sum to 0
        // (10 - 0) % 10 = 0
        expect(Utils.calcControlEAN13('000000000000')).toBe(0);
    });

    test('should handle sum resulting in check digit 0', () => {
        // Need sum % 10 = 0
        // 5*1 + 5*3 = 5+15 = 20, 20 % 10 = 0
        expect(Utils.calcControlEAN13('55')).toBe(0);
    });

    test('should treat non-numeric as 0', () => {
        // 'A' -> parseInt('A') = NaN -> 0
        expect(Utils.calcControlEAN13('AAAA')).toBe(0);
    });

    test('should handle single digit', () => {
        // 5*1 = 5, (10 - 5) % 10 = 5
        expect(Utils.calcControlEAN13('5')).toBe(5);
    });

    test('should handle empty string', () => {
        expect(Utils.calcControlEAN13('')).toBe(0);
    });

    test('should calculate for standard 12-digit EAN code', () => {
        // Common test case: 400638133393 -> check digit should be 3
        // Let's verify: 4*1+0*3+0*1+6*3+3*1+8*3+1*1+3*3+3*1+3*3+9*1+3*3 = 4+0+0+18+3+24+1+9+3+9+9+9 = 89
        // (10 - 89%10) % 10 = (10-9)%10 = 1
        expect(Utils.calcControlEAN13('400638133393')).toBe(1);
    });
});

describe('Utils.randomWeight', () => {
    test('should return value within range', () => {
        for (let i = 0; i < 100; i++) {
            const result = Utils.randomWeight(100, 200);
            expect(result).toBeGreaterThanOrEqual(100);
            expect(result).toBeLessThanOrEqual(200);
        }
    });

    test('should return integer values', () => {
        for (let i = 0; i < 50; i++) {
            const result = Utils.randomWeight(1, 1000);
            expect(Number.isInteger(result)).toBe(true);
        }
    });

    test('should handle same min and max', () => {
        const result = Utils.randomWeight(50, 50);
        expect(result).toBe(50);
    });

    test('should handle min = 0', () => {
        const result = Utils.randomWeight(0, 10);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(10);
    });

    test('should produce different values over multiple calls', () => {
        const results = new Set();
        for (let i = 0; i < 50; i++) {
            results.add(Utils.randomWeight(1, 1000));
        }
        // Should have variety in results
        expect(results.size).toBeGreaterThan(1);
    });

    test('should handle negative numbers', () => {
        const result = Utils.randomWeight(-10, -5);
        expect(result).toBeGreaterThanOrEqual(-10);
        expect(result).toBeLessThanOrEqual(-5);
    });

    test('should handle large ranges', () => {
        const result = Utils.randomWeight(150, 8000);
        expect(result).toBeGreaterThanOrEqual(150);
        expect(result).toBeLessThanOrEqual(8000);
    });
});

describe('Utils.escapeHtml', () => {
    test('should escape < and >', () => {
        expect(Utils.escapeHtml('<div>')).toBe('&lt;div&gt;');
    });

    test('should escape ampersand', () => {
        expect(Utils.escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    test('should escape quotes', () => {
        // textContent doesn't escape quotes, only innerHTML special chars
        expect(Utils.escapeHtml('"Hello"')).toBe('"Hello"');
    });

    test('should escape apostrophe', () => {
        expect(Utils.escapeHtml("It's")).toBe("It's");
    });

    test('should handle script tags', () => {
        expect(Utils.escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });

    test('should handle empty string', () => {
        expect(Utils.escapeHtml('')).toBe('');
    });

    test('should handle plain text', () => {
        expect(Utils.escapeHtml('Hello World')).toBe('Hello World');
    });

    test('should handle multiple special characters', () => {
        expect(Utils.escapeHtml('<tag attr="value">&text</tag>')).toBe('&lt;tag attr="value"&gt;&amp;text&lt;/tag&gt;');
    });

    test('should prevent XSS attacks', () => {
        const malicious = '<img src=x onerror="alert(1)">';
        const escaped = Utils.escapeHtml(malicious);
        expect(escaped).not.toContain('<img');
        expect(escaped).toContain('&lt;img');
    });

    test('should handle newlines and special whitespace', () => {
        expect(Utils.escapeHtml('Line1\nLine2\tTab')).toBe('Line1\nLine2\tTab');
    });
});

describe('Utils.scrollToElement', () => {
    let mockElement;
    let originalScrollTo;

    beforeEach(() => {
        // Mock element with getBoundingClientRect
        mockElement = {
            getBoundingClientRect: jest.fn(() => ({
                top: 500,
                bottom: 600,
                left: 0,
                right: 100
            }))
        };

        // Mock window.scrollTo
        originalScrollTo = window.scrollTo;
        window.scrollTo = jest.fn();

        // Mock window.pageYOffset
        Object.defineProperty(window, 'pageYOffset', {
            writable: true,
            value: 0
        });

        // Mock document.documentElement.scrollTop
        Object.defineProperty(document.documentElement, 'scrollTop', {
            writable: true,
            value: 0
        });
    });

    afterEach(() => {
        window.scrollTo = originalScrollTo;
    });

    test('should not scroll if element is null', () => {
        Utils.scrollToElement(null);
        expect(window.scrollTo).not.toHaveBeenCalled();
    });

    test('should not scroll if element is undefined', () => {
        Utils.scrollToElement(undefined);
        expect(window.scrollTo).not.toHaveBeenCalled();
    });

    test('should scroll to element with default offset', () => {
        Utils.scrollToElement(mockElement);
        expect(window.scrollTo).toHaveBeenCalledWith({
            top: 480, // 500 (rect.top) + 0 (pageYOffset) - 20 (default offset)
            behavior: 'smooth'
        });
    });

    test('should scroll to element with custom offset', () => {
        Utils.scrollToElement(mockElement, 50);
        expect(window.scrollTo).toHaveBeenCalledWith({
            top: 450, // 500 - 50
            behavior: 'smooth'
        });
    });

    test('should account for current scroll position', () => {
        window.pageYOffset = 200;
        Utils.scrollToElement(mockElement, 20);
        expect(window.scrollTo).toHaveBeenCalledWith({
            top: 680, // 500 + 200 - 20
            behavior: 'smooth'
        });
    });

    test('should handle zero offset', () => {
        // When offset is 0, the || operator uses default of 20
        Utils.scrollToElement(mockElement, 0);
        expect(window.scrollTo).toHaveBeenCalledWith({
            top: 480, // 500 + 0 - 20 (default)
            behavior: 'smooth'
        });
    });

    test('should use smooth scrolling behavior', () => {
        Utils.scrollToElement(mockElement);
        const callArgs = window.scrollTo.mock.calls[0][0];
        expect(callArgs.behavior).toBe('smooth');
    });
});
