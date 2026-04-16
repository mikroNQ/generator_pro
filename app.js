(function(){
'use strict';

// Реальные GTIN коды для демо-режима (вместо случайных)
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
var demoGtinIndex = 0;

var AppState = {
    STORAGE_KEY: 'barcode_gen_v5',
    dm: { timerValue: 0.7, remaining: 0.7, timerInterval: null, isRotating: false, rotationList: [], rotationIndex: 0, selectedTemplate: 'type1', generatedCodes: [], codeHistoryIndex: -1, folders: [], selectedFolderId: null, isNewFolderMode: false },
    savedItems: [],
    wc: { folders: [], selectedFolderId: null, timerValue: 0.7, remaining: 0.7, timerInterval: null, isRotating: false, rotationIndex: 0, rotationItems: [] },
    sg: { folders: [], selectedFolderId: null, carouselIndex: 0, isNewFolderMode: false },
    gs1: { folders: [], selectedFolderId: null, timerValue: 0.7, remaining: 0.7, timerInterval: null, isRotating: false, rotationIndex: 0, rotationItems: [] },
    history: { items: [], maxItems: 50 },

    getDmFolder: function(id) {
        var fid = id || this.dm.selectedFolderId;
        for (var i = 0; i < this.dm.folders.length; i++) if (this.dm.folders[i].id === fid) return this.dm.folders[i];
        return null;
    },
    getDmFolderItems: function() { var f = this.getDmFolder(); return f ? f.items : []; },
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
    getGs1Folder: function(id) {
        var fid = id || this.gs1.selectedFolderId;
        for (var i = 0; i < this.gs1.folders.length; i++) if (this.gs1.folders[i].id === fid) return this.gs1.folders[i];
        return null;
    },
    getGs1FolderItems: function() { var f = this.getGs1Folder(); return f ? f.items : []; },
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
            if (data) { var p = JSON.parse(data); AppState.savedItems = p.savedItems || []; AppState.dm.folders = p.dmFolders || []; AppState.wc.folders = p.wcFolders || []; AppState.sg.folders = p.sgFolders || []; AppState.gs1.folders = p.gs1Folders || []; AppState.history.items = p.history || []; }
            // Миграция старых данных в папку "Без папки"
            if (AppState.savedItems.length > 0 && AppState.dm.folders.length === 0) {
                AppState.dm.folders.push({ id: 'dmf_legacy', name: 'Импортированные', items: AppState.savedItems.slice() });
                AppState.savedItems = [];
                this.save();
            }
        } catch (e) { console.error('Load error:', e); }
    },
    save: function() {
        try { localStorage.setItem(AppState.STORAGE_KEY, JSON.stringify({ savedItems: AppState.savedItems, dmFolders: AppState.dm.folders, wcFolders: AppState.wc.folders, sgFolders: AppState.sg.folders, gs1Folders: AppState.gs1.folders, history: AppState.history.items })); }
        catch (e) { console.error('Save error:', e); }
    },
    exportData: function() {
        var blob = new Blob([JSON.stringify({ savedItems: AppState.savedItems, dmFolders: AppState.dm.folders, wcFolders: AppState.wc.folders, sgFolders: AppState.sg.folders, gs1Folders: AppState.gs1.folders, history: AppState.history.items }, null, 2)], {type: 'application/json'});
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup_' + new Date().toISOString().slice(0,10) + '.json'; a.click();
    },
    importData: function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try { var d = JSON.parse(e.target.result); if (confirm('Заменить данные?')) { AppState.savedItems = d.savedItems || []; AppState.dm.folders = d.dmFolders || []; AppState.wc.folders = d.wcFolders || []; AppState.sg.folders = d.sgFolders || []; AppState.gs1.folders = d.gs1Folders || []; AppState.history.items = d.history || []; Storage.save(); location.reload(); } }
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
    formatWeight: function(g) { var n = Number(g) || 0; return n >= 1000 ? (n / 1000).toFixed(3) + ' кг' : n + ' г'; },
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
        type1: { name: 'Тип 1', generate: function(b) { var gs = String.fromCharCode(29), g = Utils.padBarcode(b); return '01' + g + '21' + Utils.generateSerial('0', 7) + gs + '93' + Utils.randomBase64(4).substring(0, 4); } },
        type2: { name: 'Тип 2', generate: function(b) { var gs = String.fromCharCode(29), g = Utils.padBarcode(b); return '01' + g + '21' + Utils.generateSerial('5', 13) + gs + '91' + Utils.randomHex(4) + gs + '92' + Utils.randomBase64(44); } }
    },
    barcodeConfigs: {
        code128_19_piece: { prefix: "47", fields: [{ name: "productCode", label: "Код товара (9)", length: 9 }, { name: "discount", label: "Скидка (2)", length: 2 }, { name: "quantity", label: "Кол-во (5)", length: 5 }], format: 'CODE128' },
        code128_19_weight: { prefix: "49", fields: [{ name: "productCode", label: "Код товара (9)", length: 9 }, { name: "discount", label: "Скидка (2)", length: 2 }, { name: "weight", label: "Вес (5)", length: 5 }], format: 'CODE128' },
        code128_19_price: { prefix: "44", fields: [{ name: "productCode", label: "Код товара (9)", length: 9 }, { name: "price", label: "Цена (7)", length: 7 }], format: 'CODE128' },
        code128_16_cas: { prefix: "77", fields: [{ name: "productCode", label: "Код товара (6)", length: 6 }, { name: "weight", label: "Вес (7)", length: 7 }], format: 'CODE128', fixedControl: '0' },
        ean13_weight: { prefix: "22", fields: [{ name: "productCode", label: "Код товара (5)", length: 5 }, { name: "weight", label: "Вес (5)", length: 5 }], format: 'EAN13' }
    },
    generateDM: function(b, t) {
        var tmpl = this.templates[t || AppState.dm.selectedTemplate];
        var barcode = b;
        if (!barcode) {
            // Используем реальные GTIN из списка вместо случайных цифр
            barcode = DEMO_GTINS[demoGtinIndex];
            demoGtinIndex = (demoGtinIndex + 1) % DEMO_GTINS.length;
        }
        var code = tmpl.generate(barcode);
        AppState.addToHistory({ type: 'DM', code: code });
        return { code: code, templateName: tmpl.name, barcode: barcode };
    },
    renderDM: function(c, code) { if (!c) return; c.innerHTML = ''; try { var canvas = document.createElement('canvas'); bwipjs.toCanvas(canvas, { bcid: 'datamatrix', text: code, scale: 4, padding: 2 }); c.appendChild(canvas); } catch (e) { c.innerHTML = '<div style="color:red">Ошибка</div>'; } },
    generateWeightBarcode: function(prefix, plu, weight, disc) {
        var code, ctrl, fmt;
        if (prefix === '77') { code = '77' + Utils.padZeros(plu, 6) + Utils.padZeros(weight, 7); ctrl = '0'; fmt = 'CODE128'; }
        else if (prefix === '49') { code = '49' + Utils.padZeros(plu, 9) + Utils.padZeros(disc || 0, 2) + Utils.padZeros(weight, 5); ctrl = Utils.calcControlCore(code).toString(); fmt = 'CODE128'; }
        else { code = '22' + Utils.padZeros(plu, 5) + Utils.padZeros(weight, 5); ctrl = Utils.calcControlEAN13(code).toString(); fmt = 'EAN13'; }
        return { code: code + ctrl, format: fmt, weight: weight, plu: plu, prefix: prefix, discount: disc };
    },
    renderBarcode: function(svg, code, fmt) { if (!svg) return; svg.innerHTML = ''; try { JsBarcode(svg, code, { format: fmt || 'CODE128', height: 70, displayValue: true, fontSize: 14, margin: 10, width: 2 }); } catch (e) { try { JsBarcode(svg, code, { format: 'CODE128', height: 70, displayValue: true, width: 2 }); } catch(err) {} } },
    generateSimple: function(v, t) { var code = v.trim(); if (t === 'EAN13' && code.length === 12 && /^\d+$/.test(code)) code += Utils.calcControlEAN13(code); return { code: code, format: t }; },
    generateUniqueId: function() { var c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',s=''; for(var i=0;i<8;i++) s+=c.charAt(Math.floor(Math.random()*c.length)); return s; },
    calculateDecimalPosition: function(q) { var s=q.toString(),d=s.indexOf('.'); return d===-1?0:s.length-d-1; },
    extractEAN13FromDM: function(dmCode) { var m=dmCode.match(/01(\d{14})/); if(!m) return null; var e=m[1].substring(1,13); return e+Utils.calcControlEAN13(e); },
    breakDataMatrix: function(code, method) {
        if (!code) return code;
        var m = method||'removeChars';
        if (m==='random') { var ms=['removeChars','wrongChecksum','replaceGS','addJunk']; m=ms[Math.floor(Math.random()*ms.length)]; }
        if (m==='removeChars') { var rc=Math.floor(Math.random()*6)+5,pos=Math.floor(Math.random()*Math.max(0,code.length-rc)); return code.slice(0,pos)+code.slice(pos+rc); }
        if (m==='wrongChecksum') { if(code.indexOf('01')===0&&code.length>=16){var g=code.substring(2,16),cg=''; for(var k=0;k<g.length;k++){if(Math.random()<0.3&&/\d/.test(g[k])){cg+=(parseInt(g[k])+Math.floor(Math.random()*9)+1)%10;}else{cg+=g[k];}} return '01'+cg+code.slice(16);} var bc=''; for(var i=0;i<code.length;i++){bc+=(/\d/.test(code[i])&&Math.random()<0.2)?((parseInt(code[i])+5)%10):code[i];} return bc; }
        if (m==='replaceGS') { return code.replace(//g,'|||'); }
        if (m==='addJunk') { var jc='XYZQW!@#$%&*',jk='',jn=Math.floor(Math.random()*6)+10; for(var j=0;j<jn;j++) jk+=jc.charAt(Math.floor(Math.random()*jc.length)); var ip=Math.floor(Math.random()*code.length); return code.slice(0,ip)+jk+code.slice(ip); }
        return code;
    },
    generateGS1Code: function(params) {
        var GS=String.fromCharCode(29),PREFIX='99MPUC',AI_GOODS_ID='240',AI_QTY='37',AI_WEIGHT='3103',AI_DISC='98',AI_UID='21',AI_DEC='97';
        var code=PREFIX+GS;
        var gid=(params.goodsId||'').replace(/\D/g,'').substring(0,8);
        if(!gid) throw new Error('GoodsId required');
        code+=AI_GOODS_ID+gid+GS;
        if(params.type==='piece'){
            var qty=params.quantity||0,dp=params.decimalPosition!==undefined?params.decimalPosition:this.calculateDecimalPosition(qty);
            var qr=Math.round(qty*Math.pow(10,dp));
            code+=AI_QTY+Utils.padZeros(qr,8)+GS;
            if(params.discount>0){code+=AI_DISC+Utils.padZeros(params.discount,2)+GS;code+=AI_UID+(params.uniqueId||this.generateUniqueId())+GS;}
            if(dp>0) code+=AI_DEC+dp+GS;
        } else if(params.type==='weight'){
            code+=AI_WEIGHT+Utils.padZeros(params.weight||0,6)+GS;
            if(params.discount>0){code+=AI_DISC+Utils.padZeros(params.discount,2)+GS;code+=AI_UID+(params.uniqueId||this.generateUniqueId())+GS;}
        } else { throw new Error('Invalid type'); }
        return code;
    },
    renderGS1QR: function(container, code) {
        if(!container) return;
        container.innerHTML='';
        try { var canvas=document.createElement('canvas'); bwipjs.toCanvas(canvas,{bcid:'qrcode',text:code,scale:3,eclevel:'M'}); container.appendChild(canvas); }
        catch(e) { container.innerHTML='<div style="color:red">Ошибка QR</div>'; }
    }
};

var UI = {
    renderDmFolders: function() {
        var c = document.getElementById('dmFolderList'); if (!c) return;
        if (AppState.dm.folders.length === 0) { c.innerHTML = '<div class="empty-state">Нет папок</div>'; }
        else {
            var f = document.createDocumentFragment();
            AppState.dm.folders.forEach(function(folder) {
                var d = document.createElement('div'); d.className = 'folder-item' + (folder.id === AppState.dm.selectedFolderId ? ' selected' : '');
                var activeCount = folder.items.filter(function(x) { return x.active; }).length;
                d.innerHTML = '<div>📁</div><div style="flex:1"><b>' + Utils.escapeHtml(folder.name) + '</b><div style="font-size:.8em;color:#666">' + folder.items.length + ' шт' + (activeCount > 0 ? ' (' + activeCount + ' ✓)' : '') + '</div></div>';
                d.onclick = function() { AppState.dm.selectedFolderId = folder.id; UI.renderDmFolders(); UI.renderDmItems(); };
                f.appendChild(d);
            });
            c.innerHTML = ''; c.appendChild(f);
        }
        var nameEl = document.getElementById('dm-current-folder-name'), folder = AppState.getDmFolder();
        if (nameEl) nameEl.innerHTML = folder ? '<span class="current-folder-badge">📁 ' + Utils.escapeHtml(folder.name) + '</span>' : '';
        // Обновляем селектор папок
        var sel = document.getElementById('dmFolderSelect');
        if (sel) {
            if (AppState.dm.folders.length === 0) { sel.innerHTML = '<option disabled selected>Нет папок</option>'; }
            else { sel.innerHTML = AppState.dm.folders.map(function(f) { return '<option value="' + Utils.escapeHtml(f.name) + '">' + Utils.escapeHtml(f.name) + '</option>'; }).join(''); }
        }
    },
    renderDmItems: function() {
        var c = document.getElementById('dmItemsList'), items = AppState.getDmFolderItems();
        var countEl = document.getElementById('dm-items-count');
        if (countEl) countEl.textContent = items.length;
        if (!c) return;
        if (items.length === 0) { c.innerHTML = '<div class="empty-state">Выберите папку или добавьте GTIN</div>'; }
        else {
            var f = document.createDocumentFragment();
            items.forEach(function(item) {
                var d = document.createElement('div'); d.className = 'saved-item' + (item.active ? ' active' : '');
                var tmpl = Generators.templates[item.template] || Generators.templates.type1;
                d.innerHTML = '<div class="info"><div class="barcode">' + Utils.escapeHtml(item.barcode) + '</div><div style="font-size:.8em;color:#666">' + tmpl.name + '</div></div><div style="display:flex;gap:8px"><button class="btn btn-sm ' + (item.active ? 'btn-success' : 'btn-outline') + '" data-action="toggle">' + (item.active ? '✓' : '○') + '</button><button class="btn btn-sm btn-danger" data-action="delete">✕</button></div>';
                d.querySelector('[data-action="toggle"]').onclick = function() { item.active = !item.active; Storage.save(); UI.renderDmItems(); UI.renderDmFolders(); };
                d.querySelector('[data-action="delete"]').onclick = function() { var fl = AppState.getDmFolder(); if (fl) { fl.items = fl.items.filter(function(x) { return x.id !== item.id; }); Storage.save(); UI.renderDmItems(); UI.renderDmFolders(); } };
                f.appendChild(d);
            });
            c.innerHTML = ''; c.appendChild(f);
        }
        this.updateRotationStatus();
    },
    renderSavedList: function() { this.renderDmFolders(); this.renderDmItems(); },
    updateRotationStatus: function() {
        var el = document.getElementById('rotation-status'), folder = AppState.getDmFolder();
        var active = folder ? folder.items.filter(function(x) { return x.active; }) : [];
        var startBtn = document.getElementById('start-btn'), stopBtn = document.getElementById('stop-btn');
        if (AppState.dm.isRotating) {
            if (el) el.textContent = '🔄 Ротация: ' + AppState.dm.rotationList.length + ' GTIN';
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-flex';
        } else if (active.length > 0) {
            if (el) el.textContent = '✓ ' + active.length + ' выбрано — готово к запуску';
            if (startBtn) startBtn.style.display = 'inline-flex';
            // Показываем кнопку Стоп если идёт просмотр сгенерированных кодов
            if (stopBtn) stopBtn.style.display = AppState.dm.generatedCodes.length > 0 ? 'inline-flex' : 'none';
        } else if (folder) {
            if (el) el.textContent = 'Выберите GTIN для ротации';
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'none';
        } else {
            if (el) el.textContent = 'Создайте папку';
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'none';
        }
        var ctrl = document.getElementById('rotation-controls');
        if (ctrl) ctrl.className = 'rotation-controls' + (AppState.dm.isRotating ? ' active' : '');
        var countEl = document.getElementById('selected-count');
        if (countEl) countEl.textContent = active.length;
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
    renderGs1Folders: function() {
        var c=document.getElementById('gs1FolderList'); if(!c) return;
        if(AppState.gs1.folders.length===0){c.innerHTML='<div class="empty-state">Нет папок</div>';}
        else {
            var frag=document.createDocumentFragment();
            AppState.gs1.folders.forEach(function(folder){
                var d=document.createElement('div'); d.className='folder-item'+(folder.id===AppState.gs1.selectedFolderId?' selected':'');
                d.innerHTML='<div>📦</div><div style="flex:1"><b>'+Utils.escapeHtml(folder.name)+'</b><div style="font-size:.8em;color:#666">'+folder.items.length+' шт</div></div>';
                d.onclick=function(){AppState.gs1.selectedFolderId=folder.id;UI.renderGs1Folders();UI.renderGs1Items();};
                frag.appendChild(d);
            });
            c.innerHTML=''; c.appendChild(frag);
        }
        var nameEl=document.getElementById('gs1-current-folder-name'),folder=AppState.getGs1Folder();
        if(nameEl) nameEl.innerHTML=folder?'<span class="current-folder-badge">📦 '+Utils.escapeHtml(folder.name)+'</span>':'';
    },
    renderGs1Items: function() {
        var c=document.getElementById('gs1ItemsList'),items=AppState.getGs1FolderItems(),cnt=document.getElementById('gs1-items-count');
        if(cnt) cnt.textContent=items.length; if(!c) return;
        if(items.length===0){c.innerHTML='<div class="empty-state">Выберите папку</div>';}
        else {
            var frag=document.createDocumentFragment();
            items.forEach(function(item){
                var d=document.createElement('div'); d.className='weight-item'+(item.active?' active':'');
                var tl=item.type==='piece'?'Штучн':'Весов';
                var vt=item.type==='piece'?(item.quantity+' шт'):Utils.formatWeight(item.weight);
                var dt=item.discount>0?' | '+item.discount+'%':'';
                var sc=item.code.substring(0,25)+'...';
                d.innerHTML='<div class="info"><div class="code" style="font-size:.7em">'+sc+'</div><div style="font-size:.8em;color:#666">ID: '+item.goodsId+' | '+vt+' | '+tl+dt+'</div></div>'
                    +'<div style="display:flex;gap:8px"><button class="btn btn-sm '+(item.active?'btn-success':'btn-outline')+'" data-action="toggle">'+(item.active?'✓':'○')+'</button>'
                    +'<button class="btn btn-sm btn-danger" data-action="delete">✕</button></div>';
                d.querySelector('[data-action="toggle"]').onclick=function(){item.active=!item.active;Storage.save();UI.renderGs1Items();};
                d.querySelector('[data-action="delete"]').onclick=function(){var fl=AppState.getGs1Folder();if(fl){fl.items=fl.items.filter(function(x){return x.id!==item.id;});Storage.save();UI.renderGs1Items();}};
                frag.appendChild(d);
            });
            c.innerHTML=''; c.appendChild(frag);
        }
        this.updateGs1Status();
    },
    updateGs1Status: function() {
        var el=document.getElementById('gs1-rotation-status'); if(!el) return;
        var folder=AppState.getGs1Folder();
        if(!folder){el.textContent='Создайте папку';return;}
        var active=folder.items.filter(function(x){return x.active;});
        el.innerHTML=AppState.gs1.isRotating?'🔄 Ротация: '+active.length+' кодов':'Выбрано: <b>'+active.length+'</b> из '+folder.items.length;
        var ctrl=document.getElementById('gs1-rotation-controls');
        if(ctrl) ctrl.className='rotation-controls'+(AppState.gs1.isRotating?' active':'');
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
                var displayCode = item.code && item.code.length > 30 ? item.code.substring(0, 30) + '...' : (item.code || '-');
                d.innerHTML = '<span class="history-time">' + time + '</span><span class="history-type">' + (item.type || '?') + '</span><span class="history-code">' + Utils.escapeHtml(displayCode) + '</span>';
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
            var doubleScanMode = null;
            var dsIds = ['doubleScanSameDM','doubleScanDmEan','doubleScanSameEan','doubleScanDifferentDM'];
            var dsModes = ['sameDM','dmEan','sameEan','differentDM'];
            for (var di=0; di<dsIds.length; di++) { var dsCb=document.getElementById(dsIds[di]); if(dsCb&&dsCb.checked){doubleScanMode=dsModes[di];break;} }
            if (dm.isRotating && dm.rotationList.length > 0) {
                var item = dm.rotationList[dm.rotationIndex]; barcode = item.barcode;
                result = Generators.generateDM(barcode, item.template);
                var currentRotationIdx = dm.rotationIndex;
                dm.generatedCodes.push({ code: result.code, barcode: barcode, templateName: result.templateName, rotationIdx: currentRotationIdx });
                dm.codeHistoryIndex = dm.generatedCodes.length - 1;
                dm.rotationIndex = (dm.rotationIndex + 1) % dm.rotationList.length;
                this.showCodeInfo(barcode, result.templateName, currentRotationIdx + 1, dm.rotationList.length);
                this.updateBadge(true, dm.rotationList.length);
            } else {
                result = Generators.generateDM();
                dm.generatedCodes.push({ code: result.code, barcode: result.barcode, templateName: result.templateName, rotationIdx: dm.generatedCodes.length });
                dm.codeHistoryIndex = dm.generatedCodes.length - 1;
                this.showCodeInfo(result.barcode, result.templateName, dm.codeHistoryIndex + 1, DEMO_GTINS.length);
                this.updateBadge(true, DEMO_GTINS.length);
            }
            // Broken DataMatrix
            var brokenCb = document.getElementById('brokenDataMatrix');
            if (brokenCb && brokenCb.checked) {
                var methodRadios = document.getElementsByName('brokenDmType'), selMethod='removeChars';
                for (var ri=0; ri<methodRadios.length; ri++) { if(methodRadios[ri].checked){selMethod=methodRadios[ri].value;break;} }
                result.code = Generators.breakDataMatrix(result.code, selMethod);
            }
            // Primary render
            var primaryDmCont = document.getElementById('datamatrix-container');
            var primaryEanSvg = document.getElementById('primary-ean13-barcode');
            if (doubleScanMode === 'sameEan') {
                if (primaryDmCont) primaryDmCont.style.display='none';
                var ean13p = Generators.extractEAN13FromDM(result.code);
                if (!primaryEanSvg) { primaryEanSvg=document.createElementNS('http://www.w3.org/2000/svg','svg'); primaryEanSvg.id='primary-ean13-barcode'; var pc=document.getElementById('primary-code-container'); if(pc) pc.appendChild(primaryEanSvg); }
                if (primaryEanSvg) { primaryEanSvg.style.display='block'; Generators.renderBarcode(primaryEanSvg, ean13p||result.code, 'EAN13'); }
                result._displayCode = ean13p || result.code;
            } else {
                if (primaryDmCont) { primaryDmCont.style.display='flex'; Generators.renderDM(primaryDmCont, result.code); }
                if (primaryEanSvg) primaryEanSvg.style.display='none';
                result._displayCode = result.code;
            }
            // Secondary code
            var secCont = document.getElementById('secondary-code-container');
            var secDm = document.getElementById('datamatrix-container-2');
            var secEan = document.getElementById('ean13-barcode');
            var secText = null;
            if (doubleScanMode) {
                if (secCont) secCont.style.display='block';
                if (doubleScanMode==='sameDM') {
                    if (secDm){secDm.style.display='flex';Generators.renderDM(secDm,result.code);} if(secEan)secEan.style.display='none';
                    secText=result.code;
                } else if (doubleScanMode==='dmEan'||doubleScanMode==='sameEan') {
                    var ean13s=Generators.extractEAN13FromDM(result.code);
                    if (secDm) secDm.style.display='none';
                    if (secEan){secEan.style.display='block';Generators.renderBarcode(secEan,ean13s||result.code,'EAN13');}
                    secText=ean13s||result.code;
                } else if (doubleScanMode==='differentDM') {
                    var nextBarcode2=dm.rotationList.length>0?dm.rotationList[dm.rotationIndex%dm.rotationList.length].barcode:DEMO_GTINS[(demoGtinIndex)%DEMO_GTINS.length];
                    var result2=Generators.generateDM(nextBarcode2);
                    if (secDm){secDm.style.display='flex';Generators.renderDM(secDm,result2.code);} if(secEan)secEan.style.display='none';
                    secText=result2.code;
                }
            } else {
                if (secCont) secCont.style.display='none';
            }
            // Update code text
            var codeEl=document.getElementById('current-code');
            if(codeEl){codeEl.textContent=result._displayCode;codeEl.classList.add('flash');setTimeout(function(){codeEl.classList.remove('flash');},300);}
            var secDisp=document.getElementById('secondary-code-display'), secTxtEl=document.getElementById('secondary-code-text');
            if(doubleScanMode&&secText&&secDisp&&secTxtEl){secDisp.style.display='block';secTxtEl.textContent=secText;secTxtEl.classList.add('flash');setTimeout(function(){secTxtEl.classList.remove('flash');},300);}
            else if(secDisp){secDisp.style.display='none';}
        },
        displayFromCache: function(index) {
            var dm = AppState.dm;
            if (index < 0 || index >= dm.generatedCodes.length) return;
            var cached = dm.generatedCodes[index];
            dm.codeHistoryIndex = index;
            Generators.renderDM(document.getElementById('datamatrix-container'), cached.code);
            var codeEl = document.getElementById('current-code');
            if (codeEl) { codeEl.textContent = cached.code; codeEl.classList.add('flash'); setTimeout(function() { codeEl.classList.remove('flash'); }, 300); }
            // Используем сохранённый rotationIdx и общее количество GTIN
            var isRotationMode = dm.rotationList.length > 0;
            var displayIdx = cached.rotationIdx !== undefined ? cached.rotationIdx + 1 : index + 1;
            var total = isRotationMode ? dm.rotationList.length : DEMO_GTINS.length;
            this.showCodeInfo(cached.barcode, cached.templateName, displayIdx, total);
            this.updateBadge(true, total);
        },
        startTimer: function() {
            var self = this, dm = AppState.dm;
            this.stopTimer();
            // Если были в середине истории - прыгаем в конец и показываем последний код
            if (dm.generatedCodes.length > 0 && dm.codeHistoryIndex < dm.generatedCodes.length - 1) {
                dm.codeHistoryIndex = dm.generatedCodes.length - 1;
                this.displayFromCache(dm.codeHistoryIndex);
            }
            dm.remaining = dm.timerValue; this.updateCountdown(); this.togglePlayState(true);
            dm.timerInterval = setInterval(function() { dm.remaining -= 0.1; if (dm.remaining <= 0.05) { self.generateAndDisplay(); dm.remaining = dm.timerValue; } self.updateCountdown(); }, 100);
        },
        stopTimer: function() { if (AppState.dm.timerInterval) { clearInterval(AppState.dm.timerInterval); AppState.dm.timerInterval = null; } this.togglePlayState(false); },
        setInterval: function(val) { if (isNaN(val) || val <= 0) return; AppState.dm.timerValue = val; AppState.dm.remaining = val; this.startTimer(); },
        startRotation: function() {
            var folder = AppState.getDmFolder();
            if (!folder) { alert('Выберите папку!'); return; }
            var active = folder.items.filter(function(x) { return x.active; });
            if (active.length === 0) { alert('Выберите GTIN в папке!'); return; }
            AppState.dm.rotationList = active; AppState.dm.rotationIndex = 0; AppState.dm.isRotating = true;
            // Очищаем кэш при новом запуске ротации
            AppState.dm.generatedCodes = []; AppState.dm.codeHistoryIndex = -1;
            Controllers.Tab.switchTo('datamatrix');
            document.getElementById('start-btn').style.display = 'none'; document.getElementById('stop-btn').style.display = 'inline-flex';
            UI.updateRotationStatus(); this.generateAndDisplay(); this.startTimer();
        },
        stopRotation: function() {
            var dm = AppState.dm;
            dm.isRotating = false;
            this.stopTimer();
            // Полностью сбрасываем состояние ротации
            dm.rotationList = [];
            dm.rotationIndex = 0;
            dm.generatedCodes = [];
            dm.codeHistoryIndex = -1;
            // Показываем кнопку старта, скрываем стоп
            document.getElementById('start-btn').style.display = 'inline-flex';
            document.getElementById('stop-btn').style.display = 'none';
            UI.updateRotationStatus();
            // Скрываем информацию о коде и возвращаемся в демо-режим
            this.hideCodeInfo();
            this.updateBadge(false);
            // Генерируем свежий демо-код
            this.generateAndDisplay();
        },
        manualNext: function() {
            var dm = AppState.dm;
            // Если есть кэш и мы не в конце - показываем следующий из кэша
            if (dm.generatedCodes.length > 0 && dm.codeHistoryIndex < dm.generatedCodes.length - 1) {
                this.displayFromCache(dm.codeHistoryIndex + 1);
            } else if (dm.rotationList.length > 0) {
                // Режим ротации: проверяем, все ли GTIN уже сгенерированы
                // Если сгенерировано столько же кодов, сколько GTIN в списке - останавливаемся
                if (dm.generatedCodes.length >= dm.rotationList.length) {
                    // Уже все GTIN пройдены, не генерируем новые
                    return;
                }
                // Генерируем новый код на основе следующего GTIN из папки
                var item = dm.rotationList[dm.rotationIndex];
                var result = Generators.generateDM(item.barcode, item.template);
                var currentRotationIdx = dm.rotationIndex;
                dm.generatedCodes.push({ code: result.code, barcode: item.barcode, templateName: result.templateName, rotationIdx: currentRotationIdx });
                dm.codeHistoryIndex = dm.generatedCodes.length - 1;
                dm.rotationIndex = (dm.rotationIndex + 1) % dm.rotationList.length;
                Generators.renderDM(document.getElementById('datamatrix-container'), result.code);
                var codeEl = document.getElementById('current-code');
                if (codeEl) { codeEl.textContent = result.code; codeEl.classList.add('flash'); setTimeout(function() { codeEl.classList.remove('flash'); }, 300); }
                this.showCodeInfo(item.barcode, result.templateName, currentRotationIdx + 1, dm.rotationList.length);
                this.updateBadge(true, dm.rotationList.length);
            } else {
                // Демо-режим - не генерируем бесконечно, только листаем кэш
                // Если кэша нет - ничего не делаем (демо работает только при автоматической ротации)
                return;
            }
        },
        manualPrev: function() {
            var dm = AppState.dm;
            // Если есть кэш и мы не в начале - показываем предыдущий из кэша
            if (dm.generatedCodes.length > 0 && dm.codeHistoryIndex > 0) {
                this.displayFromCache(dm.codeHistoryIndex - 1);
            }
            // Если мы уже на первом элементе (codeHistoryIndex === 0) или кэш пуст - ничего не делаем
            // Не генерируем новые коды при навигации назад
        },
        updateCountdown: function() { var el = document.getElementById('countdown'); if (el) el.textContent = 'через ' + Math.max(0, AppState.dm.remaining).toFixed(1) + ' сек'; },
        togglePlayState: function(p) {
            var play = document.getElementById('dm-play-btn'), pause = document.getElementById('dm-pause-btn'), navArrows = document.getElementById('dm-nav-arrows');
            if (p) { play.style.display = 'none'; pause.style.display = 'inline-flex'; navArrows.style.display = 'none'; }
            else { play.style.display = 'inline-flex'; pause.style.display = 'none'; navArrows.style.display = 'flex'; }
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
        stopRotation: function() {
            AppState.wc.isRotating = false; this.stopTimer();
            document.getElementById('wc-start-btn').style.display = 'inline-flex';
            document.getElementById('wc-stop-btn').style.display = 'none';
            // Останавливаем анимацию и фиксируем баркод на месте
            var wrapperEl = document.querySelector('.barcode-svg-wrapper');
            if (wrapperEl) {
                wrapperEl.classList.remove('barcode-pulse');
                wrapperEl.classList.remove('barcode-slide');
                wrapperEl.classList.add('barcode-static');
            }
            UI.updateWcStatus();
        },
        manualNext: function() { if (AppState.wc.rotationItems.length > 0) { this.displayBarcodeManual(); } },
        manualPrev: function() { if (AppState.wc.rotationItems.length > 0) { var l = AppState.wc.rotationItems.length; AppState.wc.rotationIndex = (AppState.wc.rotationIndex - 2 + l) % l; if (AppState.wc.rotationIndex < 0) AppState.wc.rotationIndex = l - 1; this.displayBarcodeManual(); } },
        displayBarcodeManual: function() {
            var items = AppState.wc.rotationItems; if (items.length === 0) return;
            var item = items[AppState.wc.rotationIndex % items.length];
            var w = (item.weight / 1000).toFixed(3) + ' кг', d = item.prefix === '49' && item.discount !== undefined ? ' | Скидка: ' + item.discount + '%' : '';
            document.getElementById('wcBarcodeInfo').innerHTML = '<b>PLU:</b> ' + item.plu + ' | <b>Вес:</b> ' + w + d;
            document.getElementById('wcBarcodeText').textContent = item.code;
            document.getElementById('wcCarouselCounter').textContent = ((AppState.wc.rotationIndex % items.length) + 1) + '/' + items.length;
            var svgEl = document.getElementById('wcBarcodeSvg');
            var wrapperEl = document.querySelector('.barcode-svg-wrapper');
            Generators.renderBarcode(svgEl, item.code, item.format);
            // Простая анимация для ручной навигации (без улетания)
            if (wrapperEl) {
                wrapperEl.classList.remove('barcode-pulse', 'barcode-static', 'barcode-slide');
                void wrapperEl.offsetWidth;
                wrapperEl.classList.add('barcode-slide');
            }
            AppState.wc.rotationIndex++;
        },
        
        // Авто-ротация с анимацией пролёта
        displayBarcode: function() {
            var items = AppState.wc.rotationItems; if (items.length === 0) return;
            var item = items[AppState.wc.rotationIndex % items.length];
            var w = (item.weight / 1000).toFixed(3) + ' кг', d = item.prefix === '49' && item.discount !== undefined ? ' | Скидка: ' + item.discount + '%' : '';

            document.getElementById('wcBarcodeInfo').innerHTML = '<b>PLU:</b> ' + item.plu + ' | <b>Вес:</b> ' + w + d;
            document.getElementById('wcBarcodeText').textContent = item.code;
            document.getElementById('wcCarouselCounter').textContent = ((AppState.wc.rotationIndex % items.length) + 1) + '/' + items.length;

            var svgEl = document.getElementById('wcBarcodeSvg');
            var wrapperEl = document.querySelector('.barcode-svg-wrapper');

            Generators.renderBarcode(svgEl, item.code, item.format);

            // Анимация пролёта (слева-центр-вправо)
            if (wrapperEl) {
                wrapperEl.classList.remove('barcode-pulse', 'barcode-static', 'barcode-slide');
                void wrapperEl.offsetWidth;
                wrapperEl.classList.add('barcode-pulse');
            }

            AppState.wc.rotationIndex++;
            AppState.addToHistory({ type: 'WC', code: item.code });
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
        editItemCode: function() {
            console.log('editItemCode called');
            var f = AppState.getSgFolder();
            console.log('folder:', f, 'carouselIndex:', AppState.sg.carouselIndex);
            if (f && f.items.length > 0) {
                var item = f.items[AppState.sg.carouselIndex];
                console.log('item:', item);
                var newCode = prompt('Новый код:', item.code);
                if (newCode !== null && newCode.trim()) {
                    item.code = newCode.trim();
                    Storage.save();
                    UI.renderSgCarousel();
                }
            } else {
                alert('Нет папки или элементов');
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
            if (this.current === 'gs1pack' && AppState.gs1.isRotating) Controllers.GS1.stopRotation();
            if (name === 'datamatrix') { Controllers.DM.generateAndDisplay(); Controllers.DM.startTimer(); }
            if (name === 'library') { UI.renderDmFolders(); UI.renderDmItems(); UI.renderHistory(); }
            if (name === 'barcode') UI.renderBarcodeFields();
            if (name === 'weightcarousel') { UI.renderWcFolders(); UI.renderWcItems(); }
            if (name === 'simplegen') { UI.renderSgFolders(); Controllers.SG.closeFolder(); }
            if (name === 'gs1pack') { UI.renderGs1Folders(); UI.renderGs1Items(); }
            this.current = name;
        }
    },
    Library: {
        addBarcodes: function() {
            var val = document.getElementById('barcode-input').value; if (!val.trim()) return;
            var folderName = AppState.dm.isNewFolderMode || AppState.dm.folders.length === 0 ? document.getElementById('dmFolderInput').value.trim() : document.getElementById('dmFolderSelect').value;
            if (!folderName) { alert('Укажите папку!'); return; }
            var items = val.split('\n').map(function(line, i) { var bc = line.trim().replace(/\D/g, ''); if (bc.length >= 8) return { id: Date.now() + '_' + i, barcode: bc, template: AppState.dm.selectedTemplate, active: true }; return null; }).filter(function(x) { return x; });
            if (items.length === 0) { alert('Нет валидных кодов'); return; }
            var folder = AppState.dm.folders.find(function(f) { return f.name.toLowerCase() === folderName.toLowerCase(); });
            if (!folder) { folder = { id: 'dmf_' + Date.now(), name: folderName, items: [] }; AppState.dm.folders.push(folder); }
            folder.items = folder.items.concat(items); AppState.dm.selectedFolderId = folder.id; Storage.save(); UI.renderDmFolders(); UI.renderDmItems();
            document.getElementById('barcode-input').value = '';
            if (AppState.dm.isNewFolderMode) { document.getElementById('dmFolderInput').value = ''; Controllers.Library.toggleFolderMode(false); }
            alert('Добавлено: ' + items.length);
        },
        toggleFolderMode: function(force) {
            var sel = document.getElementById('dmFolderSelect'), inp = document.getElementById('dmFolderInput'), btn = document.getElementById('dmFolderModeBtn');
            var isNew = force !== undefined ? force : !AppState.dm.isNewFolderMode;
            AppState.dm.isNewFolderMode = isNew;
            if (isNew) { sel.classList.add('d-none'); inp.classList.remove('d-none'); inp.focus(); btn.textContent = '☰'; btn.classList.remove('btn-purple'); btn.classList.add('btn-secondary'); }
            else { sel.classList.remove('d-none'); inp.classList.add('d-none'); btn.textContent = '＋'; btn.classList.remove('btn-secondary'); btn.classList.add('btn-purple'); }
        },
        selectAll: function() { var f = AppState.getDmFolder(); if (f) { f.items.forEach(function(i) { i.active = true; }); Storage.save(); UI.renderDmItems(); UI.renderDmFolders(); } },
        deselectAll: function() { var f = AppState.getDmFolder(); if (f) { f.items.forEach(function(i) { i.active = false; }); Storage.save(); UI.renderDmItems(); UI.renderDmFolders(); } },
        clearSelected: function() { var f = AppState.getDmFolder(); if (f && confirm('Удалить выбранные?')) { f.items = f.items.filter(function(x) { return !x.active; }); Storage.save(); UI.renderDmItems(); UI.renderDmFolders(); } },
        deleteFolder: function() { var f = AppState.getDmFolder(); if (f && confirm('Удалить папку "' + f.name + '"?')) { AppState.dm.folders = AppState.dm.folders.filter(function(x) { return x.id !== f.id; }); AppState.dm.selectedFolderId = null; Storage.save(); UI.renderDmFolders(); UI.renderDmItems(); Controllers.DM.stopRotation(); } },
        renameFolder: function() { var f = AppState.getDmFolder(); if (f) { var n = prompt('Новое имя папки:', f.name); if (n && n.trim()) { f.name = n.trim(); Storage.save(); UI.renderDmFolders(); } } }
    },
    GS1: {
        addItems: function() {
            var folderName=document.getElementById('gs1FolderName').value.trim();
            var goodsIdRaw=document.getElementById('gs1GoodsIds').value.trim();
            var variations=parseInt(document.getElementById('gs1Variations').value)||10;
            var typeEl=document.querySelector('input[name="gs1Type"]:checked');
            var productType=typeEl?typeEl.value:'piece';
            var goodsIdList=goodsIdRaw.split('\n').map(function(l){return l.trim().replace(/\D/g,'');}).filter(function(c){return c.length>0&&c.length<=8;});
            if(goodsIdList.length===0){alert('Введите хотя бы один GoodsId (1-8 цифр)!');return;}
            var qtyMode;
            if(productType==='piece'){var pm=document.querySelector('input[name="gs1PieceMode"]:checked');qtyMode=pm?pm.value:'random';}
            else{var wm=document.querySelector('input[name="gs1WeightMode"]:checked');qtyMode=wm?wm.value:'random';}
            var discModeEl=document.querySelector('input[name="gs1DiscountMode"]:checked');
            var discMode=discModeEl?discModeEl.value:'fixed';
            var fixedDisc=parseInt(document.getElementById('gs1Discount').value)||0;
            var discMin=parseInt(document.getElementById('gs1DiscMin').value)||0;
            var discMax=parseInt(document.getElementById('gs1DiscMax').value)||30;
            if(discMin>discMax){var tmp=discMin;discMin=discMax;discMax=tmp;}
            var qtyMin,qtyMax,fixedQty,weightMin,weightMax,fixedWeight;
            if(productType==='piece'){
                if(qtyMode==='fixed'){fixedQty=parseFloat(document.getElementById('gs1FixedQuantity').value)||50;}
                else{qtyMin=parseFloat(document.getElementById('gs1QuantityMin').value)||1;qtyMax=parseFloat(document.getElementById('gs1QuantityMax').value)||100;if(qtyMin>=qtyMax){alert('Мин. количество должно быть меньше макс.!');return;}}
            } else {
                if(qtyMode==='fixed'){fixedWeight=parseInt(document.getElementById('gs1FixedWeight').value)||500;}
                else{weightMin=parseInt(document.getElementById('gs1WeightMin').value)||100;weightMax=parseInt(document.getElementById('gs1WeightMax').value)||5000;if(weightMin>=weightMax){alert('Мин. вес должен быть меньше макс.!');return;}}
            }
            var items=[],baseId=Date.now();
            goodsIdList.forEach(function(goodsId,gIdx){
                for(var i=0;i<variations;i++){
                    var discount=discMode==='fixed'?fixedDisc:Utils.randomWeight(discMin,discMax);
                    var params={goodsId:goodsId,type:productType,discount:discount};
                    if(productType==='piece'){
                        var quantity=qtyMode==='fixed'?fixedQty:(qtyMin+Math.random()*(qtyMax-qtyMin));
                        quantity=Math.round(quantity*1000)/1000;params.quantity=quantity;
                    } else {
                        params.weight=qtyMode==='fixed'?fixedWeight:Utils.randomWeight(weightMin,weightMax);
                    }
                    try{
                        var code=Generators.generateGS1Code(params);
                        items.push({id:baseId+'_'+gIdx+'_'+i,code:code,goodsId:goodsId,type:productType,quantity:params.quantity,weight:params.weight,discount:discount,active:true});
                    }catch(e){console.error('[GS1]',e);}
                }
            });
            if(items.length===0){alert('Не удалось сгенерировать коды!');return;}
            var folder;
            if(folderName){
                folder=AppState.gs1.folders.find(function(f){return f.name.toLowerCase()===folderName.toLowerCase();});
                if(!folder){folder={id:baseId+'_f',name:folderName,items:[]};AppState.gs1.folders.push(folder);}
            } else if(AppState.gs1.selectedFolderId){
                folder=AppState.getGs1Folder();
            } else {
                var dn='GS1 '+(productType==='piece'?'Штучн':'Весов')+' '+goodsIdList[0];
                folder={id:baseId+'_f',name:dn,items:[]};AppState.gs1.folders.push(folder);
            }
            folder.items=items;
            AppState.gs1.selectedFolderId=folder.id;
            Storage.save();UI.renderGs1Folders();UI.renderGs1Items();
            document.getElementById('gs1FolderName').value='';document.getElementById('gs1GoodsIds').value='';
            alert('Добавлено '+items.length+' кодов');
        },
        startRotation: function() {
            var folder=AppState.getGs1Folder();
            if(!folder){alert('Выберите папку!');return;}
            var active=folder.items.filter(function(x){return x.active;});
            if(active.length===0){alert('Выберите коды для ротации!');return;}
            AppState.gs1.rotationItems=active;AppState.gs1.rotationIndex=0;AppState.gs1.isRotating=true;
            document.getElementById('gs1-start-btn').style.display='none';document.getElementById('gs1-stop-btn').style.display='inline-flex';
            document.getElementById('gs1CarouselDisplay').style.display='block';
            UI.updateGs1Status();this.displayCode();this.startTimer();
            setTimeout(function(){var el=document.getElementById('gs1CarouselDisplay');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});},100);
        },
        stopRotation: function() {
            AppState.gs1.isRotating=false;this.stopTimer();
            document.getElementById('gs1-start-btn').style.display='inline-flex';document.getElementById('gs1-stop-btn').style.display='none';
            var w=document.querySelector('.gs1-qr-wrapper');if(w){w.classList.remove('qr-pulse','qr-slide');w.classList.add('qr-static');}
            UI.updateGs1Status();
        },
        displayCode: function() {
            var items=AppState.gs1.rotationItems; if(!items.length) return;
            var item=items[AppState.gs1.rotationIndex%items.length];
            var info='<b>GoodsId:</b> '+item.goodsId+' | ';
            if(item.type==='piece') info+='<b>Кол-во:</b> '+item.quantity+' шт'; else info+='<b>Вес:</b> '+Utils.formatWeight(item.weight);
            if(item.discount>0) info+=' | <b>Скидка:</b> '+item.discount+'%';
            document.getElementById('gs1CodeInfo').innerHTML=info;
            document.getElementById('gs1CodeText').textContent=item.code;
            document.getElementById('gs1CarouselCounter').textContent=((AppState.gs1.rotationIndex%items.length)+1)+'/'+items.length;
            Generators.renderGS1QR(document.getElementById('gs1QRContainer'),item.code);
            var w=document.querySelector('.gs1-qr-wrapper');
            if(w){w.classList.remove('qr-pulse','qr-static','qr-slide');void w.offsetWidth;w.classList.add('qr-pulse');}
            AppState.gs1.rotationIndex++;
            AppState.addToHistory({type:'GS1',code:item.code});
        },
        displayCodeManual: function() {
            var items=AppState.gs1.rotationItems; if(!items.length) return;
            var item=items[AppState.gs1.rotationIndex%items.length];
            var info='<b>GoodsId:</b> '+item.goodsId+' | ';
            if(item.type==='piece') info+='<b>Кол-во:</b> '+item.quantity+' шт'; else info+='<b>Вес:</b> '+Utils.formatWeight(item.weight);
            if(item.discount>0) info+=' | <b>Скидка:</b> '+item.discount+'%';
            document.getElementById('gs1CodeInfo').innerHTML=info;
            document.getElementById('gs1CodeText').textContent=item.code;
            document.getElementById('gs1CarouselCounter').textContent=((AppState.gs1.rotationIndex%items.length)+1)+'/'+items.length;
            Generators.renderGS1QR(document.getElementById('gs1QRContainer'),item.code);
            var w=document.querySelector('.gs1-qr-wrapper');
            if(w){w.classList.remove('qr-pulse','qr-static','qr-slide');void w.offsetWidth;w.classList.add('qr-slide');}
            AppState.gs1.rotationIndex++;
        },
        manualNext: function() { if(AppState.gs1.rotationItems.length>0) this.displayCodeManual(); },
        manualPrev: function() { if(AppState.gs1.rotationItems.length>0){var l=AppState.gs1.rotationItems.length;AppState.gs1.rotationIndex=(AppState.gs1.rotationIndex-2+l*100)%l;this.displayCodeManual();} },
        startTimer: function() {
            this.stopTimer();
            AppState.gs1.remaining=AppState.gs1.timerValue;
            var self=this;
            AppState.gs1.timerInterval=setInterval(function(){
                AppState.gs1.remaining-=0.1;
                if(AppState.gs1.remaining<=0.05){self.displayCode();AppState.gs1.remaining=AppState.gs1.timerValue;}
            },100);
        },
        stopTimer: function(){if(AppState.gs1.timerInterval){clearInterval(AppState.gs1.timerInterval);AppState.gs1.timerInterval=null;}},
        setInterval: function(v){if(isNaN(v)||v<=0)return;AppState.gs1.timerValue=v;if(AppState.gs1.isRotating)this.startTimer();},
        selectAll: function(){var f=AppState.getGs1Folder();if(f){f.items.forEach(function(i){i.active=true;});Storage.save();UI.renderGs1Items();}},
        deselectAll: function(){var f=AppState.getGs1Folder();if(f){f.items.forEach(function(i){i.active=false;});Storage.save();UI.renderGs1Items();}},
        clearSelected: function(){var f=AppState.getGs1Folder();if(f&&confirm('Удалить выбранные коды?')){f.items=f.items.filter(function(x){return!x.active;});Storage.save();UI.renderGs1Items();}},
        deleteFolder: function(){var f=AppState.getGs1Folder();if(f&&confirm('Удалить папку "'+f.name+'"?')){AppState.gs1.folders=AppState.gs1.folders.filter(function(x){return x.id!==f.id;});AppState.gs1.selectedFolderId=null;Storage.save();UI.renderGs1Folders();UI.renderGs1Items();this.stopRotation();}},
        renameFolder: function(){var f=AppState.getGs1Folder();if(f){var n=prompt('Новое имя папки:',f.name);if(n&&n.trim()){f.name=n.trim();Storage.save();UI.renderGs1Folders();}}}
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
    document.getElementById('dmFolderModeBtn').onclick = function() { Controllers.Library.toggleFolderMode(); };
    document.getElementById('select-all-btn').onclick = function() { Controllers.Library.selectAll(); };
    document.getElementById('deselect-all-btn').onclick = function() { Controllers.Library.deselectAll(); };
    document.getElementById('clear-all-btn').onclick = function() { Controllers.Library.clearSelected(); };
    document.getElementById('dm-run-folder').onclick = function() { if (AppState.getDmFolder()) Controllers.DM.startRotation(); else alert('Выберите папку'); };
    document.getElementById('dm-rename-folder').onclick = function() { Controllers.Library.renameFolder(); };
    document.getElementById('dm-delete-folder').onclick = function() { Controllers.Library.deleteFolder(); };
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
    document.getElementById('sgEditNameBtn').onclick = function() { Controllers.SG.renameItem(); };
    document.getElementById('sgEditCodeBtn').onclick = function(e) { e.preventDefault(); e.stopPropagation(); console.log('123 button clicked'); Controllers.SG.editItemCode(); };
    document.getElementById('wcAddToCarousel').onclick = function() { Controllers.WC.addItems(); };
    document.getElementById('wc-select-all').onclick = function() { Controllers.WC.selectAll(); };
    document.getElementById('wc-deselect-all').onclick = function() { Controllers.WC.deselectAll(); };
    document.getElementById('wc-clear-selected').onclick = function() { Controllers.WC.clearSelected(); };
    document.getElementById('wc-start-btn').onclick = function() { Controllers.WC.startRotation(); };
    document.getElementById('wc-stop-btn').onclick = function() { Controllers.WC.stopRotation(); };
    document.getElementById('wc-run-folder').onclick = function() { if (AppState.getWcFolder()) Controllers.WC.startRotation(); else alert('Выберите папку'); };
    document.getElementById('wc-rename-folder').onclick = function() { Controllers.WC.renameFolder(); };
    document.getElementById('wc-delete-folder').onclick = function() { Controllers.WC.deleteFolder(); };
    document.getElementById('wcPrevBtn').onclick = function() { Controllers.WC.manualPrev(); };
    document.getElementById('wcNextBtn').onclick = function() { Controllers.WC.manualNext(); };
    document.querySelectorAll('.wc-interval-btn').forEach(function(btn) { btn.onclick = function() { document.getElementById('wc-custom-interval').value = btn.dataset.interval; Controllers.WC.setInterval(parseFloat(btn.dataset.interval)); document.querySelectorAll('.wc-interval-btn').forEach(function(b) { b.classList.remove('active'); }); btn.classList.add('active'); }; });
    document.getElementById('wc-custom-interval').onchange = function(e) { Controllers.WC.setInterval(parseFloat(e.target.value)); };
    document.querySelectorAll('input[name="weightMode"]').forEach(function(r) { r.onchange = function() { var m = document.querySelector('input[name="weightMode"]:checked'); var mode = m ? m.value : 'random'; document.getElementById('group-random-weight').classList.toggle('d-none', mode === 'fixed'); document.getElementById('group-fixed-weight').classList.toggle('d-none', mode !== 'fixed'); document.getElementById('wcVariationsLabel').textContent = mode === 'fixed' ? 'Повторов' : 'Вариаций'; document.getElementById('wcVariationsHint').textContent = mode === 'fixed' ? 'Повторов на PLU' : 'Весов на PLU'; }; });
    document.querySelectorAll('input[name="discountMode"]').forEach(function(r) { r.onchange = function() { var m = document.querySelector('input[name="discountMode"]:checked'); var mode = m ? m.value : 'fixed'; document.getElementById('disc-fixed-group').classList.toggle('d-none', mode !== 'fixed'); document.getElementById('disc-random-group').classList.toggle('d-none', mode === 'fixed'); }; });
    document.getElementById('wcPrefix49').onchange = function() { document.getElementById('group-discount-section').classList.toggle('d-none', !document.getElementById('wcPrefix49').checked); };
    // GS1 events
    document.getElementById('gs1AddItems').onclick = function() { Controllers.GS1.addItems(); };
    document.getElementById('gs1-run-folder').onclick = function() { Controllers.GS1.startRotation(); };
    document.getElementById('gs1-rename-folder').onclick = function() { Controllers.GS1.renameFolder(); };
    document.getElementById('gs1-delete-folder').onclick = function() { Controllers.GS1.deleteFolder(); };
    document.getElementById('gs1-start-btn').onclick = function() { Controllers.GS1.startRotation(); };
    document.getElementById('gs1-stop-btn').onclick = function() { Controllers.GS1.stopRotation(); };
    document.getElementById('gs1PrevBtn').onclick = function() { Controllers.GS1.manualPrev(); };
    document.getElementById('gs1NextBtn').onclick = function() { Controllers.GS1.manualNext(); };
    document.getElementById('gs1-select-all').onclick = function() { Controllers.GS1.selectAll(); };
    document.getElementById('gs1-deselect-all').onclick = function() { Controllers.GS1.deselectAll(); };
    document.getElementById('gs1-clear-selected').onclick = function() { Controllers.GS1.clearSelected(); };
    document.querySelectorAll('.gs1-interval-btn').forEach(function(btn) { btn.onclick = function() { document.getElementById('gs1-custom-interval').value = btn.dataset.interval; Controllers.GS1.setInterval(parseFloat(btn.dataset.interval)); document.querySelectorAll('.gs1-interval-btn').forEach(function(b){b.classList.remove('active');}); btn.classList.add('active'); }; });
    document.getElementById('gs1-custom-interval').onchange = function(e) { Controllers.GS1.setInterval(parseFloat(e.target.value)); };
    document.querySelectorAll('input[name="gs1Type"]').forEach(function(r) { r.onchange = function() { var t=document.querySelector('input[name="gs1Type"]:checked').value; document.getElementById('gs1-piece-section').classList.toggle('d-none',t!=='piece'); document.getElementById('gs1-weight-section').classList.toggle('d-none',t==='piece'); }; });
    document.querySelectorAll('input[name="gs1PieceMode"]').forEach(function(r) { r.onchange = function() { var m=document.querySelector('input[name="gs1PieceMode"]:checked').value; document.getElementById('gs1-random-quantity').classList.toggle('d-none',m==='fixed'); document.getElementById('gs1-fixed-quantity').classList.toggle('d-none',m!=='fixed'); }; });
    document.querySelectorAll('input[name="gs1WeightMode"]').forEach(function(r) { r.onchange = function() { var m=document.querySelector('input[name="gs1WeightMode"]:checked').value; document.getElementById('gs1-random-weight').classList.toggle('d-none',m==='fixed'); document.getElementById('gs1-fixed-weight').classList.toggle('d-none',m!=='fixed'); }; });
    document.querySelectorAll('input[name="gs1DiscountMode"]').forEach(function(r) { r.onchange = function() { var m=document.querySelector('input[name="gs1DiscountMode"]:checked').value; document.getElementById('gs1-disc-fixed-group').classList.toggle('d-none',m!=='fixed'); document.getElementById('gs1-disc-random-group').classList.toggle('d-none',m==='fixed'); }; });
    // Double scan + broken DM events
    var doubleScanIds=['doubleScanSameDM','doubleScanDmEan','doubleScanSameEan','doubleScanDifferentDM'];
    var brokenDmCb=document.getElementById('brokenDataMatrix');
    doubleScanIds.forEach(function(id) {
        var cb=document.getElementById(id); if(!cb) return;
        cb.onchange=function() {
            if(this.checked){
                if(brokenDmCb){brokenDmCb.checked=false;var bdo=document.getElementById('brokenDmOptions');if(bdo)bdo.style.display='none';}
                doubleScanIds.filter(function(oid){return oid!==id;}).forEach(function(oid){var o=document.getElementById(oid);if(o)o.checked=false;});
            }
            Controllers.DM.generateAndDisplay();
        };
    });
    if(brokenDmCb) { brokenDmCb.onchange=function() { var bdo=document.getElementById('brokenDmOptions'); if(this.checked){doubleScanIds.forEach(function(id){var cb=document.getElementById(id);if(cb)cb.checked=false;});if(bdo)bdo.style.display='block';}else{if(bdo)bdo.style.display='none';} Controllers.DM.generateAndDisplay(); }; }
    var brokenDmRadios=document.getElementsByName('brokenDmType'); for(var bri=0;bri<brokenDmRadios.length;bri++){brokenDmRadios[bri].onchange=function(){if(brokenDmCb&&brokenDmCb.checked)Controllers.DM.generateAndDisplay();};}
    document.onkeydown = function(e) {
        // DataMatrix - стрелки при остановленном таймере
        var dm = document.getElementById('tab-datamatrix');
        if (dm && dm.classList.contains('active') && !AppState.dm.timerInterval) {
            if (e.key === 'ArrowLeft') Controllers.DM.manualPrev();
            if (e.key === 'ArrowRight') Controllers.DM.manualNext();
        }
        // Карусель весовых - стрелки при наличии баркодов
        var wc = document.getElementById('tab-weightcarousel');
        if (wc && wc.classList.contains('active') && AppState.wc.rotationItems.length > 0) {
            if (e.key === 'ArrowLeft') Controllers.WC.manualPrev();
            if (e.key === 'ArrowRight') Controllers.WC.manualNext();
        }
        // Конструктор - стрелки при открытой папке
        var sg = document.getElementById('tab-simplegen');
        var sgCarousel = document.getElementById('sg-view-carousel');
        if (sg && sg.classList.contains('active') && sgCarousel && sgCarousel.style.display !== 'none') {
            if (e.key === 'ArrowLeft') Controllers.SG.prev();
            if (e.key === 'ArrowRight') Controllers.SG.next();
        }
        // GS1 - стрелки при активной ротации
        var gs1Tab = document.getElementById('tab-gs1pack');
        if (gs1Tab && gs1Tab.classList.contains('active') && AppState.gs1.rotationItems.length > 0) {
            if (e.key === 'ArrowLeft') Controllers.GS1.manualPrev();
            if (e.key === 'ArrowRight') Controllers.GS1.manualNext();
        }
    };
    document.onvisibilitychange = function() { if (document.hidden) { Controllers.DM.stopTimer(); Controllers.WC.stopTimer(); } else { if (Controllers.Tab.current === 'datamatrix') { Controllers.DM.generateAndDisplay(); Controllers.DM.startTimer(); } if (AppState.wc.isRotating) { Controllers.WC.displayBarcode(); Controllers.WC.startTimer(); } } };
    UI.renderDmFolders(); UI.renderDmItems(); UI.renderBarcodeFields(); UI.renderWcFolders(); UI.renderWcItems(); UI.renderSgFolders(); UI.renderGs1Folders(); UI.renderGs1Items(); UI.renderHistory();
    setTimeout(function() { Controllers.DM.generateAndDisplay(); Controllers.DM.startTimer(); }, 300);
    console.log('[Generator v2.4] Ready - with DM folders');
}

if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(init, 50);
else document.addEventListener('DOMContentLoaded', init);
})();
