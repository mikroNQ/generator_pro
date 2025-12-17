# BarGen Architecture Documentation

> **For AI/LLM:** This document describes the project structure and conventions.
> Read this file first to understand the codebase.

## Project Overview

**BarGen** is a barcode and DataMatrix code generator for testing scanners and POS equipment.
Hosted on **GitHub Pages** (static files only, no server-side processing).

## Technology Stack

- **Frontend:** Vanilla JavaScript (ES5 compatible)
- **CSS:** Custom CSS with Glassmorphism design
- **External Libraries:**
  - `bwip-js` - DataMatrix rendering
  - `JsBarcode` - Linear barcode rendering
- **Storage:** Browser LocalStorage
- **Hosting:** GitHub Pages (static)

## Directory Structure

```
/
├── index.html              # Main HTML file (no inline styles/scripts)
├── css/
│   └── main.css            # All styles (~600 lines)
├── js/
│   ├── app/                # Core modules
│   │   ├── config.js       # Constants, templates, barcode configs
│   │   ├── utils.js        # Helper functions
│   │   ├── state.js        # Application state (AppState)
│   │   └── storage.js      # LocalStorage operations
│   ├── generators/
│   │   └── generators.js   # Code generation logic
│   ├── ui/
│   │   └── ui.js           # DOM rendering functions
│   ├── controllers/        # Feature controllers
│   │   ├── dm.controller.js      # DataMatrix tab
│   │   ├── wc.controller.js      # Weight Carousel tab
│   │   ├── sg.controller.js      # Simple Generator tab
│   │   ├── barcode.controller.js # Barcode tab
│   │   ├── tab.controller.js     # Tab navigation
│   │   └── library.controller.js # Library/folders management
│   └── main.js             # Entry point, event binding
├── assets/
│   └── logo.png            # App logo
├── .claude/
│   └── ARCHITECTURE.md     # This file
└── README.md               # User documentation
```

## Global Namespace

All modules export to `window.BarGen`:

```javascript
window.BarGen = {
    Config: { ... },      // Constants and configurations
    Utils: { ... },       // Helper functions
    State: { ... },       // Application state
    Storage: { ... },     // LocalStorage operations
    Generators: { ... },  // Code generation
    UI: { ... },          // DOM rendering
    Controllers: {
        DM: { ... },      // DataMatrix
        WC: { ... },      // Weight Carousel
        SG: { ... },      // Simple Generator
        Barcode: { ... }, // Barcode form
        Tab: { ... },     // Tab navigation
        Library: { ... }  // Library management
    }
};
```

## Module Dependencies

```
config.js ← (no deps)
utils.js ← (no deps)
state.js ← Config
storage.js ← Config, State
generators.js ← Config, Utils, State
ui.js ← Config, Utils, State, Generators
controllers/*.js ← Utils, State, Storage, UI, Generators
main.js ← All modules
```

## Script Loading Order

Scripts must be loaded in this exact order in `index.html`:

1. External libraries (bwip-js, JsBarcode)
2. `js/app/utils.js`
3. `js/app/config.js`
4. `js/app/state.js`
5. `js/app/storage.js`
6. `js/generators/generators.js`
7. `js/ui/ui.js`
8. `js/controllers/*.js` (any order)
9. `js/main.js`

## Application State Structure

```javascript
BarGen.State = {
    dm: {                        // DataMatrix module
        timerValue: 0.7,         // Auto-rotation interval (seconds)
        remaining: 0.7,          // Time until next code
        timerInterval: null,     // setInterval ID
        isRotating: false,       // Rotation active flag
        rotationList: [],        // Active items for rotation
        rotationIndex: 0,        // Current index in rotation
        selectedTemplate: 'type1', // Active template
        generatedCodes: [],      // Cache of generated codes
        codeHistoryIndex: -1,    // Current position in cache
        folders: [],             // User folders with GTIN items
        selectedFolderId: null,  // Currently selected folder
        isNewFolderMode: false   // New folder input mode
    },
    wc: {                        // Weight Carousel module
        folders: [],
        selectedFolderId: null,
        timerValue: 0.7,
        remaining: 0.7,
        timerInterval: null,
        isRotating: false,
        rotationIndex: 0,
        rotationItems: []
    },
    sg: {                        // Simple Generator module
        folders: [],
        selectedFolderId: null,
        carouselIndex: 0,
        isNewFolderMode: false
    },
    history: {                   // Code generation history
        items: [],
        maxItems: 50
    }
};
```

## Key Data Structures

### DataMatrix Folder Item
```javascript
{
    id: 'dmf_1234567890',
    name: 'Folder Name',
    items: [
        {
            id: '1234567890_0',
            barcode: '4810099003310',  // GTIN-13
            template: 'type1',          // Template ID
            active: true                // Selected for rotation
        }
    ]
}
```

### Weight Barcode Item
```javascript
{
    id: '1234567890_0_0_77',
    code: '7700001234500150000',  // Full barcode with check digit
    format: 'CODE128',            // JsBarcode format
    plu: '12345',                 // Product lookup code
    weight: 1500,                 // Weight in grams
    prefix: '77',                 // Barcode prefix
    active: true,
    discount: 0                   // For prefix 49 only
}
```

### History Item
```javascript
{
    id: '1234567890',
    timestamp: '2024-01-15T14:30:00.000Z',
    type: 'DM',  // 'DM', 'BC', or 'WC'
    code: '0104810099003310210...'
}
```

## Barcode Templates

### Type 1 (Tobacco/Water)
- Format: `01[GTIN-14]21[Serial-7][GS]93[Crypto-4]`
- Example: `01048100990033102100a3Kx9Q93AB12`

### Type 2 (Clothing/Shoes)
- Format: `01[GTIN-14]21[Serial-13][GS]91[Hex-4][GS]92[Base64-44]`
- Longer crypto signature for clothing marking

## Barcode Prefixes

| Prefix | Format  | Length | Description           |
|--------|---------|--------|-----------------------|
| 47     | Code128 | 19     | Piece goods           |
| 49     | Code128 | 19     | Weight + discount     |
| 44     | Code128 | 19     | Price-based           |
| 77     | Code128 | 16     | CAS scale system      |
| 22     | EAN-13  | 13     | EAN-13 weight         |

## Common Tasks

### Adding a new barcode format

1. Add config to `js/app/config.js` → `BARCODE_CONFIGS`
2. Add option to `index.html` → `#barcodeType` select
3. If needed, add generator in `js/generators/generators.js`

### Adding a new tab

1. Add tab button in `index.html` with `data-tab="tabname"`
2. Add tab content div with `id="tab-tabname"`
3. Create controller `js/controllers/tabname.controller.js`
4. Add to `js/main.js` → `bindEvents()` and tab switch logic
5. Add script tag to `index.html` (before main.js)

### Modifying styles

- All styles in `css/main.css`
- Use CSS variables from `:root` for colors
- Sections marked with comments for easy navigation

### Changing DataMatrix template

- Edit `js/app/config.js` → `TEMPLATES`
- Template must have `name` and `generate(barcode)` function

## CSS Structure

```css
/* Section order in main.css */
1. CSS Variables (Design Tokens)
2. Base & Reset
3. Layout Components
4. Form Elements
5. Buttons
6. Tabs Navigation
7. Cards & Containers
8. DataMatrix Section
9. Barcode Carousel
10. SimpleGen Section
11. Weight Carousel Section
12. Lists & Items
13. Backup & History
14. Utility Classes
15. Animations
16. Responsive
```

## LocalStorage Schema

Key: `barcode_gen_v5`

```json
{
    "savedItems": [],           // Legacy (migrated to dmFolders)
    "dmFolders": [],            // DataMatrix folders
    "wcFolders": [],            // Weight Carousel folders
    "sgFolders": [],            // Simple Generator folders
    "history": []               // Generation history
}
```

## Event Flow

1. **Page Load:**
   - `DOMContentLoaded` → `main.js:init()`
   - `Storage.load()` - Load saved data
   - Bind all events
   - Render initial UI
   - Start DataMatrix timer

2. **Tab Switch:**
   - `Controllers.Tab.switchTo(tabName)`
   - Stop timers on previous tab
   - Initialize new tab content

3. **DataMatrix Rotation:**
   - User selects GTIN items
   - `Controllers.DM.startRotation()`
   - Timer generates codes at interval
   - Codes cached for navigation

## Performance Considerations

- Use document fragments for list rendering
- Debounce timer updates (100ms intervals)
- Cache generated codes for navigation
- Lazy load tab content

## Testing Locally

```bash
# Simple HTTP server (Python 3)
python -m http.server 8000

# Or with Node.js
npx serve
```

Then open `http://localhost:8000`

## Deployment

Push to GitHub → GitHub Pages serves `index.html` automatically.
All paths are relative, no build step required.

## Troubleshooting

### Timer not working
- Check `State.dm.timerInterval` is not null
- Ensure page is visible (`document.visibilitychange`)

### Barcode not rendering
- Check console for JsBarcode errors
- Verify code format matches expected pattern

### Data not saving
- Check LocalStorage quota
- Call `Storage.save()` after state changes

---

**Version:** 2.5.0
**Last Updated:** December 2024
