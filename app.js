(function(){
'use strict';

var AppState = {
    STORAGE_KEY: 'barcode_gen_v4',
    dm: { timerValue: 0.7, remaining: 0.7, timerInterval: null, isRotating: false, rotationList: [], rotationIndex: 0, selectedTemplate: 'type1' },
    savedItems: [],
    wc: { folders: [], selectedFolderId: null, timerValue: 0.7, remaining: 0.7, timerInterval: null, isRotating: false, rotationIndex: 0, rotationItems: [] },
    sg: { folders: [], selectedFolderId: null, carouselIndex: 0, isNewFolderMode: false },
    history: { items: [], maxItems: 50 },
    
    getWcFolder: function(id) {
        var fid = id || this.wc.selectedFolderId;
        for (var i = 0; i < this.wc.folders.length; i++) if (this.wc.folders[i].id === fid) return this.wc.folders[i];
        return null;
    },
    getWcFolderItems: function() { var f = this.getWcFolder(); return f ? f.items : []; },
    getSgFolder: function(id) {
        var fid = id || this.sg.selectedFolderId;
        for (var i = 0; i < this.sg.folders.length; i++) if (this.sg.folders[i].id === fid) return this.sg.folders[i];
        return null;
    },
    addToHistory: function(entry) {
        this.history.items.unshift({ id: Date.now().toString(), timestamp: new Date().toISOString(), type: entry.type, code: entry.code });
        if (this.history.items.length > this.history.maxItems) this.history.items = this.history.items.slice(0, this.history.maxItems);
        Storage.save(); UI.renderHistory();
    },
    clearHistory: function() { this.history.items = []; Storage.save(); UI.renderHistory(); }
};

var Storage = {
    load: function() {
        try {
            var data = localStorage.getItem(AppState.STORAGE_KEY);
            if (data) { var p = JSON.parse(data); AppState.savedItems = p.savedItems || []; AppState.wc.folders = p.wcFolders || []; AppState.sg.folders = p.sgFolders || []; AppState.history.items = p.history || []; }
        } catch (e) { console.error('Load error:', e); }
    },
    save: function() {
        try { localStorage.setItem(AppState.STORAGE_KEY, JSON.stringify({ savedItems: AppState.savedItems, wcFolders: AppState.wc.folders, sgFolders: AppState.sg.folders, history: AppState.history.items })); }
        catch (e) { console.error('Save error:', e); }
    },
    exportData: function() {
        var blob = new Blob([JSON.stringify({ savedItems: AppState.savedItems, wcFolders: AppState.wc.folders, sgFolders: AppState.sg.folders, history: AppState.history.items }, null, 2)], {type: 'application/json'});
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup_' + new Date().toISOString().slice(0,10) + '.json'; a.click();
    },
    importData: function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try { var d = JSON.parse(e.target.result); if (confirm('Заменить данные?')) { AppState.savedItems = d.savedItems || []; AppState.wc.folders = d.wcFolders || []; AppState.sg.folders = d.sgFolders || []; AppState.history.items = d.history || []; Storage.save(); location.reload(); } }
            catch (err) { alert('Ошибка файла'); }
        }; reader.readAsText(file);
    }
};

var Utils = {
    getRandomChar: function() { var c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; return c.charAt(Math.floor(Math.random() * c.length)); },
    generateSerial: function(p, l) { var s = p || ''; while (s.length < (l || 13)) s += this.getRandomChar(); return s; },
    randomDigits: function(n) { var s = ''; for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 10); return s; },
    randomHex: function(n) { var h = '0123456789ABCDEF', s = ''; for (var i = 0; i < n; i++) s += h[Math.floor(Math.random() * 16)]; return s; },
    randomBase64: function(n) { var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', s = ''; for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * 64)]; return s; },
    padBarcode: function(b) { b = b.replace(/\D/g, ''); while (b.length < 14) b = '0' + b; return b.slice(0, 14); },
    padZeros: function(v, l) { return (v + '').replace(/\D/g, '').padStart(l, '0'); },
    calcControlCore: function(code) { var sum = 0, d = code.split('').filter(function(c) { return /\d/.test(c); }); for (var i = 0; i < d.length; i++) sum += parseInt(d[i]); return sum % 10; },
    calcControlEAN13: function(code) { var d = code.split('').map(function(c) { return parseInt(c) || 0; }), sum = 0; for (var i = 0; i < d.length; i++) sum += d[i] * (i % 2 ? 3 : 1); return (10 - (sum % 10)) % 10; },
    randomWeight: function(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
    escapeHtml: function(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; },
    scrollToElement: function(el, offset) {
        if (!el) return;
        var rect = el.getBoundingClientRect();
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var targetY = rect.top + scrollTop - (offset || 20);
        window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
};

var Generators = {
    templates: {
        type1: { name: 'Тип 1 (Табак/Вода)', generate: function(b) { var gs = String.fromCharCode(29), g = Utils.padBarcode(b); return '01' + g + '21' + Utils.generateSerial('0', 7) + gs + '93' + Utils.randomBase64(4).substring(0, 4); } },
        type2: { name: 'Тип 2 (Одежда/Обувь)', generate: function(b) { var gs = String.fromCharCode(29), g = Utils.padBarcode(b); return '01' + g + '21' + Utils.generateSerial('5', 13) + gs + '91' + Utils.randomHex(4) + gs + '92' + Utils.randomBase64(44); } }
    },
    barcodeConfigs: {
        code128_19_piece: { prefix: "47", fields: [{ name: "productCode", label: "Код товара (9)", length: 9 }, { name: "discount", label: "Скидка (2)", length: 2 }, { name: "quantity", label: "Кол-во (5)", length: 5 }], format: 'CODE128' },
        code128_19_weight: { prefix: "49", fields: [{ name: "productCode", label: "Код товара (9)", length: 9 }, { name: "discount", label: "Скидка (2)", length: 2 }, { name: "weight", label: "Вес (5)", length: 5 }], format: 'CODE128' },
        code128_19_price: { prefix: "44", fields: [{ name: "productCode", label: "Код товара (9)", length: 9 }, { name: "price", label: "Цена (7)", length: 7 }], format: 'CODE128' },
        code128_16_cas: { prefix: "77", fields: [{ name: "productCode", label: "Код товара (6)", length: 6 }, { name: "weight", label: "Вес (7)", length: 7 }], format: 'CODE128', fixedControl: '0' },
        ean13_weight: { prefix: "22", fields: [{ name: "productCode", label: "Код товара (5)", length: 5 }, { name: "weight", label: "Вес (5)", length: 5 }], format: 'EAN13' }
    },
    generateDM: function(b, t) { var tmpl = this.templates[t || AppState.dm.selectedTemplate], code = tmpl.generate(b || '0' + Utils.randomDigits(13)); AppState.addToHistory({ type: 'DM', code: code.substring(0, 30) + '...' }); return { code: code, templateName: tmpl.name }; },
    renderDM: function(c, code) { if (!c) return; c.innerHTML = ''; try { var canvas = document.createElement('canvas'); bwipjs.toCanvas(canvas, { bcid: 'datamatrix', text: code, scale: 4, padding: 2 }); c.appendChild(canvas); } catch (e) { c.innerHTML = '<div style="color:red">Ошибка</div>'; } },
    generateWeightBarcode: function(prefix, plu, weight, disc) {
        var code, ctrl, fmt;
        if (prefix === '77') { code = '77' + Utils.padZeros(plu, 6) + Utils.padZeros(weight, 7); ctrl = '0'; fmt = 'CODE128'; }
        else if (prefix === '49') { code = '49' + Utils.padZeros(plu, 9) + Utils.padZeros(disc || 0, 2) + Utils.padZeros(weight, 5); ctrl = Utils.calcControlCore(code).toString(); fmt = 'CODE128'; }
        else { code = '22' + Utils.padZeros(plu, 5) + Utils.padZeros(weight, 5); ctrl = Utils.calcControlEAN13(code).toString(); fmt = 'EAN13'; }
        return { code: code + ctrl, format: fmt, weight: weight, plu: plu, prefix: prefix, discount: disc };
    },
    renderBarcode: function(svg, code, fmt) { if (!svg) return; svg.innerHTML = ''; try { JsBarcode(svg, code, { format: fmt || 'CODE128', height: 70, displayValue: true, fontSize: 14, margin: 10, width: 2 }); } catch (e) { try { JsBarcode(svg, code, { format: 'CODE128', height: 70, displayValue: true, width: 2 }); } catch(err) {} } },
    generateSimple: function(v, t) { var code = v.trim(); if (t === 'EAN13' && code.length === 12 && /^\d+$/.test(code)) code += Utils.calcControlEAN13(code); return { code: code, format: t }; }
};

var UI = {
    renderSavedList: function() {
        var c = document.getElementById('saved-list'); if (!c) return;
        if (AppState.savedItems.length === 0) { c.innerHTML = '<div class="empty-state">Нет сохранённых GTIN</div>'; }
        else {
            var f = document.createDocumentFragment();
            AppState.savedItems.forEach(function(item) {
                var d = document.createElement('div'); d.className = 'saved-item' + (item.active ? ' active' : '');
                var tmpl = Generators.templates[item.template] || Generators.templates.type1;
                d.innerHTML = '<div class="info"><div class="barcode">' + Utils.escapeHtml(item.barcode) + '</div><div style="font-size:.8em;color:#666">' + tmpl.name + '</div></div><div style="display:flex;gap:8px"><button class="btn btn-sm ' + (item.active ? 'btn-success' : 'btn-outline') + '" data-action="toggle">' + (item.active ? '✓' : '○') + '</button><button class="btn btn-sm btn-danger" data-action="delete">✕</button></div>';
                d.querySelector('[data-action="toggle"]').onclick = function() { item.active = !item.active; Storage.save(); UI.renderSavedList(); };
                d.querySelector('[data-action="delete"]').onclick = function() { AppState.savedItems = AppState.savedItems.filter(function(x) { return x.id !== item.id; }); Storage.save(); UI.renderSavedList(); };
                f.appendChild(d);
            });
            c.innerHTML = ''; c.appendChild(f);
        }
        document.getElementById('selected-count').textContent = AppState.savedItems.filter(function(x) { return x.active; }).length;
        this.updateRotationStatus();
    },
    updateRotationStatus: function() {
        var el = document.getElementById('rotation-status'), active = AppState.savedItems.filter(function(x) { return x.active; });
        if (el) el.textContent = AppState.dm.isRotating ? '🔄 Ротация: ' + AppState.dm.rotationList.length : active.length > 0 ? '✓ Выбрано: ' + active.length : 'Выберите GTIN';
        var ctrl = document.getElementById('rotation-controls'); if (ctrl) ctrl.className = 'rotation-controls' + (AppState.dm.isRotating ? ' active' : '');
    },
    renderWcFolders: function() {
        var c = document.getElementById('wcFolderList'); if (!c) return;
        if (AppState.wc.folders.length === 0) { c.innerHTML = '<div class="empty-state">Нет папок</div>'; }
        else {
            var f = document.createDocumentFragment();
            AppState.wc.folders.forEach(function(folder) {
                var d = document.createElement('div'); d.className = 'folder-item' + (folder.id === AppState.wc.selectedFolderId ? ' selected' : '');
                d.innerHTML = '<div>📁</div><div style="flex:1"><b>' + Utils.escapeHtml(folder.name) + '</b><div style="font-size:.8em;color:#666">' + folder.items.length + ' шт</div></div>';
                d.onclick = function() { AppState.wc.selectedFolderId = folder.id; UI.renderWcFolders(); UI.renderWcItems(); };
                f.appendChild(d);
            });
            c.innerHTML = ''; c.appendChild(f);
        }
        var nameEl = document.getElementById('wc-current-folder-name'), folder = AppState.getWcFolder();
        if (nameEl) nameEl.innerHTML = folder ? '<span class="current-folder-badge">📁 ' + Utils.escapeHtml(folder.name) + '</span>' : '';
    },
    renderWcItems: function() {
        var c = document.getElementById('wcItemsList'), items = AppState.getWcFolderItems();
        document.getElementById('wc-items-count').textContent = items.length;
        if (!c) return;
        if (items.length === 0) { c.innerHTML = '<div class="empty-state">Выберите папку</div>'; }
        else {
            var f = document.createDocumentFragment();
            items.forEach(function(item) {
                var d = document.createElement('div'); d.className = 'weight-item' + (item.active ? ' active' : '');
                var w = (item.weight / 1000).toFixed(3) + ' кг', t = item.prefix === '77' ? 'CAS' : item.prefix === '49' ? 'C128' : 'EAN';
                var disc = item.prefix === '49' && item.discount !== undefined ? ' | ' + item.discount + '%' : '';
                d.innerHTML = '<div class="info"><div class="code">' + item.code + '</div><div style="font-size:.8em;color:#666">PLU: ' + item.plu + ' | ' + w + ' | ' + t + disc + '</div></div><div style="display:flex;gap:8px"><button class="btn btn-sm ' + (item.active ? 'btn-success' : 'btn-outline') + '" data-action="toggle">' + (item.active ? '✓' : '○') + '</button><button class="btn btn-sm btn-danger" data-action="delete">✕</button></div>';
                d.querySelector('[data-action="toggle"]').onclick = function() { item.active = !item.active; Storage.save(); UI.renderWcItems(); };
                d.querySelector('[data-action="delete"]').onclick = function() { var fl = AppState.getWcFolder(); if (fl) { fl.items = fl.items.filter(function(x) { return x.id !== item.id; }); Storage.save(); UI.renderWcItems(); } };
                f.appendChild(d);
            });
            c.innerHTML = ''; c.appendChild(f);
        }
        this.updateWcStatus();
    },
    updateWcStatus: function() {
        var el = document.getElementById('wc-rotation-status'), folder = AppState.getWcFolder();
        var active = folder ? folder.items.filter(function(x) { return x.active; }) : [];
        if (el) el.textContent = AppState.wc.isRotating ? '🔄 ' + AppState.wc.rotationItems.length + ' шт' : folder ? '✓ ' + active.length + ' активно' : 'Создайте папку';
        var ctrl = document.getElementById('wc-rotation-controls'); if (ctrl) ctrl.className = 'rotation-controls' + (AppState.wc.isRotating ? ' active' : '');
    },
    renderSgFolders: function() {
        var c = document.getElementById('sgFoldersList'), sel = document.getElementById('sgFolderSelect');
        if (c) {
            if (AppState.sg.folders.length === 0) { c.innerHTML = '<div class="empty-state">Нет папок</div>'; }
            else {
                var f = document.createDocumentFragment();
                AppState.sg.folders.forEach(function(folder) {
                    var d = document.createElement('div'); d.className = 'sg-folder-row';
                    d.innerHTML = '<div style="font-size:1.5em;margin-right:10px">📂</div><div style="flex:1"><b>' + Utils.escapeHtml(folder.name) + '</b><div style="font-size:.8em;color:#666">' + folder.items.length + ' шт</div></div><div style="color:#aaa">❯</div>';
                    d.onclick = function() { Controllers.SG.openFolder(folder.id); };
                    f.appendChild(d);
                });
                c.innerHTML = ''; c.appendChild(f);
            }
        }
        if (sel) {
            if (AppState.sg.folders.length === 0) { sel.innerHTML = '<option disabled selected>Нет папок</option>'; if (!AppState.sg.isNewFolderMode) Controllers.SG.toggleFolderMode(true); }
            else { sel.innerHTML = AppState.sg.folders.map(function(f) { return '<option value="' + Utils.escapeHtml(f.name) + '">' + Utils.escapeHtml(f.name) + '</option>'; }).join(''); }
        }
    },
    renderSgCarousel: function() {
        var folder = AppState.getSgFolder();
        if (!folder || folder.items.length === 0) { document.getElementById('sgCarouselName').textContent = 'Пусто'; document.getElementById('sgCarouselSvg').innerHTML = ''; document.getElementById('sgCarouselCounter').textContent = '0/0'; return; }
        var idx = AppState.sg.carouselIndex, item = folder.items[idx];
        document.getElementById('sgCarouselName').textContent = item.name;
        document.getElementById('sgCarouselCounter').textContent = (idx + 1) + '/' + folder.items.length;
        Generators.renderBarcode(document.getElementById('sgCarouselSvg'), item.code, item.type);
    },
    renderBarcodeFields: function() {
        var c = document.getElementById('barcodeParams'), type = document.getElementById('barcodeType').value, cfg = Generators.barcodeConfigs[type];
        if (!c || !cfg) return;
        c.innerHTML = cfg.fields.map(function(f) { return '<div class="form-group"><label>' + f.label + '</label><input type="text" id="' + f.name + '" placeholder="до ' + f.length + '"><div class="hint" id="' + f.name + '-error" style="color:#ef4444"></div></div>'; }).join('');
    },
    renderHistory: function() {
        var c = document.getElementById('historyList'); 
        if (!c) return;
        if (AppState.history.items.length === 0) { 
            c.innerHTML = '<div class="empty-state">История пуста</div>'; 
        } else {
            var f = document.createDocumentFragment();
            AppState.history.items.forEach(function(item) {
                var d = document.createElement('div'); 
                d.className = 'history-item';
                var time = new Date(item.timestamp).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
                d.innerHTML = '<span class="history-time">' + time + '</span><span class="history-type">' + (item.type || '?') + '</span><span class="history-code">' + Utils.escapeHtml(item.code || '-') + '</span>';
                d.onclick = function() { 
                    if (navigator.clipboard) navigator.clipboard.writeText(item.code);
                    if (item.type === 'DM') {
                        Controllers.Tab.switchTo('datamatrix');
                        Controllers.DM.stopTimer(); 
                        Generators.renderDM(document.getElementById('datamatrix-container'), item.code);
                        var codeEl = document.getElementById('current-code');
                        if(codeEl) codeEl.textContent = item.code;
                        Controllers.DM.hideCodeInfo();
                    } else if (item.type === 'BC' || item.type === 'WC') {
                        Controllers.Tab.switchTo('barcode');
                        document.getElementById('barcodeResult').style.display = 'block';
                        document.getElementById('barcodeText').textContent = item.code;
                        Generators.renderBarcode(document.getElementById('barcodeSvg'), item.code, 'CODE128');
                    }
                };
                f.appendChild(d);
            });
            c.innerHTML = ''; c.appendChild(f);
        }
    }
};

var Controllers = {
    DM: {
        generateAndDisplay: function() {
            var dm = AppState.dm, result, barcode;
            if (dm.isRotating && dm.rotationList.length > 0) {
                var item = dm.rotationList[dm.rotationIndex]; barcode = item.barcode;
                result = Generators.generateDM(barcode, item.template);
                dm.rotationIndex = (dm.rotationIndex + 1) % dm.rotationList.length;
                this.showCodeInfo(barcode, result.templateName, dm.rotationIndex, dm.rotationList.length);
                this.updateBadge(true, dm.rotationList.length);
            } else { result = Generators.generateDM(); this.hideCodeInfo(); this.updateBadge(false); }
            Generators.renderDM(document.getElementById('datamatrix-container'), result.code);
            var codeEl = document.getElementById('current-code'); if (codeEl) { codeEl.textContent = result.code; codeEl.classList.add('flash'); setTimeout(function() { codeEl.classList.remove('flash'); }, 300); }
        },
        startTimer: function() {
            var self = this; this.stopTimer(); AppState.dm.remaining = AppState.dm.timerValue; this.updateCountdown(); this.togglePlayState(true);
            AppState.dm.timerInterval = setInterval(function() { AppState.dm.remaining -= 0.1; if (AppState.dm.remaining <= 0.05) { self.generateAndDisplay(); AppState.dm.remaining = AppState.dm.timerValue; } self.updateCountdown(); }, 100);
        },
        stopTimer: function() { if (AppState.dm.timerInterval) { clearInterval(AppState.dm.timerInterval); AppState.dm.timerInterval = null; } this.togglePlayState(false); },
        setInterval: function(val) { if (isNaN(val) || val <= 0) return; AppState.dm.timerValue = val; AppState.dm.remaining = val; this.startTimer(); },
        startRotation: function() {
            var active = AppState.savedItems.filter(function(x) { return x.active; }); if (active.length === 0) { alert('Выберите GTIN!'); return; }
            AppState.dm.rotationList = active; AppState.dm.rotationIndex = 0; AppState.dm.isRotating = true;
            Controllers.Tab.switchTo('datamatrix');
            document.getElementById('start-btn').style.display = 'none'; document.getElementById('stop-btn').style.display = 'inline-flex';
            UI.updateRotationStatus(); this.generateAndDisplay(); this.startTimer();
        },
        stopRotation: function() {
            AppState.dm.isRotating = false; AppState.dm.rotationList = []; this.stopTimer();
            document.getElementById('start-btn').style.display = 'inline-flex'; document.getElementById('stop-btn').style.display = 'none';
            UI.updateRotationStatus(); this.hideCodeInfo(); this.updateBadge(false);
        },
        manualNext: function() { this.generateAndDisplay(); },
        manualPrev: function() { if (AppState.dm.isRotating && AppState.dm.rotationList.length > 0) { var l = AppState.dm.rotationList.length; AppState.dm.rotationIndex = (AppState.dm.rotationIndex - 2 + l) % l; } this.generateAndDisplay(); },
        updateCountdown: function() { var el = document.getElementById('countdown'); if (el) el.textContent = 'через ' + Math.max(0, AppState.dm.remaining).toFixed(1) + ' сек'; },
        togglePlayState: function(p) {
            var play = document.getElementById('dm-play-btn'), pause = document.getElementById('dm-pause-btn'), prev = document.getElementById('dm-prev-btn'), next = document.getElementById('dm-next-btn');
            if (p) { play.style.display = 'none'; pause.style.display = 'inline-flex'; prev.style.display = 'none'; next.style.display = 'none'; }
            else { play.style.display = 'inline-flex'; pause.style.display = 'none'; prev.style.display = 'flex'; next.style.display = 'flex'; }
        },
        showCodeInfo: function(b, t, i, total) { document.getElementById('code-info').style.display = 'block'; document.getElementById('info-barcode').textContent = b; document.getElementById('info-template').textContent = t; document.getElementById('info-counter').textContent = (i === 0 ? total : i) + '/' + total; },
        hideCodeInfo: function() { document.getElementById('code-info').style.display = 'none'; },
        updateBadge: function(r, c) { var b = document.getElementById('mode-badge'); if (r) { b.textContent = '🔄 ' + c + ' GTIN'; b.className = 'mode-badge list'; b.style.display = 'inline-block'; } else { b.className = 'mode-badge default'; b.style.display = 'none'; } }
    },
    WC: {
        addItems: function() {
            var folderName = document.getElementById('wcFolderName').value.trim(), pluRaw = document.getElementById('wcProductCode').value.trim();
            var variations = parseInt(document.getElementById('wcVariations').value) || 10;
            var modeEl = document.querySelector('input[name="weightMode"]:checked'), mode = modeEl ? modeEl.value : 'random';
            var use77 = document.getElementById('wcPrefix77').checked, use22 = document.getElementById('wcPrefix22').checked, use49 = document.getElementById('wcPrefix49').checked;
            if (!use77 && !use22 && !use49) { alert('Выберите префикс!'); return; }
            var prefixes = []; if (use77) prefixes.push('77'); if (use22) prefixes.push('22'); if (use49) prefixes.push('49');
            var pluList = pluRaw.split('\n').map(function(l) { return l.trim().replace(/\D/g, ''); }).filter(function(c) { return c.length > 0; });
            if (pluList.length === 0) { alert('Введите PLU!'); return; }
            var discModeEl = document.querySelector('input[name="discountMode"]:checked'), discMode = discModeEl ? discModeEl.value : 'fixed';
            var fixedDisc = parseInt(document.getElementById('wcDiscount').value) || 0;
            var discMin = parseInt(document.getElementById('wcDiscMin').value) || 0, discMax = parseInt(document.getElementById('wcDiscMax').value) || 0;
            if (discMin > discMax) { var tmp = discMin; discMin = discMax; discMax = tmp; }
            var weightMin = 150, weightMax = 8000, fixedWeight = 500;
            if (mode === 'fixed') fixedWeight = parseInt(document.getElementById('wcFixedWeight').value) || 500;
            else { weightMin = parseInt(document.getElementById('wcWeightMin').value) || 150; weightMax = parseInt(document.getElementById('wcWeightMax').value) || 8000; if (weightMin >= weightMax) { alert('Мин < Макс!'); return; } }
            var items = [], baseId = Date.now();
            pluList.forEach(function(plu, p) { for (var i = 0; i < variations; i++) { var w = mode === 'fixed' ? fixedWeight : Utils.randomWeight(weightMin, weightMax); var d = discMode === 'fixed' ? fixedDisc : Utils.randomWeight(discMin, discMax); prefixes.forEach(function(prefix) { var bc = Generators.generateWeightBarcode(prefix, plu, w, d); items.push({ id: baseId + '_' + p + '_' + i + '_' + prefix, code: bc.code, format: bc.format, plu: bc.plu, weight: w, prefix: prefix, active: true, discount: prefix === '49' ? d : undefined }); }); } });
            var folder;
            if (folderName) { folder = AppState.wc.folders.find(function(f) { return f.name.toLowerCase() === folderName.toLowerCase(); }); if (!folder) { folder = { id: baseId + '_f', name: folderName, items: [] }; AppState.wc.folders.push(folder); } }
            else if (AppState.wc.selectedFolderId) { folder = AppState.getWcFolder(); }
            else { folder = { id: baseId + '_f', name: (mode === 'fixed' ? 'FIX ' + fixedWeight : 'RND') + ' PLU ' + pluList[0], items: [] }; AppState.wc.folders.push(folder); }
            folder.items = folder.items.concat(items); AppState.wc.selectedFolderId = folder.id; Storage.save(); UI.renderWcFolders(); UI.renderWcItems();
            document.getElementById('wcFolderName').value = ''; document.getElementById('wcProductCode').value = ''; alert('Добавлено ' + items.length + ' шт');
        },
        startRotation: function() {
            var folder = AppState.getWcFolder(); if (!folder) { alert('Выберите папку!'); return; }
            var active = folder.items.filter(function(x) { return x.active; }); if (active.length === 0) { alert('Выберите штрихкоды!'); return; }
            AppState.wc.rotationItems = active; AppState.wc.rotationIndex = 0; AppState.wc.isRotating = true;
            document.getElementById('wc-start-btn').style.display = 'none'; document.getElementById('wc-stop-btn').style.display = 'inline-flex';
            document.getElementById('wcCarouselDisplay').style.display = 'block'; UI.updateWcStatus(); this.displayBarcode(); this.startTimer();
            setTimeout(function() { Utils.scrollToElement(document.getElementById('wcCarouselDisplay'), 100); }, 100);
        },
        stopRotation: function() { AppState.wc.isRotating = false; this.stopTimer(); document.getElementById('wc-start-btn').style.display = 'inline-flex'; document.getElementById('wc-stop-btn').style.display = 'none'; document.getElementById('wcCarouselDisplay').style.display = 'none'; UI.updateWcStatus(); },
        displayBarcode: function() {
            var items = AppState.wc.rotationItems; if (items.length === 0) return;
            var item = items[AppState.wc.rotationIndex % items.length];
            var w = (item.weight / 1000).toFixed(3) + ' кг', d = item.prefix === '49' && item.discount !== undefined ? ' | Скидка: ' + item.discount + '%' : '';
            document.getElementById('wcBarcodeInfo').innerHTML = '<b>PLU:</b> ' + item.plu + ' | <b>Вес:</b> ' + w + d;
            document.getElementById('wcBarcodeText').textContent = item.code;
            document.getElementById('wcCarouselCounter').textContent = ((AppState.wc.rotationIndex % items.length) + 1) + '/' + items.length;
            Generators.renderBarcode(document.getElementById('wcBarcodeSvg'), item.code, item.format);
            AppState.wc.rotationIndex++; AppState.addToHistory({ type: 'WC', code: item.code });
            var container = document.getElementById('wcCarouselDisplay');
            if (container) { container.classList.remove('flash'); void container.offsetWidth; container.classList.add('flash'); }
        },
        startTimer: function() { var self = this; this.stopTimer(); AppState.wc.remaining = AppState.wc.timerValue; AppState.wc.timerInterval = setInterval(function() { AppState.wc.remaining -= 0.1; if (AppState.wc.remaining <= 0.05) { self.displayBarcode(); AppState.wc.remaining = AppState.wc.timerValue; } }, 100); },
        stopTimer: function() { if (AppState.wc.timerInterval) { clearInterval(AppState.wc.timerInterval); AppState.wc.timerInterval = null; } },
        setInterval: function(val) { if (isNaN(val) || val <= 0) return; AppState.wc.timerValue = val; if (AppState.wc.isRotating) this.startTimer(); },
        selectAll: function() { var f = AppState.getWcFolder(); if (f) { f.items.forEach(function(i) { i.active = true; }); Storage.save(); UI.renderWcItems(); } },
        deselectAll: function() { var f = AppState.getWcFolder(); if (f) { f.items.forEach(function(i) { i.active = false; }); Storage.save(); UI.renderWcItems(); } },
        clearSelected: function() { var f = AppState.getWcFolder(); if (f && confirm('Удалить?')) { f.items = f.items.filter(function(x) { return !x.active; }); Storage.save(); UI.renderWcItems(); } },
        deleteFolder: function() { var f = AppState.getWcFolder(); if (f && confirm('Удалить папку?')) { AppState.wc.folders = AppState.wc.folders.filter(function(x) { return x.id !== f.id; }); AppState.wc.selectedFolderId = null; Storage.save(); UI.renderWcFolders(); UI.renderWcItems(); this.stopRotation(); } },
        renameFolder: function() { var f = AppState.getWcFolder(); if (f) { var n = prompt('Имя:', f.name); if (n && n.trim()) { f.name = n.trim(); Storage.save(); UI.renderWcFolders(); } } }
    },
    SG: {
        openFolder: function(id) { AppState.sg.selectedFolderId = id; AppState.sg.carouselIndex = 0; var folder = AppState.getSgFolder(); if (!folder) return; document.getElementById('sg-view-list').style.display = 'none'; document.getElementById('sg-view-carousel').style.display = 'block'; document.getElementById('sgActiveFolderName').textContent = folder.name; UI.renderSgCarousel(); },
        closeFolder: function() { AppState.sg.selectedFolderId = null; document.getElementById('sg-view-carousel').style.display = 'none'; document.getElementById('sg-view-list').style.display = 'block'; UI.renderSgFolders(); },
        next: function() { var f = AppState.getSgFolder(); if (f && f.items.length > 0) { AppState.sg.carouselIndex = (AppState.sg.carouselIndex + 1) % f.items.length; UI.renderSgCarousel(); } },
        prev: function() { var f = AppState.getSgFolder(); if (f && f.items.length > 0) { AppState.sg.carouselIndex = (AppState.sg.carouselIndex - 1 + f.items.length) % f.items.length; UI.renderSgCarousel(); } },
        deleteItem: function() { var f = AppState.getSgFolder(); if (f && f.items.length > 0 && confirm('Удалить?')) { f.items.splice(AppState.sg.carouselIndex, 1); if (AppState.sg.carouselIndex >= f.items.length) AppState.sg.carouselIndex = Math.max(0, f.items.length - 1); Storage.save(); UI.renderSgCarousel(); } },
        deleteFolder: function() { if (confirm('Удалить папку?')) { AppState.sg.folders = AppState.sg.folders.filter(function(f) { return f.id !== AppState.sg.selectedFolderId; }); Storage.save(); this.closeFolder(); } },
        renameFolder: function() { var f = AppState.getSgFolder(); if (f) { var n = prompt('Имя:', f.name); if (n && n.trim()) { f.name = n.trim(); Storage.save(); document.getElementById('sgActiveFolderName').textContent = f.name; } } },
        // FIX: Новая функция редактирования названия баркода
        renameItem: function() {
            var f = AppState.getSgFolder();
            if (f && f.items.length > 0) {
                var item = f.items[AppState.sg.carouselIndex];
                var newName = prompt('Новое название:', item.name);
                if (newName !== null && newName.trim()) {
                    item.name = newName.trim();
                    Storage.save();
                    UI.renderSgCarousel();
                }
            }
        },
        toggleFolderMode: function(force) { var sel = document.getElementById('sgFolderSelect'), inp = document.getElementById('sgFolderInput'), btn = document.getElementById('sgFolderModeBtn'); var isNew = force !== undefined ? force : !AppState.sg.isNewFolderMode; AppState.sg.isNewFolderMode = isNew; if (isNew) { sel.classList.add('d-none'); inp.classList.remove('d-none'); inp.focus(); btn.textContent = '☰'; btn.classList.remove('btn-purple'); btn.classList.add('btn-secondary'); } else { sel.classList.remove('d-none'); inp.classList.add('d-none'); btn.textContent = '＋'; btn.classList.remove('btn-secondary'); btn.classList.add('btn-purple'); } },
        save: function() {
            var val = document.getElementById('sgValue').value.trim(), type = document.getElementById('sgType').value, name = document.getElementById('sgName').value.trim() || 'Без названия';
            var folderName = AppState.sg.isNewFolderMode || AppState.sg.folders.length === 0 ? document.getElementById('sgFolderInput').value.trim() : document.getElementById('sgFolderSelect').value;
            if (!val) { alert('Введите значение!'); return; } if (!folderName) { alert('Укажите папку!'); return; }
            var result = Generators.generateSimple(val, type);
            var folder = AppState.sg.folders.find(function(f) { return f.name.toLowerCase() === folderName.toLowerCase(); });
            if (!folder) { folder = { id: 'sgf_' + Date.now(), name: folderName, items: [] }; AppState.sg.folders.push(folder); }
            folder.items.push({ id: 'sgi_' + Date.now(), code: result.code, type: type, name: name }); Storage.save(); UI.renderSgFolders();
            document.getElementById('sgValue').value = ''; document.getElementById('sgName').value = ''; document.getElementById('sgSvg').style.display = 'none';
            if (AppState.sg.isNewFolderMode) { document.getElementById('sgFolderInput').value = ''; this.toggleFolderMode(false); setTimeout(function() { document.getElementById('sgFolderSelect').value = folder.name; }, 50); }
            alert('Сохранено: ' + folder.name);
        },
        updatePreview: function() { var type = document.getElementById('sgType').value, val = document.getElementById('sgValue').value.trim(), svg = document.getElementById('sgSvg'); if (!val) { svg.style.display = 'none'; return; } var result = Generators.generateSimple(val, type); svg.style.display = 'block'; Generators.renderBarcode(svg, result.code, result.format); }
    },
    Barcode: {
        generate: function() {
            var type = document.getElementById('barcodeType').value, cfg = Generators.barcodeConfigs[type]; if (!cfg) return;
            cfg.fields.forEach(function(f) { var e = document.getElementById(f.name + '-error'); if (e) e.textContent = ''; });
            var code = cfg.prefix, hasError = false;
            cfg.fields.forEach(function(f) { var el = document.getElementById(f.name), v = el ? el.value.replace(/\D/g, '') : ''; if (v.length > f.length) { document.getElementById(f.name + '-error').textContent = 'Макс ' + f.length; hasError = true; } code += Utils.padZeros(v, f.length); });
            if (hasError) return;
            var ctrl; if (cfg.fixedControl !== undefined) ctrl = cfg.fixedControl; else if (type === 'ean13_weight') ctrl = Utils.calcControlEAN13(code).toString(); else ctrl = Utils.calcControlCore(code).toString();
            if (document.getElementById('simulateError').checked && cfg.fixedControl === undefined) { var bad = Math.floor(Math.random() * 10).toString(); while (bad === ctrl) bad = Math.floor(Math.random() * 10).toString(); ctrl = bad; }
            code += ctrl; document.getElementById('barcodeResult').style.display = 'block'; document.getElementById('barcodeText').textContent = code;
            Generators.renderBarcode(document.getElementById('barcodeSvg'), code, cfg.format); AppState.addToHistory({ type: 'BC', code: code });
        }
    },
    Tab: {
        current: 'datamatrix',
        switchTo: function(name) {
            document.querySelectorAll('.tab-btn').forEach(function(t) { t.classList.remove('active'); });
            document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
            var btn = document.querySelector('.tab-btn[data-tab="' + name + '"]'), tab = document.getElementById('tab-' + name);
            if (btn) btn.classList.add('active'); if (tab) tab.classList.add('active');
            if (this.current === 'datamatrix') Controllers.DM.stopTimer();
            if (this.current === 'weightcarousel' && AppState.wc.isRotating) Controllers.WC.stopRotation();
            if (name === 'datamatrix') { Controllers.DM.generateAndDisplay(); Controllers.DM.startTimer(); }
            if (name === 'library') { UI.renderSavedList(); UI.renderHistory(); }
            if (name === 'barcode') UI.renderBarcodeFields();
            if (name === 'weightcarousel') { UI.renderWcFolders(); UI.renderWcItems(); }
            if (name === 'simplegen') { UI.renderSgFolders(); Controllers.SG.closeFolder(); }
            this.current = name;
        }
    },
    Library: {
        addBarcodes: function() {
            var val = document.getElementById('barcode-input').value; if (!val.trim()) return;
            var items = val.split('\n').map(function(line, i) { var bc = line.trim().replace(/\D/g, ''); if (bc.length >= 8) return { id: Date.now() + '_' + i, barcode: bc, template: AppState.dm.selectedTemplate, active: true }; return null; }).filter(function(x) { return x; });
            if (items.length > 0) { AppState.savedItems = AppState.savedItems.concat(items); Storage.save(); UI.renderSavedList(); document.getElementById('barcode-input').value = ''; alert('Добавлено: ' + items.length); }
            else alert('Нет валидных кодов');
        }
    }
};

function init() {
    Storage.load();
    document.querySelectorAll('.tab-btn[data-tab]').forEach(function(btn) { btn.onclick = function() { Controllers.Tab.switchTo(btn.dataset.tab); }; });
    document.getElementById('dm-prev-btn').onclick = function() { Controllers.DM.manualPrev(); };
    document.getElementById('dm-next-btn').onclick = function() { Controllers.DM.manualNext(); };
    document.getElementById('dm-pause-btn').onclick = function() { Controllers.DM.stopTimer(); };
    document.getElementById('dm-play-btn').onclick = function() { Controllers.DM.startTimer(); };
    document.getElementById('refresh-btn').onclick = function() { Controllers.DM.generateAndDisplay(); Controllers.DM.startTimer(); };
    document.querySelectorAll('.interval-btn').forEach(function(btn) { btn.onclick = function() { document.getElementById('dm-custom-interval').value = btn.dataset.interval; Controllers.DM.setInterval(parseFloat(btn.dataset.interval)); document.querySelectorAll('.interval-btn').forEach(function(b) { b.classList.remove('active'); }); btn.classList.add('active'); }; });
    document.getElementById('dm-custom-interval').onchange = function(e) { Controllers.DM.setInterval(parseFloat(e.target.value)); };
    document.getElementById('add-btn').onclick = function() { Controllers.Library.addBarcodes(); };
    document.getElementById('clear-input-btn').onclick = function() { document.getElementById('barcode-input').value = ''; };
    document.getElementById('select-all-btn').onclick = function() { AppState.savedItems.forEach(function(i) { i.active = true; }); Storage.save(); UI.renderSavedList(); };
    document.getElementById('deselect-all-btn').onclick = function() { AppState.savedItems.forEach(function(i) { i.active = false; }); Storage.save(); UI.renderSavedList(); };
    document.getElementById('clear-all-btn').onclick = function() { if (confirm('Удалить всё?')) { AppState.savedItems = []; Storage.save(); UI.renderSavedList(); Controllers.DM.stopRotation(); } };
    document.getElementById('start-btn').onclick = function() { Controllers.DM.startRotation(); };
    document.getElementById('stop-btn').onclick = function() { Controllers.DM.stopRotation(); };
    document.querySelectorAll('.tmpl-btn').forEach(function(btn) { btn.onclick = function() { document.querySelectorAll('.tmpl-btn').forEach(function(b) { b.classList.remove('active'); }); btn.classList.add('active'); AppState.dm.selectedTemplate = btn.dataset.template; }; });
    document.getElementById('exportDataBtn').onclick = function() { Storage.exportData(); };
    document.getElementById('importDataBtn').onclick = function() { document.getElementById('importFile').click(); };
    document.getElementById('importFile').onchange = function(e) { if (e.target.files[0]) Storage.importData(e.target.files[0]); e.target.value = ''; };
    document.getElementById('clearHistoryBtn').onclick = function() { if (confirm('Очистить?')) AppState.clearHistory(); };
    document.getElementById('barcodeType').onchange = function() { UI.renderBarcodeFields(); };
    document.getElementById('generateBarcodeBtn').onclick = function() { Controllers.Barcode.generate(); };
    document.getElementById('sgValue').oninput = function() { Controllers.SG.updatePreview(); };
    document.getElementById('sgType').onchange = function() { Controllers.SG.updatePreview(); };
    document.getElementById('sgAddBtn').onclick = function() { Controllers.SG.save(); };
    document.getElementById('sgFolderModeBtn').onclick = function() { Controllers.SG.toggleFolderMode(); };
    document.getElementById('sgBackBtn').onclick = function() { Controllers.SG.closeFolder(); };
    document.getElementById('sgNextBtn').onclick = function() { Controllers.SG.next(); };
    document.getElementById('sgPrevBtn').onclick = function() { Controllers.SG.prev(); };
    document.getElementById('sgRenameFolderBtn').onclick = function() { Controllers.SG.renameFolder(); };
    document.getElementById('sgDeleteFolderBtn').onclick = function() { Controllers.SG.deleteFolder(); };
    document.getElementById('sgDeleteItemBtn').onclick = function() { Controllers.SG.deleteItem(); };
    // FIX: Обработчик для редактирования названия баркода
    document.getElementById('sgEditNameBtn').onclick = function() { Controllers.SG.renameItem(); };
    document.getElementById('wcAddToCarousel').onclick = function() { Controllers.WC.addItems(); };
    document.getElementById('wc-select-all').onclick = function() { Controllers.WC.selectAll(); };
    document.getElementById('wc-deselect-all').onclick = function() { Controllers.WC.deselectAll(); };
    document.getElementById('wc-clear-selected').onclick = function() { Controllers.WC.clearSelected(); };
    document.getElementById('wc-start-btn').onclick = function() { Controllers.WC.startRotation(); };
    document.getElementById('wc-stop-btn').onclick = function() { Controllers.WC.stopRotation(); };
    document.getElementById('wc-run-folder').onclick = function() { if (AppState.getWcFolder()) Controllers.WC.startRotation(); else alert('Выберите папку'); };
    document.getElementById('wc-rename-folder').onclick = function() { Controllers.WC.renameFolder(); };
    document.getElementById('wc-delete-folder').onclick = function() { Controllers.WC.deleteFolder(); };
    document.querySelectorAll('.wc-interval-btn').forEach(function(btn) { btn.onclick = function() { document.getElementById('wc-custom-interval').value = btn.dataset.interval; Controllers.WC.setInterval(parseFloat(btn.dataset.interval)); document.querySelectorAll('.wc-interval-btn').forEach(function(b) { b.classList.remove('active'); }); btn.classList.add('active'); }; });
    document.getElementById('wc-custom-interval').onchange = function(e) { Controllers.WC.setInterval(parseFloat(e.target.value)); };
    document.querySelectorAll('input[name="weightMode"]').forEach(function(r) { r.onchange = function() { var m = document.querySelector('input[name="weightMode"]:checked'); var mode = m ? m.value : 'random'; document.getElementById('group-random-weight').classList.toggle('d-none', mode === 'fixed'); document.getElementById('group-fixed-weight').classList.toggle('d-none', mode !== 'fixed'); document.getElementById('wcVariationsLabel').textContent = mode === 'fixed' ? 'Повторов' : 'Вариаций'; document.getElementById('wcVariationsHint').textContent = mode === 'fixed' ? 'Повторов на PLU' : 'Весов на PLU'; }; });
    document.querySelectorAll('input[name="discountMode"]').forEach(function(r) { r.onchange = function() { var m = document.querySelector('input[name="discountMode"]:checked'); var mode = m ? m.value : 'fixed'; document.getElementById('disc-fixed-group').classList.toggle('d-none', mode !== 'fixed'); document.getElementById('disc-random-group').classList.toggle('d-none', mode === 'fixed'); }; });
    document.getElementById('wcPrefix49').onchange = function() { document.getElementById('group-discount-section').classList.toggle('d-none', !document.getElementById('wcPrefix49').checked); };
    document.onkeydown = function(e) { var dm = document.getElementById('tab-datamatrix'); if (dm && dm.classList.contains('active') && !AppState.dm.timerInterval) { if (e.key === 'ArrowLeft') Controllers.DM.manualPrev(); if (e.key === 'ArrowRight') Controllers.DM.manualNext(); } };
    document.onvisibilitychange = function() { if (document.hidden) { Controllers.DM.stopTimer(); Controllers.WC.stopTimer(); } else { if (Controllers.Tab.current === 'datamatrix') { Controllers.DM.generateAndDisplay(); Controllers.DM.startTimer(); } if (AppState.wc.isRotating) { Controllers.WC.displayBarcode(); Controllers.WC.startTimer(); } } };
    UI.renderSavedList(); UI.renderBarcodeFields(); UI.renderWcFolders(); UI.renderWcItems(); UI.renderSgFolders(); UI.renderHistory();
    setTimeout(function() { Controllers.DM.generateAndDisplay(); Controllers.DM.startTimer(); }, 300);
    console.log('[Generator v2.2] Ready');
}

if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(init, 50);
else document.addEventListener('DOMContentLoaded', init);
})();
