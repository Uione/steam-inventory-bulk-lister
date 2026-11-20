import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '..', 'steam-inventory-bulk-lister.user.js');
const scriptSource = fs.readFileSync(SCRIPT_PATH, 'utf8');

function makeSandbox({ walletInfo, fetchImpl, holders = [], confirmImpl, marketAllowed = true, steamLanguage = 'english' } = {}) {
    const store = new Map();
    const testHook = {};

    const findById = (root, id) => {
        if (!root || !root.children) return null;
        for (const c of root.children) {
            if (c.id === id) return c;
            const nested = findById(c, id);
            if (nested) return nested;
        }
        return null;
    };

    const createEl = (tag) => {
        const el = {
            tagName: String(tag).toUpperCase(),
            className: '',
            id: '',
            style: {},
            children: [],
            textContent: '',
            value: '',
            checked: false,
            disabled: false,
            classList: {
                _set: new Set(),
                add(c) { this._set.add(c); },
                remove(c) { this._set.delete(c); },
                toggle(c, force) {
                    if (force === undefined) {
                        if (this._set.has(c)) { this._set.delete(c); return false; }
                        this._set.add(c); return true;
                    }
                    if (force) { this._set.add(c); return true; }
                    this._set.delete(c); return false;
                },
                contains(c) { return this._set.has(c); }
            },
            appendChild(c) { this.children.push(c); return c; },
            append(...args) { this.children.push(...args); },
            addEventListener() {},
            querySelector(sel) {
                if (sel && sel.startsWith('#')) {
                    return findById(this, sel.slice(1)) || createEl('div');
                }
                if (sel === '.sbl-head') return createEl('div');
                return null;
            },
            querySelectorAll() { return []; },
            get childElementCount() { return this.children.length; },
            get firstChild() { return this.children[0] || null; },
            removeChild(c) {
                const idx = this.children.indexOf(c);
                if (idx >= 0) this.children.splice(idx, 1);
            },
            getBoundingClientRect() { return { left: 0, top: 0 }; },
            set innerHTML(v) {
                this._innerHTML = v;
                if (v === '') {
                    this.children = [];
                    return;
                }
                const matches = String(v).matchAll(/id="([^"]+)"/g);
                for (const m of matches) {
                    const child = createEl('div');
                    child.id = m[1];
                    this.children.push(child);
                }
            },
            get innerHTML() { return this._innerHTML || ''; }
        };
        return el;
    };

    const inventoriesEl = {
        querySelectorAll(selector) {
            if (selector === '.inventory_page .itemHolder') {
                return holders;
            }
            if (selector === '.item') {
                return holders.map((h) => h.querySelector('.item')).filter(Boolean);
            }
            return [];
        },
        addEventListener() {}
    };

    const document = {
        cookie: 'sessionid=test_session_123',
        readyState: 'complete',
        head: createEl('head'),
        body: createEl('body'),
        createElement: createEl,
        createDocumentFragment() {
            return {
                children: [],
                appendChild(c) { this.children.push(c); return c; }
            };
        },
        addEventListener() {},
        getElementById(id) {
            if (id === 'inventories') return inventoriesEl;
            return findById(document.body, id);
        }
    };

    const windowObj = {
        location: {
            origin: 'https://steamcommunity.com',
            href: 'https://steamcommunity.com/id/testuser/inventory/'
        },
        g_steamID: '76561198000000001',
        g_sessionID: 'test_session_123',
        g_strLanguage: steamLanguage,
        g_bMarketAllowed: marketAllowed,
        confirm: confirmImpl,
        g_rgWalletInfo: walletInfo || {
            wallet_currency: 1,
            wallet_fee: 1,
            wallet_fee_minimum: '1',
            wallet_fee_percent: '0.05',
            wallet_publisher_fee_percent_default: '0.10',
            wallet_currency_increment: '1',
            wallet_market_minimum: '1'
        },
        g_rgAppContextData: {
            730: { market_pubfee_rate: '0.10' },
            753: { market_pubfee_rate: '0.10' }
        },
        GetCurrencyCode(id) {
            return id === 8 ? 'JPY' : 'USD';
        },
        __SBL_TEST__: testHook,
        addEventListener() {}
    };

    const context = {
        window: windowObj,
        unsafeWindow: windowObj,
        document,
        localStorage: {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v))
        },
        fetch: fetchImpl || (async () => { throw new Error('unexpected fetch'); }),
        Intl,
        Map,
        Set,
        Promise,
        Math,
        Number,
        String,
        Boolean,
        Array,
        Object,
        JSON,
        Date,
        Error,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        requestAnimationFrame: (fn) => fn(),
        encodeURIComponent,
        decodeURIComponent
    };

    vm.createContext(context);
    vm.runInContext(scriptSource, context);
    return { api: testHook, windowObj };
}

let passed = 0;
async function test(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`PASS  ${name}`);
    } catch (err) {
        console.error(`FAIL  ${name}`);
        console.error(err);
        process.exitCode = 1;
    }
}

await test('Tampermonkey header matches Steam inventory URLs and Greasy Fork i18n requirements', () => {
    assert.match(scriptSource, /@name:zh-CN\s+/);
    assert.match(scriptSource, /@name:zh-TW\s+/);
    assert.match(scriptSource, /@description:zh-CN\s+/);
    assert.match(scriptSource, /@description:zh-TW\s+/);
    assert.match(scriptSource, /@match\s+https:\/\/steamcommunity\.com\/id\/\*\/inventory\*/);
    assert.match(scriptSource, /@match\s+https:\/\/steamcommunity\.com\/profiles\/\*\/inventory\*/);
    assert.match(scriptSource, /@match\s+https:\/\/steamcommunity\.com\/my\/inventory\*/);
    assert.match(scriptSource, /@grant\s+none/);
    assert.match(scriptSource, /@license\s+MIT/);
    assert.match(scriptSource, /@version\s+1\.2\.0/);
});

await test('Fee math and unreachable buyer-price gap handling (USD)', () => {
    const { api } = makeSandbox();
    const item = { appid: 730 };
    // seller 19 -> floor(19*0.05)=0 -> min 1, floor(19*0.10)=1 -> buyer 19+1+1 = 21
    assert.equal(api.getTotalWithFees(19, item), 21);
    // seller 20 -> floor(20*0.05)=1, floor(20*0.10)=2 -> buyer 20+1+2 = 23 (22 is unreachable!)
    assert.equal(api.getTotalWithFees(20, item), 23);

    // Asking for buyer target 22 MUST round DOWN to seller 19 (buyer 21), never 20 (buyer 23)!
    const sellerFor22 = api.sellerPriceForBuyerTarget(22, item);
    assert.equal(sellerFor22, 19);
    assert.ok(api.getTotalWithFees(sellerFor22, item) <= 22);

    // Minimum listing ($0.03 buyer -> 1 cent seller)
    assert.equal(api.sellerPriceForBuyerTarget(3, item), 1);

    // Exact match ($1.15 buyer -> $1.00 seller)
    assert.equal(api.sellerPriceForBuyerTarget(115, item), 100);

    // Custom item market_fee = 5%
    const lowFeeItem = { appid: 730, market_fee: 0.05 };
    assert.equal(api.getTotalWithFees(100, lowFeeItem), 110);
    assert.equal(api.sellerPriceForBuyerTarget(110, lowFeeItem), 100);
});

await test('Currency increment handling for zero-decimal/large-increment currency (JPY)', () => {
    const { api } = makeSandbox({
        walletInfo: {
            wallet_currency: 8,
            wallet_fee: 1,
            wallet_fee_minimum: '100',
            wallet_fee_percent: '0.05',
            wallet_publisher_fee_percent_default: '0.10',
            wallet_currency_increment: '100',
            wallet_market_minimum: '100'
        }
    });
    assert.equal(api.currencyCode(), 'JPY');
    assert.equal(api.currencyStep(), 100);
    assert.equal(api.marketMinimum(), 100);
    assert.equal(api.toValidMarketPrice(149), 100);
    assert.equal(api.toValidMarketPrice(150), 200);

    const seller = api.sellerPriceForBuyerTarget(11500, { appid: 730 });
    assert.equal(seller % 100, 0);
    assert.ok(api.getTotalWithFees(seller, { appid: 730 }) <= 11500);
});

await test('parseUserPriceInput parses decimal, comma, currency symbol, and thousands', () => {
    const { api } = makeSandbox();
    assert.equal(api.parseUserPriceInput('0.15'), 15);
    assert.equal(api.parseUserPriceInput('1,25'), 125);
    assert.equal(api.parseUserPriceInput('$1,234.56'), 123456);
    assert.equal(api.parseUserPriceInput('150'), 15000);
    assert.equal(api.parseUserPriceInput(''), 0);
    assert.equal(api.parseUserPriceInput('not-a-price'), 0);
});

await test('buildOrderBook handles 2026 nested payload, empty sell side, and error shape', () => {
    const { api } = makeSandbox();
    const book = api.buildOrderBook({
        data: {
            success: true,
            data: {
                amtMinSellOrder: 50,
                amtMaxBuyOrder: 44,
                rgCompactSellOrders: [50, 3, 52, 5],
                rgCompactBuyOrders: [44, 10]
            }
        }
    });
    assert.equal(book.lowestSell, 50);
    assert.equal(book.highestBuy, 44);
    assert.deepEqual(
        JSON.parse(JSON.stringify(book.sellOrders)),
        [{ price: 50, quantity: 3 }, { price: 52, quantity: 5 }]
    );

    const emptySellBook = api.buildOrderBook({
        data: {
            success: true,
            data: { amtMinSellOrder: null, amtMaxBuyOrder: 20, rgCompactSellOrders: [], rgCompactBuyOrders: [20, 2] }
        }
    });
    assert.equal(emptySellBook.lowestSell, null);
    assert.equal(emptySellBook.highestBuy, 20);

    assert.equal(api.buildOrderBook({ data: { success: false } }), null);
});

await test('resolveListingPrice supports all 4 pricing modes and tight-spread bid floor', () => {
    const { api } = makeSandbox();
    const item = { appid: 730 };
    const book = { lowestSell: 50, highestBuy: 44 };

    // 1. Undercut by 1 cent -> buyer target 49
    const u1 = api.resolveListingPrice(item, book, { mode: api.PRICING_MODE.UNDERCUT, undercutSteps: 1 });
    assert.ok(u1.buyerPrice <= 49 && u1.buyerPrice >= 44);

    // Tight spread: lowestSell=25, highestBuy=24, undercutSteps=5 -> floored at 24 (not 20!)
    const tight = api.resolveListingPrice(item, { lowestSell: 25, highestBuy: 24 }, { mode: api.PRICING_MODE.UNDERCUT, undercutSteps: 5 });
    assert.ok(tight.buyerPrice >= 24 && tight.buyerPrice <= 25);

    // 2. Match lowest
    const m = api.resolveListingPrice(item, book, { mode: api.PRICING_MODE.MATCH_LOWEST });
    assert.ok(m.buyerPrice <= 50 && m.buyerPrice >= 48);

    // 3. Instant sell (top buy order)
    const inst = api.resolveListingPrice(item, book, { mode: api.PRICING_MODE.INSTANT_SELL });
    assert.ok(inst.buyerPrice <= 44 && inst.sellerPrice > 0);
    const noBuy = api.resolveListingPrice(item, { lowestSell: 50, highestBuy: null }, { mode: api.PRICING_MODE.INSTANT_SELL });
    assert.ok(noBuy.skipReason);

    // 4. Custom price (buyer & seller sides + min validation)
    const custB = api.resolveListingPrice(item, null, { mode: api.PRICING_MODE.CUSTOM, customSide: 'buyer', customInternalAmount: 115 });
    assert.equal(custB.sellerPrice, 100);
    assert.equal(custB.buyerPrice, 115);

    const custS = api.resolveListingPrice(item, null, { mode: api.PRICING_MODE.CUSTOM, customSide: 'seller', customInternalAmount: 100 });
    assert.equal(custS.sellerPrice, 100);
    assert.equal(custS.buyerPrice, 115);

    const tooLowB = api.resolveListingPrice(item, null, { mode: api.PRICING_MODE.CUSTOM, customSide: 'buyer', customInternalAmount: 2 });
    assert.ok(tooLowB.skipReason);
});

await test('CS2 sealed/listed detection, APPWIDE_CONTEXT 753/0, and duplicate filtering', () => {
    const { api } = makeSandbox();
    const sessionListed = new Set();

    const activeInv = {
        appid: 753,
        contextid: 0,
        m_rgChildInventories: {
            6: {
                m_rgAssets: {
                    '1': { appid: 753, contextid: '6', assetid: '1', amount: 1, description: { name: 'Card A', market_hash_name: '753-Card A', marketable: 1 } },
                    '2': { appid: 753, contextid: '6', assetid: '2', amount: 1, description: { name: 'Card A', market_hash_name: '753-Card A', marketable: 1 } },
                    '3': { appid: 753, contextid: '6', assetid: '3', amount: 1, description: { name: 'Card B', market_hash_name: '753-Card B', marketable: 1 } }
                }
            }
        },
        m_rgAssets: {}
    };

    const steamItems = api.collectFromActiveInventory(activeInv, sessionListed);
    assert.equal(steamItems.length, 3);
    const dupSet = api.duplicateKeysSet(steamItems);
    assert.equal(dupSet.size, 1);
    assert.ok(dupSet.has('753_6_2'));

    // CS2 listed (sealed_type == 1) vs trade protected (sealed_type == 2)
    const csListed = api.normalizeAsset({
        appid: 730, contextid: '2', assetid: '901', amount: 1,
        description: { name: 'AK-47', market_hash_name: 'AK-47', marketable: 1, sealed: 1, sealed_type: 1 }
    }, sessionListed);
    assert.equal(csListed.listed, true);
    assert.equal(csListed.marketable, true);

    const csProtected = api.normalizeAsset({
        appid: 730, contextid: '2', assetid: '902', amount: 1,
        description: { name: 'M4A1-S', market_hash_name: 'M4A1-S', marketable: 1, sealed: 1, sealed_type: 2 }
    }, sessionListed);
    assert.equal(csProtected.tradeProtected, true);
    assert.equal(csProtected.marketable, false);
});

await test('Shift+Click range selection skips hidden/filtered holders and listed items', () => {
    const makeHolder = (id, visible) => {
        const itemEl = { id };
        return {
            offsetParent: visible ? {} : null,
            querySelector(sel) { return sel === '.item' ? itemEl : null; }
        };
    };

    const holders = [
        makeHolder('730_2_10', true),
        makeHolder('730_2_11', false), // filtered out by Steam search
        makeHolder('730_2_12', true),  // already listed
        makeHolder('730_2_13', true)
    ];

    const { api } = makeSandbox({ holders });
    api.resetTestState();
    const items = [
        { key: '730_2_10', marketable: true, listed: false, tradeProtected: false },
        { key: '730_2_11', marketable: true, listed: false, tradeProtected: false },
        { key: '730_2_12', marketable: true, listed: true, tradeProtected: false },
        { key: '730_2_13', marketable: true, listed: false, tradeProtected: false }
    ];
    api.state.items = items;
    api.state.byKey = new Map(items.map((i) => [i.key, i]));

    const count = api.applyRangeSelection('730_2_10', '730_2_13');
    assert.equal(count, 2);
    assert.ok(api.state.selectedKeys.has('730_2_10'));
    assert.ok(!api.state.selectedKeys.has('730_2_11')); // hidden holder skipped
    assert.ok(!api.state.selectedKeys.has('730_2_12')); // listed item skipped
    assert.ok(api.state.selectedKeys.has('730_2_13'));
});

await test('End-to-end runBatchUplist groups orderbook lookups, handles 429 retry, and calls sellitem', async () => {
    const calls = [];
    let sellAttempt = 0;

    const mockFetch = async (url, init) => {
        calls.push({ url, method: init.method, body: init.body || '' });

        if (url.includes('/market/orderbook')) {
            return {
                ok: true,
                status: 200,
                text: async () => JSON.stringify({
                    data: {
                        success: true,
                        data: {
                            amtMinSellOrder: 115,
                            amtMaxBuyOrder: 100,
                            rgCompactSellOrders: [115, 4],
                            rgCompactBuyOrders: [100, 10]
                        }
                    }
                })
            };
        }

        if (url.includes('/market/sellitem/')) {
            sellAttempt++;
            if (sellAttempt === 1) {
                return { ok: false, status: 429, text: async () => '' };
            }
            return {
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ success: true, requires_confirmation: true })
            };
        }

        throw new Error(`Unexpected URL: ${url}`);
    };

    const { api } = makeSandbox({ fetchImpl: mockFetch });
    api.resetTestState({
        pricingMode: api.PRICING_MODE.UNDERCUT,
        undercutSteps: 1,
        requestDelayMs: 1,
        requestJitterMs: 0,
        rateLimitBackoffMs: 5,
        maxRetries: 2
    });

    const items = [
        { key: '730_2_101', appid: 730, contextid: '2', assetid: '101', amount: 1, market_hash_name: 'Kilowatt Case', name: 'Kilowatt Case', marketable: true, listed: false, tradeProtected: false },
        { key: '730_2_102', appid: 730, contextid: '2', assetid: '102', amount: 1, market_hash_name: 'Kilowatt Case', name: 'Kilowatt Case', marketable: true, listed: false, tradeProtected: false },
        { key: '730_2_201', appid: 730, contextid: '2', assetid: '201', amount: 1, market_hash_name: 'AK-47 | Redline', name: 'AK-47 | Redline', marketable: true, listed: false, tradeProtected: false }
    ];
    api.state.items = items;
    api.state.byKey = new Map(items.map((i) => [i.key, i]));
    items.forEach((i) => api.state.selectedKeys.add(i.key));

    await api.runBatchUplist();

    const orderbookCalls = calls.filter((c) => c.url.includes('/market/orderbook'));
    const sellCalls = calls.filter((c) => c.url.includes('/market/sellitem/'));

    // Only 2 distinct item names -> 2 orderbook calls!
    assert.equal(orderbookCalls.length, 2);
    // 3 items + 1 retry after 429 = 4 sellitem calls
    assert.equal(sellCalls.length, 4);

    // Check payload params on final sellitem call: seller receives 99 cents for buyer target 114
    const lastBody = new URLSearchParams(sellCalls[3].body);
    assert.equal(lastBody.get('sessionid'), 'test_session_123');
    assert.equal(lastBody.get('appid'), '730');
    assert.equal(lastBody.get('contextid'), '2');
    assert.equal(lastBody.get('amount'), '1');
    // buyer target = 115 - 1 = 114; seller 99 -> buyer 99 + 4 + 9 = 112 <= 114 (100 -> 115 > 114)
    assert.equal(lastBody.get('price'), '99');

    // All 3 items should now be marked listed & deselected
    assert.equal(api.state.selectedKeys.size, 0);
    assert.equal(api.state.sessionListedKeys.size, 3);
});

await test('UI.init renders panel, groups checklist, and switches pricing mode params cleanly', () => {
    const { api } = makeSandbox();
    api.resetTestState();
    api.UI.init();
    const items = [
        { key: '730_2_1', appid: 730, contextid: '2', assetid: '1', amount: 1, market_hash_name: 'Case X', name: 'Case X', marketable: true, listed: false, tradeProtected: false },
        { key: '730_2_2', appid: 730, contextid: '2', assetid: '2', amount: 1, market_hash_name: 'Case X', name: 'Case X', marketable: true, listed: true, tradeProtected: false },
        { key: '730_2_3', appid: 730, contextid: '2', assetid: '3', amount: 1, market_hash_name: 'Skin Y', name: 'Skin Y', marketable: true, listed: false, tradeProtected: false }
    ];
    api.state.items = items;
    api.state.byKey = new Map(items.map((i) => [i.key, i]));
    api.state.selectedKeys.add('730_2_1');

    api.UI.syncAllViews();
    assert.equal(api.UI.els.uplist.textContent, 'Uplist Selected (1)');
    assert.equal(api.UI.els.clear.textContent, 'Clear (1)');

    for (const m of Object.values(api.PRICING_MODE)) {
        api.settings.pricingMode = m;
        api.UI.renderModeParams();
    }
    api.UI.log('Smoke test ok', 'ok');
});

await test('marketRestrictionReason detects disabled market or missing wallet currency', () => {
    const { api: blocked1 } = makeSandbox({ marketAllowed: false });
    assert.ok(blocked1.marketRestrictionReason());

    const { api: blocked2 } = makeSandbox({ walletInfo: { wallet_currency: 0 } });
    assert.ok(blocked2.marketRestrictionReason());

    const { api: ok } = makeSandbox();
    assert.equal(ok.marketRestrictionReason(), null);
});

await test('Big-batch confirmation cancels cleanly when user declines >= 15 items', async () => {
    let confirmMsg = null;
    let fetched = false;
    const { api } = makeSandbox({
        confirmImpl: (msg) => { confirmMsg = msg; return false; },
        fetchImpl: async () => { fetched = true; throw new Error('should not fetch'); }
    });
    api.resetTestState();
    for (let i = 1; i <= 15; i++) {
        const it = {
            key: `730_2_${i}`, appid: 730, contextid: '2', assetid: String(i), amount: 1,
            market_hash_name: 'Case X', name: 'Case X', marketable: true, listed: false, tradeProtected: false
        };
        api.state.items.push(it);
        api.state.byKey.set(it.key, it);
        api.state.selectedKeys.add(it.key);
    }
    await api.runBatchUplist();
    assert.match(confirmMsg, /15 item\(s\)/);
    assert.equal(fetched, false);
    assert.equal(api.state.selectedKeys.size, 15);
});

await test('I18N supports EN, zh-CN, zh-TW completely and auto-detects g_strLanguage', () => {
    const { api: enApi } = makeSandbox({ steamLanguage: 'english' });
    assert.equal(enApi.currentLang(), 'en');
    const { api: scApi } = makeSandbox({ steamLanguage: 'schinese' });
    assert.equal(scApi.currentLang(), 'zh-CN');
    const { api: tcApi } = makeSandbox({ steamLanguage: 'tchinese' });
    assert.equal(tcApi.currentLang(), 'zh-TW');

    const enKeys = Object.keys(enApi.I18N.en);
    for (const lang of ['zh-CN', 'zh-TW']) {
        for (const k of enKeys) {
            assert.ok(
                typeof enApi.I18N[lang][k] === 'string' && enApi.I18N[lang][k].length > 0,
                `Missing i18n key "${k}" in ${lang}`
            );
        }
    }
});

await test('Per-item & per-group overrides work in runBatchUplist and skip unnecessary orderbooks', async () => {
    const calls = [];
    const mockFetch = async (url, init) => {
        calls.push({ url, body: init.body || '' });
        if (url.includes('/market/orderbook')) {
            return {
                ok: true,
                status: 200,
                text: async () => JSON.stringify({
                    data: {
                        success: true,
                        data: { amtMinSellOrder: 200, amtMaxBuyOrder: 180, rgCompactSellOrders: [200, 2], rgCompactBuyOrders: [180, 5] }
                    }
                })
            };
        }
        if (url.includes('/market/sellitem/')) {
            return { ok: true, status: 200, text: async () => JSON.stringify({ success: true }) };
        }
        throw new Error(`Unexpected URL: ${url}`);
    };

    const { api } = makeSandbox({ fetchImpl: mockFetch });
    api.resetTestState({
        pricingMode: api.PRICING_MODE.UNDERCUT,
        undercutSteps: 1,
        requestDelayMs: 1,
        requestJitterMs: 0
    });

    const item1 = { key: '730_2_1', appid: 730, contextid: '2', assetid: '1', amount: 1, market_hash_name: 'AK-47 | Slate', name: 'AK-47 | Slate', marketable: true, listed: false, tradeProtected: false };
    const item2 = { key: '730_2_2', appid: 730, contextid: '2', assetid: '2', amount: 1, market_hash_name: 'AK-47 | Slate', name: 'AK-47 | Slate', marketable: true, listed: false, tradeProtected: false };
    const item3 = { key: '730_2_3', appid: 730, contextid: '2', assetid: '3', amount: 1, market_hash_name: 'P250 | Sand Dune', name: 'P250 | Sand Dune', marketable: true, listed: false, tradeProtected: false };

    api.state.items = [item1, item2, item3];
    api.state.byKey = new Map(api.state.items.map((i) => [i.key, i]));
    api.state.selectedKeys.add(item1.key);
    api.state.selectedKeys.add(item2.key);
    api.state.selectedKeys.add(item3.key);

    // Group override on AK-47 -> Instant-sell (top buy order = 180 -> seller 157)
    api.state.groupOverrides.set(api.itemGroupKey(item1), { mode: api.PRICING_MODE.INSTANT_SELL, priceText: '' });
    // Asset override on item2 (sticky override!) -> Custom $5.00 (500 buyer -> 435 seller)
    api.state.assetOverrides.set(item2.key, { mode: api.PRICING_MODE.CUSTOM, priceText: '5.00' });
    // All items in P250 group -> Custom $0.50 (50 buyer -> 44 seller) -> should NOT query orderbook for P250!
    api.state.assetOverrides.set(item3.key, { mode: api.PRICING_MODE.CUSTOM, priceText: '0.50' });

    api.UI.init();
    api.UI.syncAllViews();

    await api.runBatchUplist();

    const obCalls = calls.filter((c) => c.url.includes('/market/orderbook'));
    const sellCalls = calls.filter((c) => c.url.includes('/market/sellitem/'));

    // Only AK-47 queried orderbook (P250 was pure Custom so no orderbook lookup needed!)
    assert.equal(obCalls.length, 1);
    assert.match(decodeURIComponent(obCalls[0].url), /AK-47 \| Slate/);

    assert.equal(sellCalls.length, 3);
    const pricesByAsset = new Map(sellCalls.map((c) => {
        const p = new URLSearchParams(c.body);
        return [p.get('assetid'), Number(p.get('price'))];
    }));
    // item1 used group override Instant-sell (180 buyer -> 157 seller: 157 + 7 + 15 = 179 <= 180)
    assert.equal(pricesByAsset.get('1'), api.sellerPriceForBuyerTarget(180, item1));
    // item2 used asset override Custom 5.00 (500 buyer -> 435 seller: 435 + 21 + 43 = 499 <= 500)
    assert.equal(pricesByAsset.get('2'), api.sellerPriceForBuyerTarget(500, item2));
    // item3 used asset override Custom 0.50 (50 buyer -> 44 seller: 44 + 2 + 4 = 50)
    assert.equal(pricesByAsset.get('3'), api.sellerPriceForBuyerTarget(50, item3));
});

await test('Invalid per-item custom price blocks batch before any network call', async () => {
    let fetched = false;
    const { api } = makeSandbox({
        fetchImpl: async () => { fetched = true; throw new Error('should not fetch'); }
    });
    api.resetTestState();
    const item = { key: '730_2_9', appid: 730, contextid: '2', assetid: '9', amount: 1, market_hash_name: 'Case Z', name: 'Case Z', marketable: true, listed: false, tradeProtected: false };
    api.state.items = [item];
    api.state.byKey = new Map([[item.key, item]]);
    api.state.selectedKeys.add(item.key);
    api.state.assetOverrides.set(item.key, { mode: api.PRICING_MODE.CUSTOM, priceText: '0.01' }); // below 0.03 min

    await api.runBatchUplist();
    assert.equal(fetched, false);
    assert.equal(api.state.selectedKeys.has(item.key), true);
});

console.log(`\nTotal passed: ${passed}`);
