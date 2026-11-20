// ==UserScript==
// @name         Steam Inventory Bulk Uplist
// @name:zh-CN   Steam 库存批量上架助手
// @name:zh-TW   Steam 庫存批量上架助手
// @namespace    https://github.com/Uione/steam-inventory-bulk-lister
// @version      1.2.0
// @description  Multi-select items on Steam Inventory (Ctrl/Shift-click or searchable checklist) and bulk-uplist them to the Steam Community Market with per-item price overrides.
// @description:zh-CN  在 Steam 库存页面通过 Ctrl/Shift 多选或清单勾选多个物品，一键批量上架到社区市场，支持压价/同最低价/秒卖及单件自定义价格。
// @description:zh-TW  在 Steam 庫存頁面透過 Ctrl/Shift 多選或清單勾選多個物品，一鍵批量上架到社群市集，支援壓價/同最低價/秒賣及單件自訂價格。
// @author       Uione
// @license      MIT
// @homepageURL  https://github.com/Uione/steam-inventory-bulk-lister
// @supportURL   https://github.com/Uione/steam-inventory-bulk-lister/issues
// @icon         https://steamcommunity.com/favicon.ico
// @match        https://steamcommunity.com/id/*/inventory*
// @match        https://steamcommunity.com/profiles/*/inventory*
// @match        https://steamcommunity.com/my/inventory*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
    const ORIGIN = window.location.origin;
    const VERSION = '1.2.0';
    const SETTINGS_KEY = 'sbl_settings_v1';
    const BIG_BATCH_CONFIRM_THRESHOLD = 15;

    const PRICING_MODE = {
        UNDERCUT: 'undercut',
        MATCH_LOWEST: 'match',
        INSTANT_SELL: 'instant',
        CUSTOM: 'custom'
    };

    const FILTER_MODE = {
        ALL: 'all',
        DUPLICATES: 'duplicates',
        SELECTED: 'selected'
    };

    const I18N = {
        en: {
            title: 'Steam Bulk Uplist',
            gridPickOn: 'Grid Pick: ON',
            gridPickOff: 'Grid Pick: OFF',
            gridPickTitle: 'When ON, single left-click selects items in the grid',
            collapseTitle: 'Collapse / Expand',
            searchPlaceholder: 'Search inventory items...',
            filterAll: 'All marketable',
            filterDuplicates: 'Duplicates only',
            filterSelected: 'Selected only',
            reloadBtn: 'Reload',
            reloadTitle: 'Load all pages & refresh',
            selectFilteredBtn: 'Select Filtered',
            selectDupsBtn: 'Select Duplicates',
            clearBtn: 'Clear ({n})',
            gridTip: 'Tip: Ctrl / Shift+Click grid',
            pricingLabel: 'Default:',
            modeUndercut: 'Undercut lowest listing',
            modeMatch: 'Match lowest listing',
            modeInstant: 'Instant-sell (top buy order)',
            modeCustom: 'Custom price',
            delayLabel: 'Delay',
            delayTitle: 'Delay between Steam API calls',
            msUnit: 'ms',
            undercutBy: 'Undercut by',
            undercutHint: 'step(s) ({price}, floored at top buy order)',
            matchHint: 'Lists at current lowest sell price (falls back to top buy order if none).',
            instantHint: 'Matches highest buy order for instant sale (skips if no buy orders).',
            sideBuyer: 'Buyer pays',
            sideSeller: 'You receive',
            pricePlaceholder: 'e.g. 0.15',
            enterPriceIn: 'Enter price in {code}',
            minReceive: 'Min you receive: {price}',
            minBuyerPays: 'Min buyer pays: {price}',
            buyerPaysEst: 'Buyer pays {price} (est.)',
            youGetApprox: 'You get ~{price}',
            uplistBtn: 'Uplist Selected ({n})',
            stopBtn: 'Stop',
            statusReady: 'Ready',
            statusLoading: 'Loading inventory...',
            statusLoadError: 'Load error',
            statusRestricted: 'Market restricted',
            statusListable: '{eligible} listable ({marketable} marketable)',
            statusChecking: 'Checking price: {name}',
            statusListing: 'Listing {done}/{total}: {name}',
            statusDone: 'Done ({n} listed)',
            statusStopped: 'Stopped',
            statusFailed: 'Failed',
            emptyLoading: 'Loading inventory...',
            emptyNoMatch: 'No matching marketable items.',
            emptyNoMarketable: 'No marketable items in this inventory.',
            listedTag: 'LISTED',
            listedCountTag: '{n} LISTED',
            expandTitle: 'Expand individual items',
            qtyTitle: 'Select 0..{max} copies',
            rowModeDefault: 'Default',
            rowModeUndercut: 'Undercut',
            rowModeMatch: 'Match',
            rowModeInstant: 'Instant',
            rowModeCustom: 'Custom',
            rowPricePlaceholder: 'Buyer pays',
            rowPriceTitle: 'Buyer pays {buyer} -> You get ~{seller}',
            rowPriceInvalid: 'Min buyer price: {min}',
            rowOverrideTip: 'Override price mode for this selected item',
            marketRestricted: 'Steam Community Market selling is currently restricted on this account.',
            noWalletCurrency: 'No active Steam Wallet currency (add funds or verify billing to sell on Market).',
            logReady: 'Ready. Ctrl/Shift+Click items on the grid or use the checklist.',
            logSelectedFiltered: 'Selected {n} item(s) from filter.',
            logSelectedDups: 'Selected {n} duplicate item(s) (kept 1 of each).',
            logStopping: 'Stopping after current request...',
            logNoEligible: 'No eligible items selected.',
            logInvalidCustom: 'Please enter a valid custom price first.',
            logInvalidRowCustom: 'Invalid custom price for "{name}".',
            logBatchCancelled: 'Batch cancelled.',
            logNotMarketable: '{name}: not marketable.',
            logAlreadyListed: '{name}: already listed on Market.',
            logTradeProtected: '{name}: trade protected.',
            logUplistingStart: 'Uplisting {total} item(s) across {groups} distinct item type(s)...',
            logSkipped: '{name}: skipped ({reason})',
            logListedItem: 'Listed {name}{qty} @ {buyer} (you get {seller})',
            logFailedItem: '{name} (#{assetid}): {err}',
            logFinished: 'Finished: {listed} listed, {failed} failed, {skipped} skipped. Est. net payout: {payout}.',
            logMobileConfirm: 'Open your Steam Mobile App -> Confirmations to approve the listings.',
            logStoppedByUser: 'Stopped by user.',
            logInvLoadErr: 'Inventory load error: {err}',
            logRateLimited: 'Rate limited (429). Waiting {sec}s...',
            confirmBigBatch: 'Uplist {count} item(s) to the Steam Community Market?\nDefault pricing: {mode}\n\nListings will still require confirmation in your Steam Mobile App.'
        },
        'zh-CN': {
            title: 'Steam 批量上架',
            gridPickOn: '格子点选: 开',
            gridPickOff: '格子点选: 关',
            gridPickTitle: '开启后，左键单击库存格子即可直接选中/取消物品',
            collapseTitle: '折叠 / 展开',
            searchPlaceholder: '搜索库存物品...',
            filterAll: '全部可出售',
            filterDuplicates: '仅重复物品',
            filterSelected: '仅已选中',
            reloadBtn: '刷新',
            reloadTitle: '加载全部库存分页并刷新',
            selectFilteredBtn: '全选当前筛选',
            selectDupsBtn: '选中重复项',
            clearBtn: '清空 ({n})',
            gridTip: '提示: Ctrl / Shift+点击格子',
            pricingLabel: '默认定价:',
            modeUndercut: '低于最低卖单 (压价)',
            modeMatch: '匹配最低卖单',
            modeInstant: '匹配最高求购 (秒卖)',
            modeCustom: '自定义价格',
            delayLabel: '间隔',
            delayTitle: '每次 Steam 请求之间的延迟',
            msUnit: 'ms',
            undercutBy: '压价',
            undercutHint: '个最小单位 ({price}，不低于最高求购)',
            matchHint: '按当前最低卖单挂售（无卖单时回退至最高求购）。',
            instantHint: '按当前最高求购价立即成交（无求购单则跳过）。',
            sideBuyer: '买家支付',
            sideSeller: '实收金额',
            pricePlaceholder: '例如 0.15',
            enterPriceIn: '输入 {code} 价格',
            minReceive: '最低实收: {price}',
            minBuyerPays: '买家最低支付: {price}',
            buyerPaysEst: '买家约付 {price}',
            youGetApprox: '预计实收 ~{price}',
            uplistBtn: '一键上架已选 ({n})',
            stopBtn: '停止',
            statusReady: '就绪',
            statusLoading: '正在加载库存...',
            statusLoadError: '加载失败',
            statusRestricted: '市场受限',
            statusListable: '可上架 {eligible} 件 (共 {marketable} 件可交易)',
            statusChecking: '正在查价: {name}',
            statusListing: '正在上架 {done}/{total}: {name}',
            statusDone: '完成 (已上架 {n} 件)',
            statusStopped: '已停止',
            statusFailed: '失败',
            emptyLoading: '正在加载库存...',
            emptyNoMatch: '没有匹配的可出售物品。',
            emptyNoMarketable: '当前库存中没有可出售物品。',
            listedTag: '已上架',
            listedCountTag: '{n} 已上架',
            expandTitle: '展开查看单个物品',
            qtyTitle: '选择 0..{max} 件',
            rowModeDefault: '默认(压价)',
            rowModeUndercut: '压价',
            rowModeMatch: '同最低',
            rowModeInstant: '秒卖',
            rowModeCustom: '自定义',
            rowPricePlaceholder: '买家付',
            rowPriceTitle: '买家支付 {buyer} -> 预计实收 ~{seller}',
            rowPriceInvalid: '买家最低支付: {min}',
            rowOverrideTip: '单独设置此已选物品的上架定价方式',
            marketRestricted: '当前 Steam 账号的社区市场出售功能受限。',
            noWalletCurrency: 'Steam 钱包尚未激活货币（请先充值或验证账单地址）。',
            logReady: '已就绪。可在左侧库存 Ctrl/Shift+点击，或在下方列表勾选。',
            logSelectedFiltered: '已从筛选结果中选中 {n} 件物品。',
            logSelectedDups: '已选中 {n} 件重复物品（每样保留 1 件）。',
            logStopping: '将在当前请求完成后停止...',
            logNoEligible: '没有选中可上架的物品。',
            logInvalidCustom: '请先输入有效的自定义价格。',
            logInvalidRowCustom: '"{name}" 的自定义价格无效。',
            logBatchCancelled: '已取消本次批量上架。',
            logNotMarketable: '{name}: 不可在市场出售。',
            logAlreadyListed: '{name}: 已在市场上架中。',
            logTradeProtected: '{name}: 处于交易保护期。',
            logUplistingStart: '开始批量上架 {total} 件物品（共 {groups} 种不同物品）...',
            logSkipped: '{name}: 已跳过 ({reason})',
            logListedItem: '已上架 {name}{qty} @ {buyer} (实收 {seller})',
            logFailedItem: '{name} (#{assetid}): {err}',
            logFinished: '完成：成功 {listed} 件，失败 {failed} 件，跳过 {skipped} 件。预计实收 {payout}。',
            logMobileConfirm: '请打开手机 Steam 令牌 -> 确认 页面完成上架确认。',
            logStoppedByUser: '用户已停止。',
            logInvLoadErr: '库存加载失败: {err}',
            logRateLimited: '触发 Steam 频率限制 (429)，等待 {sec} 秒后重试...',
            confirmBigBatch: '确定要将 {count} 件物品上架到 Steam 社区市场吗？\n默认定价: {mode}\n\n提交后仍需在手机 Steam 令牌中进行确认。'
        },
        'zh-TW': {
            title: 'Steam 批量上架',
            gridPickOn: '格子點選: 開',
            gridPickOff: '格子點選: 關',
            gridPickTitle: '開啟後，左鍵單擊庫存格子即可直接選取/取消物品',
            collapseTitle: '摺疊 / 展開',
            searchPlaceholder: '搜尋庫存物品...',
            filterAll: '全部可出售',
            filterDuplicates: '僅重複物品',
            filterSelected: '僅已選取',
            reloadBtn: '重新載入',
            reloadTitle: '載入全部庫存分頁並重新整理',
            selectFilteredBtn: '全選目前篩選',
            selectDupsBtn: '選取重複項',
            clearBtn: '清空 ({n})',
            gridTip: '提示: Ctrl / Shift+點擊格子',
            pricingLabel: '預設訂價:',
            modeUndercut: '低於最低賣單 (壓價)',
            modeMatch: '符合最低賣單',
            modeInstant: '符合最高買單 (秒賣)',
            modeCustom: '自訂價格',
            delayLabel: '間隔',
            delayTitle: '每次 Steam 請求之間的延遲',
            msUnit: 'ms',
            undercutBy: '壓價',
            undercutHint: '個最小單位 ({price}，不低於最高買單)',
            matchHint: '依目前最低賣單掛售（無賣單時改依最高買單）。',
            instantHint: '依目前最高買單價立即成交（無買單則略過）。',
            sideBuyer: '買家支付',
            sideSeller: '實收金額',
            pricePlaceholder: '例如 0.15',
            enterPriceIn: '輸入 {code} 價格',
            minReceive: '最低實收: {price}',
            minBuyerPays: '買家最低支付: {price}',
            buyerPaysEst: '買家約付 {price}',
            youGetApprox: '預計實收 ~{price}',
            uplistBtn: '一鍵上架已選 ({n})',
            stopBtn: '停止',
            statusReady: '就緒',
            statusLoading: '正在載入庫存...',
            statusLoadError: '載入失敗',
            statusRestricted: '市集受限',
            statusListable: '可上架 {eligible} 件 (共 {marketable} 件可販售)',
            statusChecking: '正在查價: {name}',
            statusListing: '正在上架 {done}/{total}: {name}',
            statusDone: '完成 (已上架 {n} 件)',
            statusStopped: '已停止',
            statusFailed: '失敗',
            emptyLoading: '正在載入庫存...',
            emptyNoMatch: '沒有符合的可出售物品。',
            emptyNoMarketable: '目前庫存中沒有可出售物品。',
            listedTag: '已上架',
            listedCountTag: '{n} 已上架',
            expandTitle: '展開檢視單個物品',
            qtyTitle: '選取 0..{max} 件',
            rowModeDefault: '預設(壓價)',
            rowModeUndercut: '壓價',
            rowModeMatch: '同最低',
            rowModeInstant: '秒賣',
            rowModeCustom: '自訂',
            rowPricePlaceholder: '買家付',
            rowPriceTitle: '買家支付 {buyer} -> 預計實收 ~{seller}',
            rowPriceInvalid: '買家最低支付: {min}',
            rowOverrideTip: '單獨設定此已選物品的上架訂價方式',
            marketRestricted: '目前 Steam 帳號的社群市集出售功能受限。',
            noWalletCurrency: 'Steam 錢包尚未啟用貨幣（請先儲值或驗證帳單地址）。',
            logReady: '已就緒。可在左側庫存 Ctrl/Shift+點擊，或在下方清單勾選。',
            logSelectedFiltered: '已從篩選結果中選取 {n} 件物品。',
            logSelectedDups: '已選取 {n} 件重複物品（每樣保留 1 件）。',
            logStopping: '將在目前請求完成後停止...',
            logNoEligible: '沒有選取可上架的物品。',
            logInvalidCustom: '請先輸入有效的自訂價格。',
            logInvalidRowCustom: '"{name}" 的自訂價格無效。',
            logBatchCancelled: '已取消本次批量上架。',
            logNotMarketable: '{name}: 不可在市集出售。',
            logAlreadyListed: '{name}: 已在市集上架中。',
            logTradeProtected: '{name}: 處於交易保護期。',
            logUplistingStart: '開始批量上架 {total} 件物品（共 {groups} 種不同物品）...',
            logSkipped: '{name}: 已略過 ({reason})',
            logListedItem: '已上架 {name}{qty} @ {buyer} (實收 {seller})',
            logFailedItem: '{name} (#{assetid}): {err}',
            logFinished: '完成：成功 {listed} 件，失敗 {failed} 件，略過 {skipped} 件。預計實收 {payout}。',
            logMobileConfirm: '請開啟手機 Steam 驗證器 -> 確認 頁面完成上架確認。',
            logStoppedByUser: '使用者已停止。',
            logInvLoadErr: '庫存載入失敗: {err}',
            logRateLimited: '觸發 Steam 頻率限制 (429)，等待 {sec} 秒後重試...',
            confirmBigBatch: '確定要將 {count} 件物品上架到 Steam 社群市集嗎？\n預設訂價: {mode}\n\n送出後仍需在手機 Steam 驗證器中進行確認。'
        }
    };

    function detectDefaultLang() {
        const steamLang = String(W.g_strLanguage || '').toLowerCase();
        if (steamLang === 'schinese') {
            return 'zh-CN';
        }
        if (steamLang === 'tchinese') {
            return 'zh-TW';
        }
        if (steamLang === 'english') {
            return 'en';
        }
        const nav = String((typeof navigator !== 'undefined' && navigator.language) || '').toLowerCase();
        if (nav.startsWith('zh')) {
            return /(tw|hk|mo|hant)/.test(nav) ? 'zh-TW' : 'zh-CN';
        }
        return 'en';
    }

    const DEFAULTS = {
        lang: null,
        pricingMode: PRICING_MODE.UNDERCUT,
        undercutSteps: 1,
        customPriceSide: 'buyer', // 'buyer' | 'seller'
        customPriceText: '',
        requestDelayMs: 1250,
        requestJitterMs: 350,
        rateLimitBackoffMs: 30000,
        maxRetries: 4
    };

    function currentLang() {
        if (settings.lang && I18N[settings.lang]) {
            return settings.lang;
        }
        return detectDefaultLang();
    }

    function t(key, vars = {}) {
        const dict = I18N[currentLang()] || I18N.en;
        let text = dict[key] ?? I18N.en[key] ?? key;
        for (const [k, v] of Object.entries(vars)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
        return text;
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            const merged = Object.assign({}, DEFAULTS, raw ? JSON.parse(raw) : {});
            merged.requestDelayMs = Math.max(400, parseInt(merged.requestDelayMs, 10) || DEFAULTS.requestDelayMs);
            merged.undercutSteps = Math.max(0, parseInt(merged.undercutSteps, 10) || 0);
            if (merged.lang && !I18N[merged.lang]) {
                merged.lang = null;
            }
            return merged;
        } catch {
            return Object.assign({}, DEFAULTS);
        }
    }

    function saveSettings(s) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
        } catch {
            /* ignore storage quota or private mode failures */
        }
    }

    let settings = loadSettings();
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // --------------------------------------------------------- Wallet & Fees

    function walletInfo() {
        return W.g_rgWalletInfo || null;
    }

    function currencyCode() {
        try {
            const wi = walletInfo();
            if (wi && wi.wallet_currency && typeof W.GetCurrencyCode === 'function') {
                return W.GetCurrencyCode(wi.wallet_currency);
            }
        } catch {
            /* fallback below */
        }
        return 'USD';
    }

    function currencyStep() {
        const wi = walletInfo();
        const inc = wi ? parseInt(wi.wallet_currency_increment, 10) : 1;
        return Number.isFinite(inc) && inc > 0 ? inc : 1;
    }

    function marketMinimum() {
        const wi = walletInfo();
        const floor = wi ? parseInt(wi.wallet_market_minimum, 10) : 1;
        return Number.isFinite(floor) && floor > 0 ? floor : 1;
    }

    function formatPrice(internalAmount) {
        if (internalAmount == null || Number.isNaN(internalAmount)) {
            return '--';
        }
        const code = currencyCode();
        if (typeof W.v_currencyformat === 'function') {
            try {
                return W.v_currencyformat(Math.round(internalAmount), code);
            } catch {
                /* fallback below */
            }
        }
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: code
            }).format(internalAmount / 100);
        } catch {
            return (internalAmount / 100).toFixed(2);
        }
    }

    /*
     * Parse user price text (e.g. "1.25", "1,25", "$0.35", "150") into
     * Steam's internal integer price units (hundredths of the currency unit).
     */
    function parseUserPriceInput(rawText) {
        if (rawText == null) {
            return 0;
        }
        const str = String(rawText).trim();
        if (!str) {
            return 0;
        }

        if (typeof W.GetPriceValueAsInt === 'function') {
            try {
                const v = W.GetPriceValueAsInt(str);
                if (Number.isFinite(v) && v >= 0) {
                    return v;
                }
            } catch {
                /* fallback below */
            }
        }

        // Fallback mirroring Steam's economy_common.js GetPriceValueAsInt
        let cleaned = str.replace(/,/g, '.').replace(/[^\d.]/g, '');
        if (!cleaned) {
            return 0;
        }
        const parts = cleaned.split('.');
        if (parts.length > 1) {
            const last = parts[parts.length - 1];
            if (/^\d{3}$/.test(last) && parts[parts.length - 2] !== '0') {
                cleaned = parts.join('');
            } else {
                cleaned = parts.slice(0, -1).join('') + '.' + last;
            }
        }
        const fl = parseFloat(cleaned) * 100;
        return Math.max(0, Math.floor(Number.isFinite(fl) ? fl + 0.000001 : 0));
    }

    function publisherFeeRateFor(item) {
        const wi = walletInfo();
        if (item && item.market_fee != null && !Number.isNaN(parseFloat(item.market_fee))) {
            return parseFloat(item.market_fee);
        }
        const appData = item && W.g_rgAppContextData && W.g_rgAppContextData[item.appid];
        if (appData && appData.market_pubfee_rate != null) {
            return parseFloat(appData.market_pubfee_rate);
        }
        if (wi && wi.wallet_publisher_fee_percent_default != null) {
            return parseFloat(wi.wallet_publisher_fee_percent_default);
        }
        return 0.10;
    }

    function steamFeeRate() {
        const wi = walletInfo();
        if (wi && wi.wallet_fee_percent != null) {
            return parseFloat(wi.wallet_fee_percent);
        }
        return 0.05;
    }

    function toValidMarketPrice(amount) {
        const wi = walletInfo();
        if (wi && typeof W.ToValidMarketPrice === 'function') {
            try {
                return W.ToValidMarketPrice(amount, wi);
            } catch {
                /* fallback below */
            }
        }
        const floor = marketMinimum();
        const inc = currencyStep();
        if (amount <= floor) {
            return floor;
        }
        if (amount <= inc) {
            return inc;
        }
        if (inc > 1) {
            const d = amount / inc;
            const sign = d < 0 ? -1 : 1;
            return sign * Math.floor(Math.abs(d) + 0.5) * inc;
        }
        return Math.round(amount);
    }

    function getTotalWithFees(sellerAmount, item) {
        const wi = walletInfo();
        const ppct = publisherFeeRateFor(item);
        const spct = steamFeeRate();

        if (wi && typeof W.GetTotalWithFees === 'function') {
            try {
                return W.GetTotalWithFees(sellerAmount, ppct, spct, wi);
            } catch {
                /* fallback below */
            }
        }

        if (wi && !wi.wallet_fee) {
            return toValidMarketPrice(sellerAmount);
        }

        const nBase = toValidMarketPrice(sellerAmount);
        const nPubFee = ppct > 0 ? toValidMarketPrice(Math.floor(sellerAmount * ppct)) : 0;
        const nSteamFee = spct > 0 ? toValidMarketPrice(Math.floor(sellerAmount * spct)) : 0;
        return nBase + nPubFee + nSteamFee;
    }

    /*
     * Invert GetTotalWithFees accurately for item-specific fees and currency
     * increments. When a buyer price sits in an unreachable gap caused by fee
     * rounding, always step DOWN so an undercut never lands back on the
     * competitor's price.
     */
    function sellerPriceForBuyerTarget(buyerTarget, item, floorAtBuyOrder = null) {
        const wi = walletInfo();
        const floor = marketMinimum();
        const inc = currencyStep();
        const target = toValidMarketPrice(Math.max(floor, Math.round(buyerTarget)));

        if (wi && !wi.wallet_fee) {
            return Math.max(floor, target);
        }

        const ppct = publisherFeeRateFor(item);
        const spct = steamFeeRate();
        const guessRaw = Math.floor(target / (1 + ppct + spct));
        const maxBase = Math.max(floor, target - 2 * floor);
        let seller = toValidMarketPrice(Math.max(floor, Math.min(guessRaw, maxBase)));

        let undershot = false;
        for (let i = 0; i < 24; i++) {
            const buyerTotal = getTotalWithFees(seller, item);
            if (buyerTotal === target) {
                break;
            }
            if (buyerTotal > target) {
                if (undershot) {
                    seller = Math.max(floor, toValidMarketPrice(seller - inc));
                    break;
                }
                if (seller <= floor) {
                    break;
                }
                seller = Math.max(floor, toValidMarketPrice(seller - inc));
            } else {
                undershot = true;
                seller = toValidMarketPrice(seller + inc);
            }
        }

        // Never exceed the target buyer price.
        while (seller > floor && getTotalWithFees(seller, item) > target) {
            const next = Math.max(floor, toValidMarketPrice(seller - inc));
            if (next === seller) {
                break;
            }
            seller = next;
        }

        // If undercutting near the bid/ask spread, avoid dropping under highestBuy
        // if stepping up one increment stays at or under target.
        if (floorAtBuyOrder != null && floorAtBuyOrder > 0) {
            for (let i = 0; i < 6 && getTotalWithFees(seller, item) < floorAtBuyOrder; i++) {
                const higher = toValidMarketPrice(seller + inc);
                if (getTotalWithFees(higher, item) <= target) {
                    seller = higher;
                } else {
                    break;
                }
            }
        }

        return Math.max(floor, seller);
    }

    // -------------------------------------------------------- Network & API

    const Net = {
        chain: Promise.resolve(),
        stopped: false,

        stop() {
            this.stopped = true;
        },

        reset() {
            this.stopped = false;
        },

        enqueue(fn) {
            const run = this.chain.then(async () => {
                if (this.stopped) {
                    throw new Error('stopped');
                }
                const res = await fn();
                const jitter = Math.random() * Math.max(0, settings.requestJitterMs);
                await sleep(Math.max(250, settings.requestDelayMs) + jitter);
                return res;
            });
            this.chain = run.catch(() => {});
            return run;
        }
    };

    function readCookie(name) {
        const parts = document.cookie.split(';');
        for (const part of parts) {
            const c = part.trim();
            if (c.startsWith(`${name}=`)) {
                return decodeURIComponent(c.substring(name.length + 1));
            }
        }
        return null;
    }

    function sessionId() {
        return W.g_sessionID || readCookie('sessionid');
    }

    function formEncode(obj) {
        return Object.keys(obj)
            .filter((k) => obj[k] !== undefined && obj[k] !== null)
            .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
            .join('&');
    }

    async function request(url, options = {}) {
        return Net.enqueue(async () => {
            let attempt = 0;
            for (;;) {
                if (Net.stopped) {
                    throw new Error('stopped');
                }

                let response;
                try {
                    const init = {
                        method: options.method || 'GET',
                        credentials: 'include',
                        headers: Object.assign({ 'X-Requested-With': 'XMLHttpRequest' }, options.headers || {})
                    };
                    if (options.body) {
                        init.body = options.body;
                        init.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
                    }
                    response = await fetch(url, init);
                } catch (err) {
                    if (attempt++ >= settings.maxRetries) {
                        throw new Error(`network error: ${err.message}`);
                    }
                    await sleep(2000 * attempt);
                    continue;
                }

                if (response.status === 429) {
                    if (attempt++ >= settings.maxRetries) {
                        throw new Error('rate limited by Steam (HTTP 429)');
                    }
                    UI.log(t('logRateLimited', { sec: Math.round(settings.rateLimitBackoffMs / 1000) }), 'warn');
                    await sleep(settings.rateLimitBackoffMs);
                    continue;
                }

                if (response.status === 401 || response.status === 403) {
                    throw new Error(`not authorized (${response.status}) — please refresh or log in again`);
                }

                const text = await response.text();
                let parsed = null;
                try {
                    parsed = text ? JSON.parse(text) : {};
                } catch {
                    parsed = null;
                }

                if (!response.ok) {
                    const msg = parsed && parsed.message ? parsed.message : `HTTP ${response.status}`;
                    throw new Error(msg);
                }

                if (parsed == null) {
                    throw new Error('Steam returned a non-JSON response');
                }
                return parsed;
            }
        });
    }

    // -------------------------------------------------------- Market OrderBook

    const orderBookCache = new Map();
    const ORDER_BOOK_CACHE_MAX = 600;

    function buildOrderBook(payload) {
        const outer = payload && payload.data;
        if (!outer || !outer.success || !outer.data) {
            return null;
        }
        const d = outer.data;
        const toPairs = (flat) => {
            const out = [];
            const arr = Array.isArray(flat) ? flat : [];
            for (let i = 0; i + 1 < arr.length; i += 2) {
                out.push({ price: parseInt(arr[i], 10), quantity: parseInt(arr[i + 1], 10) });
            }
            return out;
        };

        return {
            lowestSell: d.amtMinSellOrder != null ? parseInt(d.amtMinSellOrder, 10) : null,
            highestBuy: d.amtMaxBuyOrder != null ? parseInt(d.amtMaxBuyOrder, 10) : null,
            sellOrders: toPairs(d.rgCompactSellOrders),
            buyOrders: toPairs(d.rgCompactBuyOrders)
        };
    }

    async function getOrderBook(appid, hashName) {
        const key = `${appid}\0${hashName}`;
        if (orderBookCache.has(key)) {
            return orderBookCache.get(key);
        }

        const qp = encodeURIComponent(JSON.stringify([Number(appid), hashName]));
        const url = `${ORIGIN}/market/orderbook?q=Load&qp=${qp}`;
        const book = buildOrderBook(await request(url));
        if (!book) {
            throw new Error('order book unavailable');
        }

        while (orderBookCache.size >= ORDER_BOOK_CACHE_MAX) {
            orderBookCache.delete(orderBookCache.keys().next().value);
        }
        orderBookCache.set(key, book);
        return book;
    }

    /*
     * Compute { sellerPrice, buyerPrice } for a single distinct item under the
     * chosen pricing mode, or { skipReason } if it cannot be priced safely.
     */
    function resolveListingPrice(item, book, modeConfig) {
        const step = currencyStep();
        const floor = marketMinimum();

        if (modeConfig.mode === PRICING_MODE.CUSTOM) {
            const raw = modeConfig.customInternalAmount;
            if (!raw || raw <= 0) {
                return { skipReason: 'invalid custom price' };
            }
            if (modeConfig.customSide === 'seller') {
                if (raw < floor) {
                    return { skipReason: `below minimum (${formatPrice(floor)})` };
                }
                const sellerPrice = Math.max(floor, toValidMarketPrice(raw));
                const buyerPrice = getTotalWithFees(sellerPrice, item);
                return { sellerPrice, buyerPrice };
            }
            const minBuyer = getTotalWithFees(floor, item);
            if (raw < minBuyer) {
                return { skipReason: `below minimum buyer price (${formatPrice(minBuyer)})` };
            }
            const buyerPrice = Math.max(minBuyer, toValidMarketPrice(raw));
            const sellerPrice = sellerPriceForBuyerTarget(buyerPrice, item, null);
            return { sellerPrice, buyerPrice: getTotalWithFees(sellerPrice, item) };
        }

        if (!book) {
            return { skipReason: 'no order book' };
        }

        if (modeConfig.mode === PRICING_MODE.INSTANT_SELL) {
            if (!book.highestBuy || book.highestBuy <= 0) {
                return { skipReason: 'no buy orders available' };
            }
            const sellerPrice = sellerPriceForBuyerTarget(book.highestBuy, item, null);
            return { sellerPrice, buyerPrice: getTotalWithFees(sellerPrice, item) };
        }

        if (modeConfig.mode === PRICING_MODE.MATCH_LOWEST) {
            const target = (book.lowestSell && book.lowestSell > 0)
                ? book.lowestSell
                : book.highestBuy;
            if (!target || target <= 0) {
                return { skipReason: 'no sell or buy orders' };
            }
            const sellerPrice = sellerPriceForBuyerTarget(target, item, null);
            return { sellerPrice, buyerPrice: getTotalWithFees(sellerPrice, item) };
        }

        // Default: PRICING_MODE.UNDERCUT
        if (book.lowestSell && book.lowestSell > 0) {
            const steps = Math.max(0, modeConfig.undercutSteps || 0);
            let target = book.lowestSell - steps * step;
            const bidFloor = (book.highestBuy && book.highestBuy > 0) ? book.highestBuy : null;
            if (bidFloor != null) {
                target = Math.max(target, bidFloor);
            }
            target = Math.max(floor, Math.min(target, book.lowestSell));
            const sellerPrice = sellerPriceForBuyerTarget(target, item, bidFloor);
            return { sellerPrice, buyerPrice: getTotalWithFees(sellerPrice, item) };
        }

        if (book.highestBuy && book.highestBuy > 0) {
            const sellerPrice = sellerPriceForBuyerTarget(book.highestBuy, item, null);
            return { sellerPrice, buyerPrice: getTotalWithFees(sellerPrice, item) };
        }

        return { skipReason: 'no sell or buy orders' };
    }

    async function postSellItem(item, sellerPrice) {
        const sid = sessionId();
        if (!sid) {
            throw new Error('missing sessionid cookie');
        }
        const body = formEncode({
            sessionid: sid,
            appid: item.appid,
            contextid: item.contextid,
            assetid: item.assetid,
            amount: item.amount || 1,
            price: sellerPrice
        });

        const data = await request(`${ORIGIN}/market/sellitem/`, {
            method: 'POST',
            body
        });

        if (!data || !data.success) {
            throw new Error((data && data.message) || 'Steam refused the listing');
        }
        return data;
    }

    // -------------------------------------------------------- Inventory Model

    const state = {
        items: [],           // normalized inventory items for current active tab
        byKey: new Map(),    // key -> item
        selectedKeys: new Set(),
        sessionListedKeys: new Set(),
        groupOverrides: new Map(), // `${appid}\0${hashName}` -> { mode, priceText }
        assetOverrides: new Map(), // asset key -> { mode, priceText }
        anchorKey: null,
        gridMultiSelect: false,
        searchQuery: '',
        filterMode: FILTER_MODE.ALL,
        expandedGroups: new Set(),
        lastContextSig: '',
        busy: false,
        loadingInv: false
    };

    function itemGroupKey(item) {
        return `${item.appid}\0${item.market_hash_name || item.key}`;
    }

    function itemKey(appid, contextid, assetid) {
        return `${appid}_${contextid}_${assetid}`;
    }

    function normalizeAsset(rawAsset, sessionListedKeys) {
        if (!rawAsset || typeof rawAsset !== 'object') {
            return null;
        }
        const assetid = String(rawAsset.assetid || rawAsset.id || '');
        const appid = parseInt(rawAsset.appid, 10);
        const contextid = rawAsset.contextid != null ? String(rawAsset.contextid) : '';
        if (!assetid || !appid || !contextid || rawAsset.is_currency) {
            return null;
        }

        const desc = rawAsset.description || rawAsset;
        const hashName = desc.market_hash_name || desc.market_name || desc.name || '';
        const name = desc.name || hashName || `Asset ${assetid}`;
        const key = itemKey(appid, contextid, assetid);
        const amount = parseInt(rawAsset.amount, 10) || 1;

        // Valve marks in-place CS2 listed items with description.sealed && sealed_type == 1,
        // and 7-day trade-protected items with description.sealed (other sealed_type).
        const isSealed = Boolean(desc.sealed);
        const isListed = Boolean((isSealed && Number(desc.sealed_type) === 1) || sessionListedKeys.has(key));
        const isTradeProtected = Boolean(isSealed && Number(desc.sealed_type) !== 1);
        const marketable = (desc.marketable === 1 || desc.marketable === true) && !isTradeProtected;

        return {
            key,
            appid,
            contextid,
            assetid,
            amount,
            isStackable: Boolean(rawAsset.is_stackable || amount > 1),
            market_hash_name: hashName,
            name,
            marketable,
            listed: isListed,
            tradeProtected: isTradeProtected,
            market_fee: desc.market_fee,
            icon_url: desc.icon_url || ''
        };
    }

    function marketRestrictionReason() {
        if (W.g_bMarketAllowed === false) {
            return t('marketRestricted');
        }
        const wi = walletInfo();
        if (wi && Number(wi.wallet_currency) === 0) {
            return t('noWalletCurrency');
        }
        return null;
    }

    function isOwnInventory() {
        if (!W.g_steamID) {
            return false;
        }
        if (W.g_ActiveUser && W.g_ActiveUser.strSteamId) {
            return String(W.g_ActiveUser.strSteamId) === String(W.g_steamID);
        }
        if (W.g_ActiveInventory && W.g_ActiveInventory.m_owner && W.g_ActiveInventory.m_owner.strSteamId) {
            return String(W.g_ActiveInventory.m_owner.strSteamId) === String(W.g_steamID);
        }
        return true;
    }

    function collectFromActiveInventory(inv, sessionListedKeys) {
        const out = [];
        const seen = new Set();

        const pushAsset = (raw) => {
            const norm = normalizeAsset(raw, sessionListedKeys);
            if (norm && !seen.has(norm.key)) {
                seen.add(norm.key);
                out.push(norm);
            }
        };

        if (inv && inv.m_rgChildInventories) {
            for (const cid of Object.keys(inv.m_rgChildInventories)) {
                const child = inv.m_rgChildInventories[cid];
                const assets = child && child.m_rgAssets;
                if (!assets) {
                    continue;
                }
                for (const aid of Object.keys(assets)) {
                    pushAsset(assets[aid]);
                }
            }
        }

        if (inv && inv.m_rgAssets) {
            for (const aid of Object.keys(inv.m_rgAssets)) {
                pushAsset(inv.m_rgAssets[aid]);
            }
        }

        return out;
    }

    async function ensureActiveInventoryLoaded(inv) {
        if (!inv) {
            return;
        }
        if (typeof inv.EnsureChildInventoriesReady === 'function') {
            inv.EnsureChildInventoriesReady();
        }
        if (!inv.m_bFullyLoaded && typeof inv.LoadCompleteInventory === 'function') {
            await new Promise((res, rej) => inv.LoadCompleteInventory().done(res).fail(rej));
            return;
        }
        const promises = [];
        if (inv.m_rgChildInventories && Object.keys(inv.m_rgChildInventories).length > 0) {
            for (const cid of Object.keys(inv.m_rgChildInventories)) {
                const child = inv.m_rgChildInventories[cid];
                if (child && !child.m_bFullyLoaded && typeof child.LoadCompleteInventory === 'function') {
                    promises.push(new Promise((res, rej) => child.LoadCompleteInventory().done(res).fail(rej)));
                }
            }
        }
        if (promises.length) {
            await Promise.all(promises);
        }
    }

    async function fetchInventoryFallback(steamId, appid, contextid, sessionListedKeys) {
        const out = [];
        let startAssetId = null;
        let page = 0;

        for (;;) {
            let url = `${ORIGIN}/inventory/${steamId}/${appid}/${contextid}?l=english&count=2000`;
            if (startAssetId) {
                url += `&start_assetid=${startAssetId}`;
            }
            const data = await request(url);
            if (!data || !data.success) {
                throw new Error('failed to load inventory JSON');
            }

            const descs = new Map();
            for (const d of data.descriptions || []) {
                const inst = d.instanceid && d.instanceid !== '0' ? `_${d.instanceid}` : '';
                descs.set(`${d.classid}${inst}`, d);
                descs.set(`${d.classid}_${d.instanceid || '0'}`, d);
            }

            for (const asset of data.assets || []) {
                const inst = asset.instanceid && asset.instanceid !== '0' ? `_${asset.instanceid}` : '';
                const d = descs.get(`${asset.classid}${inst}`) || descs.get(`${asset.classid}_0`);
                const merged = Object.assign({}, asset, { description: d });
                const norm = normalizeAsset(merged, sessionListedKeys);
                if (norm) {
                    out.push(norm);
                }
            }

            page++;
            if (!data.more_items || !data.last_assetid || data.last_assetid === startAssetId || page >= 40) {
                return out;
            }
            startAssetId = data.last_assetid;
        }
    }

    function duplicateKeysSet(items) {
        const seenNames = new Set();
        const dupKeys = new Set();
        for (const item of items) {
            if (!item.market_hash_name) {
                continue;
            }
            if (!seenNames.has(item.market_hash_name)) {
                // Keep the first copy (even if locked/listed) so user doesn't sell their last one.
                seenNames.add(item.market_hash_name);
            } else if (item.marketable && !item.listed) {
                dupKeys.add(item.key);
            }
        }
        return dupKeys;
    }

    function getFilteredItems() {
        const q = state.searchQuery.trim().toLowerCase();
        const dupKeys = state.filterMode === FILTER_MODE.DUPLICATES ? duplicateKeysSet(state.items) : null;

        return state.items.filter((item) => {
            if (!item.marketable) {
                return false;
            }
            if (state.filterMode === FILTER_MODE.DUPLICATES && !dupKeys.has(item.key)) {
                return false;
            }
            if (state.filterMode === FILTER_MODE.SELECTED && !state.selectedKeys.has(item.key)) {
                return false;
            }
            if (q) {
                const hay = `${item.name} ${item.market_hash_name}`.toLowerCase();
                if (!hay.includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }

    // -------------------------------------------------------- Grid Selection

    function isEligible(item) {
        return Boolean(item && item.marketable && !item.listed && !item.tradeProtected);
    }

    function resolveItemFromElement(itemEl) {
        if (!itemEl) {
            return null;
        }
        if (itemEl.id && state.byKey.has(itemEl.id)) {
            return state.byKey.get(itemEl.id);
        }
        if (itemEl.rgItem) {
            const norm = normalizeAsset(itemEl.rgItem, state.sessionListedKeys);
            if (norm) {
                if (!state.byKey.has(norm.key)) {
                    state.byKey.set(norm.key, norm);
                }
                return state.byKey.get(norm.key);
            }
        }
        return null;
    }

    function visiblePageItemKeys() {
        const container = document.getElementById('inventories');
        if (!container) {
            return [];
        }
        const keys = [];
        const holders = container.querySelectorAll('.inventory_page .itemHolder');
        for (const holder of holders) {
            // offsetParent is null when the ctn, page, or filtered holder is display:none
            if (holder.offsetParent === null) {
                continue;
            }
            const itemEl = holder.querySelector('.item');
            if (!itemEl || !itemEl.id) {
                continue;
            }
            keys.push(itemEl.id);
        }
        return keys;
    }

    function applyRangeSelection(anchorKey, targetKey) {
        const visible = visiblePageItemKeys();
        const aIdx = visible.indexOf(anchorKey);
        const bIdx = visible.indexOf(targetKey);

        if (aIdx === -1 || bIdx === -1) {
            const target = state.byKey.get(targetKey);
            if (isEligible(target)) {
                state.selectedKeys.add(targetKey);
            }
            return 1;
        }

        const start = Math.min(aIdx, bIdx);
        const end = Math.max(aIdx, bIdx);
        let added = 0;

        for (let i = start; i <= end; i++) {
            const key = visible[i];
            const item = state.byKey.get(key);
            if (isEligible(item)) {
                state.selectedKeys.add(key);
                added++;
            }
        }
        return added;
    }

    function syncGridVisuals() {
        const container = document.getElementById('inventories');
        if (!container) {
            return;
        }

        const items = container.querySelectorAll('.item');
        for (const el of items) {
            const key = el.id;
            if (!key) {
                continue;
            }
            const isSelected = state.selectedKeys.has(key);
            const isSessionListed = state.sessionListedKeys.has(key);

            el.classList.toggle('sbl-selected', isSelected);

            let checkBadge = el.querySelector('.sbl-check-badge');
            if (isSelected) {
                if (!checkBadge) {
                    checkBadge = document.createElement('div');
                    checkBadge.className = 'sbl-check-badge';
                    checkBadge.textContent = '✓';
                    el.appendChild(checkBadge);
                }
            } else if (checkBadge) {
                checkBadge.remove();
            }

            let listedBadge = el.querySelector('.sbl-listed-badge');
            if (isSessionListed && !el.classList.contains('listed_item')) {
                el.classList.add('sbl-session-listed');
                if (!listedBadge) {
                    listedBadge = document.createElement('div');
                    listedBadge.className = 'sbl-listed-badge';
                    listedBadge.textContent = 'LISTED';
                    el.appendChild(listedBadge);
                }
            } else if (listedBadge) {
                listedBadge.remove();
            }
        }
    }

    function resolveEffectiveModeConfig(item, globalModeConfig) {
        const assetOv = state.assetOverrides.get(item.key);
        const groupOv = state.groupOverrides.get(itemGroupKey(item));
        const ov = (assetOv && assetOv.mode && assetOv.mode !== 'default')
            ? assetOv
            : (groupOv && groupOv.mode && groupOv.mode !== 'default' ? groupOv : null);

        if (!ov) {
            return globalModeConfig;
        }
        if (ov.mode === PRICING_MODE.CUSTOM) {
            return {
                mode: PRICING_MODE.CUSTOM,
                customSide: 'buyer',
                customInternalAmount: parseUserPriceInput(ov.priceText),
                isOverride: true
            };
        }
        return {
            mode: ov.mode,
            undercutSteps: globalModeConfig.undercutSteps,
            customSide: globalModeConfig.customSide,
            customInternalAmount: globalModeConfig.customInternalAmount,
            isOverride: true
        };
    }

    // -------------------------------------------------------------------- UI

    const CSS = `
.sbl-selected {
    outline: 2px solid #8bc53f !important;
    outline-offset: -2px !important;
    box-shadow: inset 0 0 12px rgba(139, 197, 63, 0.45) !important;
}
.sbl-check-badge {
    position: absolute; top: 3px; right: 3px; width: 18px; height: 18px;
    border-radius: 50%; background: #5c7e10; color: #fff; font: 700 12px/18px Arial, sans-serif;
    text-align: center; pointer-events: none; z-index: 6; box-shadow: 0 1px 4px rgba(0,0,0,.7);
}
.sbl-session-listed { opacity: 0.55; }
.sbl-listed-badge {
    position: absolute; bottom: 3px; left: 3px; padding: 1px 4px; border-radius: 2px;
    background: rgba(201, 138, 25, 0.92); color: #111; font: 700 9px/1.2 Arial, sans-serif;
    pointer-events: none; z-index: 6; letter-spacing: 0.3px;
}

.sbl-panel {
    position: fixed; right: 16px; bottom: 16px; width: 475px; max-width: calc(100vw - 32px); max-height: 82vh;
    display: flex; flex-direction: column; background: #1b2838; color: #c7d5e0;
    border: 1px solid #2a475e; border-radius: 6px; box-shadow: 0 8px 28px rgba(0,0,0,.6);
    font: 12.5px/1.4 "Motiva Sans", Arial, sans-serif; z-index: 2147483000;
}
.sbl-panel.sbl-collapsed .sbl-body, .sbl-panel.sbl-collapsed .sbl-foot { display: none; }
.sbl-head {
    display: flex; align-items: center; gap: 6px; padding: 8px 10px;
    background: #171a21; border-bottom: 1px solid #2a475e; border-radius: 5px 5px 0 0;
    cursor: move; user-select: none;
}
.sbl-head b { flex: 1; font-size: 13px; color: #fff; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sbl-lang {
    background: #101822; border: 1px solid #3c5d78; color: #c7d5e0;
    border-radius: 3px; padding: 2px 4px; font-size: 11px; cursor: pointer;
}
.sbl-pill {
    padding: 3px 8px; border-radius: 3px; border: 1px solid #3c5d78;
    background: #23384c; color: #c7d5e0; cursor: pointer; font-size: 11px; font-weight: 600;
}
.sbl-pill.sbl-on { background: #4c6b22; border-color: #77a832; color: #fff; }
.sbl-min {
    background: none; border: none; color: #8f98a0; cursor: pointer;
    font-size: 16px; padding: 0 4px; line-height: 1;
}
.sbl-min:hover { color: #fff; }

.sbl-body { padding: 10px; overflow: hidden; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.sbl-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.sbl-input, .sbl-select {
    background: #101822; border: 1px solid #2a475e; color: #c7d5e0;
    border-radius: 3px; padding: 5px 7px; font-size: 12px; box-sizing: border-box;
}
.sbl-input:focus, .sbl-select:focus { outline: none; border-color: #66c0f4; }
.sbl-grow { flex: 1; min-width: 120px; }

.sbl-btn {
    padding: 6px 10px; border: none; border-radius: 3px; cursor: pointer;
    background: #2a475e; color: #c7d5e0; font-size: 12px; font-weight: 600;
}
.sbl-btn:hover:not(:disabled) { background: #39688c; color: #fff; }
.sbl-btn:disabled { opacity: .45; cursor: not-allowed; }
.sbl-btn.sbl-go { background: #5c7e10; color: #fff; flex: 1; }
.sbl-btn.sbl-go:hover:not(:disabled) { background: #6f9612; }
.sbl-btn.sbl-stop { background: #933; color: #fff; }
.sbl-btn.sbl-stop:hover:not(:disabled) { background: #b44; }
.sbl-btn.sbl-sm { padding: 4px 8px; font-size: 11px; }

.sbl-list {
    flex: 1; min-height: 120px; max-height: 235px; overflow: auto;
    border: 1px solid #2a475e; border-radius: 3px; background: #131c27;
}
.sbl-group-row, .sbl-asset-row {
    display: flex; align-items: center; gap: 5px; padding: 4px 7px;
    border-bottom: 1px solid #1e2d3d; font-size: 12px;
}
.sbl-asset-row { padding-left: 26px; background: #0f161f; font-size: 11px; color: #9db0c0; }
.sbl-group-row:last-child, .sbl-asset-row:last-child { border-bottom: none; }
.sbl-exp {
    width: 16px; padding: 0; background: none; border: none; color: #8f98a0;
    cursor: pointer; font-size: 11px; text-align: center;
}
.sbl-exp:hover { color: #fff; }
.sbl-nm { flex: 1; min-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sbl-tag-listed {
    padding: 1px 5px; border-radius: 2px; background: #7a5818; color: #f6d58e;
    font-size: 10px; font-weight: 700; flex-shrink: 0;
}
.sbl-qty {
    width: 42px; padding: 2px 3px; text-align: center; font-size: 11px;
    background: #101822; border: 1px solid #2a475e; color: #c7d5e0; border-radius: 3px;
}
.sbl-cnt { font-size: 11px; color: #8f98a0; font-variant-numeric: tabular-nums; min-width: 30px; text-align: right; }
.sbl-row-mode {
    background: #101822; border: 1px solid #2a475e; color: #c7d5e0; border-radius: 3px;
    padding: 2px 3px; font-size: 11px; max-width: 82px;
}
.sbl-row-mode.sbl-overridden { border-color: #66c0f4; color: #fff; }
.sbl-row-price {
    width: 58px; padding: 2px 4px; font-size: 11px; background: #101822;
    border: 1px solid #2a475e; color: #c7d5e0; border-radius: 3px;
}
.sbl-row-price.sbl-bad { border-color: #c94a4a; }

.sbl-price-box {
    background: #141e2a; border: 1px solid #253b4f; border-radius: 4px;
    padding: 7px 8px; display: flex; flex-direction: column; gap: 6px;
}
.sbl-hint { font-size: 11px; color: #8f98a0; }
.sbl-bar { height: 4px; background: #2a475e; border-radius: 2px; overflow: hidden; }
.sbl-bar i { display: block; height: 100%; background: #5c7e10; width: 0; transition: width .2s; }
.sbl-log {
    max-height: 115px; overflow: auto; background: #101822; border-radius: 3px;
    padding: 5px 7px; font: 11px/1.45 Consolas, monospace; color: #8f98a0;
}
.sbl-log div { white-space: pre-wrap; word-break: break-word; }
.sbl-log .sbl-e { color: #e08a8a; }
.sbl-log .sbl-w { color: #e0c98a; }
.sbl-log .sbl-s { color: #a5d16a; }
.sbl-foot {
    padding: 5px 10px; border-top: 1px solid #2a475e; font-size: 11px;
    color: #6f7c87; display: flex; justify-content: space-between;
}
`;

    const UI = {
        els: {},

        init() {
            if (document.getElementById('sbl-panel')) {
                return;
            }
            const style = document.createElement('style');
            style.textContent = CSS;
            document.head.appendChild(style);

            const panel = document.createElement('div');
            panel.id = 'sbl-panel';
            panel.className = 'sbl-panel';
            panel.innerHTML = `
                <div class="sbl-head">
                    <b id="sbl-title"></b>
                    <select class="sbl-lang" id="sbl-lang" title="Language / 语言 / 語言">
                        <option value="en">EN</option>
                        <option value="zh-CN">简中</option>
                        <option value="zh-TW">繁中</option>
                    </select>
                    <button type="button" class="sbl-pill" id="sbl-grid-toggle"></button>
                    <button type="button" class="sbl-min" id="sbl-collapse">&#8211;</button>
                </div>
                <div class="sbl-body">
                    <div class="sbl-row">
                        <input type="text" class="sbl-input sbl-grow" id="sbl-search">
                        <select class="sbl-select" id="sbl-filter">
                            <option value="all" id="sbl-opt-all"></option>
                            <option value="duplicates" id="sbl-opt-dups"></option>
                            <option value="selected" id="sbl-opt-sel"></option>
                        </select>
                        <button type="button" class="sbl-btn sbl-sm" id="sbl-reload"></button>
                    </div>
                    <div class="sbl-row">
                        <button type="button" class="sbl-btn sbl-sm" id="sbl-select-filtered"></button>
                        <button type="button" class="sbl-btn sbl-sm" id="sbl-select-dups"></button>
                        <button type="button" class="sbl-btn sbl-sm" id="sbl-clear"></button>
                        <span class="sbl-hint" id="sbl-grid-tip" style="margin-left:auto;"></span>
                    </div>
                    <div class="sbl-list" id="sbl-list"></div>
                    <div class="sbl-price-box">
                        <div class="sbl-row">
                            <label class="sbl-hint" id="sbl-pricing-lbl" for="sbl-mode"></label>
                            <select class="sbl-select sbl-grow" id="sbl-mode">
                                <option value="undercut" id="sbl-mode-undercut"></option>
                                <option value="match" id="sbl-mode-match"></option>
                                <option value="instant" id="sbl-mode-instant"></option>
                                <option value="custom" id="sbl-mode-custom"></option>
                            </select>
                            <label class="sbl-hint" id="sbl-delay-lbl" for="sbl-delay"></label>
                            <input type="number" class="sbl-input" id="sbl-delay" min="400" step="50" style="width:64px">
                            <span class="sbl-hint" id="sbl-ms-unit"></span>
                        </div>
                        <div class="sbl-row" id="sbl-mode-params"></div>
                    </div>
                    <div class="sbl-row">
                        <button type="button" class="sbl-btn sbl-go" id="sbl-uplist"></button>
                        <button type="button" class="sbl-btn sbl-stop" id="sbl-stop" disabled></button>
                    </div>
                    <div class="sbl-bar"><i id="sbl-bar-fill"></i></div>
                    <div class="sbl-log" id="sbl-log"></div>
                </div>
                <div class="sbl-foot">
                    <span id="sbl-status"></span>
                    <span>v${VERSION}</span>
                </div>
            `;
            document.body.appendChild(panel);

            const q = (id) => panel.querySelector(`#${id}`);
            this.els = {
                panel,
                title: q('sbl-title'),
                lang: q('sbl-lang'),
                gridToggle: q('sbl-grid-toggle'),
                collapse: q('sbl-collapse'),
                search: q('sbl-search'),
                filter: q('sbl-filter'),
                optAll: q('sbl-opt-all'),
                optDups: q('sbl-opt-dups'),
                optSel: q('sbl-opt-sel'),
                reload: q('sbl-reload'),
                selectFiltered: q('sbl-select-filtered'),
                selectDups: q('sbl-select-dups'),
                clear: q('sbl-clear'),
                gridTip: q('sbl-grid-tip'),
                list: q('sbl-list'),
                pricingLbl: q('sbl-pricing-lbl'),
                mode: q('sbl-mode'),
                modeUndercut: q('sbl-mode-undercut'),
                modeMatch: q('sbl-mode-match'),
                modeInstant: q('sbl-mode-instant'),
                modeCustom: q('sbl-mode-custom'),
                delayLbl: q('sbl-delay-lbl'),
                delay: q('sbl-delay'),
                msUnit: q('sbl-ms-unit'),
                modeParams: q('sbl-mode-params'),
                uplist: q('sbl-uplist'),
                stop: q('sbl-stop'),
                barFill: q('sbl-bar-fill'),
                log: q('sbl-log'),
                status: q('sbl-status')
            };

            this.els.lang.value = currentLang();
            this.els.mode.value = settings.pricingMode;
            this.els.delay.value = settings.requestDelayMs;
            this.makeDraggable(panel, panel.querySelector('.sbl-head'));
            this.bindPanelEvents();
            this.applyTranslations();
        },

        applyTranslations() {
            const { els } = this;
            if (!els.panel) {
                return;
            }
            els.title.textContent = t('title');
            els.gridToggle.textContent = state.gridMultiSelect ? t('gridPickOn') : t('gridPickOff');
            els.gridToggle.title = t('gridPickTitle');
            els.collapse.title = t('collapseTitle');
            els.search.placeholder = t('searchPlaceholder');
            els.optAll.textContent = t('filterAll');
            els.optDups.textContent = t('filterDuplicates');
            els.optSel.textContent = t('filterSelected');
            els.reload.textContent = t('reloadBtn');
            els.reload.title = t('reloadTitle');
            els.selectFiltered.textContent = t('selectFilteredBtn');
            els.selectDups.textContent = t('selectDupsBtn');
            els.gridTip.textContent = t('gridTip');
            els.pricingLbl.textContent = t('pricingLabel');
            els.modeUndercut.textContent = t('modeUndercut');
            els.modeMatch.textContent = t('modeMatch');
            els.modeInstant.textContent = t('modeInstant');
            els.modeCustom.textContent = t('modeCustom');
            els.delayLbl.textContent = t('delayLabel');
            els.delayLbl.title = t('delayTitle');
            els.msUnit.textContent = t('msUnit');
            els.stop.textContent = t('stopBtn');
            const readyTexts = new Set([I18N.en.statusReady, I18N['zh-CN'].statusReady, I18N['zh-TW'].statusReady]);
            if (!els.status.textContent || readyTexts.has(els.status.textContent)) {
                els.status.textContent = t('statusReady');
            }
            this.renderModeParams();
            this.renderChecklist();
            this.updateSelectionButtons();
        },

        makeDraggable(panel, handle) {
            let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
            handle.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') {
                    return;
                }
                dragging = true;
                const r = panel.getBoundingClientRect();
                sx = e.clientX;
                sy = e.clientY;
                ox = r.left;
                oy = r.top;
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
                panel.style.left = `${ox}px`;
                panel.style.top = `${oy}px`;
                e.preventDefault();
            });
            document.addEventListener('mousemove', (e) => {
                if (!dragging) {
                    return;
                }
                panel.style.left = `${Math.max(0, ox + e.clientX - sx)}px`;
                panel.style.top = `${Math.max(0, oy + e.clientY - sy)}px`;
            });
            document.addEventListener('mouseup', () => {
                dragging = false;
            });
        },

        bindPanelEvents() {
            const { els } = this;

            els.lang.addEventListener('change', () => {
                settings.lang = els.lang.value;
                saveSettings(settings);
                this.applyTranslations();
            });

            els.collapse.addEventListener('click', () => {
                const collapsed = els.panel.classList.toggle('sbl-collapsed');
                els.collapse.textContent = collapsed ? '+' : '–';
            });

            els.gridToggle.addEventListener('click', () => {
                state.gridMultiSelect = !state.gridMultiSelect;
                els.gridToggle.classList.toggle('sbl-on', state.gridMultiSelect);
                els.gridToggle.textContent = state.gridMultiSelect ? t('gridPickOn') : t('gridPickOff');
            });

            els.search.addEventListener('input', () => {
                state.searchQuery = els.search.value;
                this.renderChecklist();
            });

            els.filter.addEventListener('change', () => {
                state.filterMode = els.filter.value;
                this.renderChecklist();
            });

            els.reload.addEventListener('click', () => refreshInventory(true));

            els.selectFiltered.addEventListener('click', () => {
                const items = getFilteredItems();
                let added = 0;
                for (const item of items) {
                    if (isEligible(item) && !state.selectedKeys.has(item.key)) {
                        state.selectedKeys.add(item.key);
                        added++;
                    }
                }
                this.log(t('logSelectedFiltered', { n: added }), 'ok');
                this.syncAllViews();
            });

            els.selectDups.addEventListener('click', () => {
                const dups = duplicateKeysSet(state.items);
                let added = 0;
                for (const k of dups) {
                    if (!state.selectedKeys.has(k)) {
                        state.selectedKeys.add(k);
                        added++;
                    }
                }
                this.log(t('logSelectedDups', { n: added }), 'ok');
                this.syncAllViews();
            });

            els.clear.addEventListener('click', () => {
                state.selectedKeys.clear();
                state.assetOverrides.clear();
                state.groupOverrides.clear();
                state.anchorKey = null;
                this.syncAllViews();
            });

            els.mode.addEventListener('change', () => {
                settings.pricingMode = els.mode.value;
                saveSettings(settings);
                this.renderModeParams();
            });

            els.delay.addEventListener('change', () => {
                const v = parseInt(els.delay.value, 10);
                if (Number.isFinite(v) && v >= 400) {
                    settings.requestDelayMs = v;
                    saveSettings(settings);
                } else {
                    els.delay.value = settings.requestDelayMs;
                }
            });

            els.uplist.addEventListener('click', () => runBatchUplist());

            els.stop.addEventListener('click', () => {
                Net.stop();
                this.log(t('logStopping'), 'warn');
            });
        },

        renderModeParams() {
            const box = this.els.modeParams;
            if (!box) {
                return;
            }
            box.innerHTML = '';
            const mode = settings.pricingMode;

            if (mode === PRICING_MODE.UNDERCUT) {
                const lbl = document.createElement('span');
                lbl.className = 'sbl-hint';
                lbl.textContent = t('undercutBy');

                const inp = document.createElement('input');
                inp.type = 'number';
                inp.min = '0';
                inp.className = 'sbl-input';
                inp.style.width = '56px';
                inp.value = settings.undercutSteps;

                const hint = document.createElement('span');
                hint.className = 'sbl-hint';
                const updateHint = () => {
                    const steps = Math.max(0, parseInt(inp.value, 10) || 0);
                    hint.textContent = t('undercutHint', { price: formatPrice(steps * currencyStep()) });
                };
                updateHint();

                inp.addEventListener('input', () => {
                    const v = Math.max(0, parseInt(inp.value, 10) || 0);
                    settings.undercutSteps = v;
                    saveSettings(settings);
                    updateHint();
                });
                inp.addEventListener('change', () => {
                    const v = Math.max(0, parseInt(inp.value, 10) || 0);
                    settings.undercutSteps = v;
                    inp.value = v;
                    saveSettings(settings);
                    updateHint();
                });

                box.append(lbl, inp, hint);
                return;
            }

            if (mode === PRICING_MODE.MATCH_LOWEST) {
                const hint = document.createElement('span');
                hint.className = 'sbl-hint';
                hint.textContent = t('matchHint');
                box.appendChild(hint);
                return;
            }

            if (mode === PRICING_MODE.INSTANT_SELL) {
                const hint = document.createElement('span');
                hint.className = 'sbl-hint';
                hint.textContent = t('instantHint');
                box.appendChild(hint);
                return;
            }

            // PRICING_MODE.CUSTOM
            const sideSel = document.createElement('select');
            sideSel.className = 'sbl-select';
            const optBuyer = document.createElement('option');
            optBuyer.value = 'buyer';
            optBuyer.textContent = t('sideBuyer');
            const optSeller = document.createElement('option');
            optSeller.value = 'seller';
            optSeller.textContent = t('sideSeller');
            sideSel.append(optBuyer, optSeller);
            sideSel.value = settings.customPriceSide;

            const priceInp = document.createElement('input');
            priceInp.type = 'text';
            priceInp.className = 'sbl-input';
            priceInp.style.width = '88px';
            priceInp.placeholder = t('pricePlaceholder');
            priceInp.value = settings.customPriceText || '';

            const preview = document.createElement('span');
            preview.className = 'sbl-hint';

            const sampleItem = state.items.find((i) => i.marketable) || { appid: state.items[0]?.appid || 730 };
            const updatePreview = () => {
                const parsed = parseUserPriceInput(priceInp.value);
                if (!parsed || parsed <= 0) {
                    preview.textContent = t('enterPriceIn', { code: currencyCode() });
                    return;
                }
                const floor = marketMinimum();
                if (sideSel.value === 'seller') {
                    if (parsed < floor) {
                        preview.textContent = t('minReceive', { price: formatPrice(floor) });
                        return;
                    }
                    const seller = Math.max(floor, toValidMarketPrice(parsed));
                    const buyer = getTotalWithFees(seller, sampleItem);
                    preview.textContent = t('buyerPaysEst', { price: formatPrice(buyer) });
                } else {
                    const minBuyer = getTotalWithFees(floor, sampleItem);
                    if (parsed < minBuyer) {
                        preview.textContent = t('minBuyerPays', { price: formatPrice(minBuyer) });
                        return;
                    }
                    const buyer = Math.max(minBuyer, toValidMarketPrice(parsed));
                    const seller = sellerPriceForBuyerTarget(buyer, sampleItem, null);
                    preview.textContent = t('youGetApprox', { price: formatPrice(seller) });
                }
            };
            updatePreview();

            sideSel.addEventListener('change', () => {
                settings.customPriceSide = sideSel.value;
                saveSettings(settings);
                updatePreview();
            });
            priceInp.addEventListener('input', () => {
                settings.customPriceText = priceInp.value;
                saveSettings(settings);
                updatePreview();
            });

            box.append(sideSel, priceInp, preview);
        },

        buildOverrideControls(overrideMap, overrideKey, sampleItem) {
            const existing = overrideMap.get(overrideKey) || { mode: 'default', priceText: '' };

            const sel = document.createElement('select');
            sel.className = 'sbl-row-mode';
            sel.title = t('rowOverrideTip');

            const choices = [
                ['default', t('rowModeDefault')],
                [PRICING_MODE.UNDERCUT, t('rowModeUndercut')],
                [PRICING_MODE.MATCH_LOWEST, t('rowModeMatch')],
                [PRICING_MODE.INSTANT_SELL, t('rowModeInstant')],
                [PRICING_MODE.CUSTOM, t('rowModeCustom')]
            ];
            for (const [val, label] of choices) {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = label;
                sel.appendChild(opt);
            }
            sel.value = existing.mode;
            sel.classList.toggle('sbl-overridden', existing.mode !== 'default');

            const wrap = document.createDocumentFragment();
            wrap.appendChild(sel);

            let priceInp = null;
            if (existing.mode === PRICING_MODE.CUSTOM) {
                priceInp = document.createElement('input');
                priceInp.type = 'text';
                priceInp.className = 'sbl-row-price';
                priceInp.placeholder = t('rowPricePlaceholder');
                priceInp.value = existing.priceText || '';

                const syncPriceState = () => {
                    const parsed = parseUserPriceInput(priceInp.value);
                    const minBuyer = getTotalWithFees(marketMinimum(), sampleItem);
                    const valid = parsed >= minBuyer;
                    priceInp.classList.toggle('sbl-bad', Boolean(priceInp.value.trim()) && !valid);
                    if (valid) {
                        const buyer = toValidMarketPrice(parsed);
                        const seller = sellerPriceForBuyerTarget(buyer, sampleItem, null);
                        priceInp.title = t('rowPriceTitle', {
                            buyer: formatPrice(getTotalWithFees(seller, sampleItem)),
                            seller: formatPrice(seller)
                        });
                    } else {
                        priceInp.title = t('rowPriceInvalid', { min: formatPrice(minBuyer) });
                    }
                };
                syncPriceState();

                priceInp.addEventListener('input', () => {
                    const cur = overrideMap.get(overrideKey) || { mode: PRICING_MODE.CUSTOM, priceText: '' };
                    cur.priceText = priceInp.value;
                    overrideMap.set(overrideKey, cur);
                    syncPriceState();
                });

                wrap.appendChild(priceInp);
            }

            sel.addEventListener('change', () => {
                if (sel.value === 'default') {
                    overrideMap.delete(overrideKey);
                } else {
                    const prev = overrideMap.get(overrideKey);
                    overrideMap.set(overrideKey, {
                        mode: sel.value,
                        priceText: prev ? prev.priceText : ''
                    });
                }
                this.renderChecklist();
            });

            return wrap;
        },

        renderChecklist() {
            const list = this.els.list;
            if (!list) {
                return;
            }
            list.innerHTML = '';

            if (state.loadingInv) {
                const msg = document.createElement('div');
                msg.className = 'sbl-group-row';
                msg.textContent = t('emptyLoading');
                list.appendChild(msg);
                return;
            }

            const filtered = getFilteredItems();
            if (!filtered.length) {
                const msg = document.createElement('div');
                msg.className = 'sbl-group-row';
                msg.textContent = state.items.length ? t('emptyNoMatch') : t('emptyNoMarketable');
                list.appendChild(msg);
                return;
            }

            // Group identical market_hash_name items while keeping asset-level control.
            const groups = new Map();
            for (const item of filtered) {
                const gKey = itemGroupKey(item);
                if (!groups.has(gKey)) {
                    groups.set(gKey, []);
                }
                groups.get(gKey).push(item);
            }

            const frag = document.createDocumentFragment();

            for (const [gKey, groupItems] of groups) {
                const first = groupItems[0];
                const eligible = groupItems.filter(isEligible);
                const selectedInGroup = eligible.filter((i) => state.selectedKeys.has(i.key));
                const listedCount = groupItems.filter((i) => i.listed).length;
                const allListed = eligible.length === 0 && listedCount > 0;

                const row = document.createElement('div');
                row.className = 'sbl-group-row';

                if (groupItems.length > 1) {
                    const exp = document.createElement('button');
                    exp.type = 'button';
                    exp.className = 'sbl-exp';
                    const expanded = state.expandedGroups.has(gKey);
                    exp.textContent = expanded ? '▾' : '▸';
                    exp.title = t('expandTitle');
                    exp.addEventListener('click', () => {
                        if (state.expandedGroups.has(gKey)) {
                            state.expandedGroups.delete(gKey);
                        } else {
                            state.expandedGroups.add(gKey);
                        }
                        this.renderChecklist();
                    });
                    row.appendChild(exp);
                } else {
                    const spacer = document.createElement('span');
                    spacer.style.width = '16px';
                    row.appendChild(spacer);
                }

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.disabled = eligible.length === 0;
                cb.checked = eligible.length > 0 && selectedInGroup.length === eligible.length;
                cb.indeterminate = selectedInGroup.length > 0 && selectedInGroup.length < eligible.length;
                cb.addEventListener('change', () => {
                    for (const it of eligible) {
                        if (cb.checked) {
                            state.selectedKeys.add(it.key);
                        } else {
                            state.selectedKeys.delete(it.key);
                        }
                    }
                    this.syncAllViews();
                });
                row.appendChild(cb);

                const nameEl = document.createElement('span');
                nameEl.className = 'sbl-nm';
                nameEl.title = first.market_hash_name || first.name;
                nameEl.textContent = first.isStackable && groupItems.length === 1
                    ? `${first.name} (x${first.amount})`
                    : first.name;
                row.appendChild(nameEl);

                if (allListed) {
                    const tag = document.createElement('span');
                    tag.className = 'sbl-tag-listed';
                    tag.textContent = t('listedTag');
                    row.appendChild(tag);
                } else if (groupItems.length > 1) {
                    if (listedCount > 0) {
                        const ltag = document.createElement('span');
                        ltag.className = 'sbl-tag-listed';
                        ltag.textContent = t('listedCountTag', { n: listedCount });
                        row.appendChild(ltag);
                    }
                    const qty = document.createElement('input');
                    qty.type = 'number';
                    qty.className = 'sbl-qty';
                    qty.min = '0';
                    qty.max = String(eligible.length);
                    qty.value = String(selectedInGroup.length);
                    qty.title = t('qtyTitle', { max: eligible.length });
                    qty.addEventListener('change', () => {
                        const targetN = Math.max(0, Math.min(eligible.length, parseInt(qty.value, 10) || 0));
                        for (const it of eligible) {
                            state.selectedKeys.delete(it.key);
                        }
                        for (let i = 0; i < targetN; i++) {
                            state.selectedKeys.add(eligible[i].key);
                        }
                        this.syncAllViews();
                    });
                    row.appendChild(qty);

                    const cnt = document.createElement('span');
                    cnt.className = 'sbl-cnt';
                    cnt.textContent = `/ ${eligible.length}`;
                    row.appendChild(cnt);
                }

                // Per-item / per-group price override when selected
                if (selectedInGroup.length > 0) {
                    if (groupItems.length === 1) {
                        row.appendChild(this.buildOverrideControls(state.assetOverrides, first.key, first));
                    } else {
                        row.appendChild(this.buildOverrideControls(state.groupOverrides, gKey, first));
                    }
                }

                frag.appendChild(row);

                if (groupItems.length > 1 && state.expandedGroups.has(gKey)) {
                    for (const asset of groupItems) {
                        const sub = document.createElement('div');
                        sub.className = 'sbl-asset-row';

                        const acb = document.createElement('input');
                        acb.type = 'checkbox';
                        acb.disabled = !isEligible(asset);
                        acb.checked = state.selectedKeys.has(asset.key);
                        acb.addEventListener('change', () => {
                            if (acb.checked) {
                                state.selectedKeys.add(asset.key);
                            } else {
                                state.selectedKeys.delete(asset.key);
                            }
                            this.syncAllViews();
                        });
                        sub.appendChild(acb);

                        const lbl = document.createElement('span');
                        lbl.className = 'sbl-nm';
                        lbl.textContent = `#${asset.assetid}${asset.isStackable ? ` (x${asset.amount})` : ''}`;
                        sub.appendChild(lbl);

                        if (asset.listed) {
                            const tag = document.createElement('span');
                            tag.className = 'sbl-tag-listed';
                            tag.textContent = t('listedTag');
                            sub.appendChild(tag);
                        } else if (state.selectedKeys.has(asset.key)) {
                            sub.appendChild(this.buildOverrideControls(state.assetOverrides, asset.key, asset));
                        }
                        frag.appendChild(sub);
                    }
                }
            }

            list.appendChild(frag);
        },

        updateSelectionButtons() {
            const count = this.selectedEligibleItems().length;
            const restricted = Boolean(marketRestrictionReason());
            if (this.els.clear) {
                this.els.clear.textContent = t('clearBtn', { n: count });
                this.els.clear.disabled = state.busy || count === 0;
            }
            if (this.els.uplist) {
                this.els.uplist.textContent = t('uplistBtn', { n: count });
                this.els.uplist.disabled = state.busy || restricted || count === 0;
            }
        },

        selectedEligibleItems() {
            const out = [];
            for (const key of state.selectedKeys) {
                const item = state.byKey.get(key);
                if (isEligible(item)) {
                    out.push(item);
                }
            }
            return out;
        },

        syncAllViews() {
            syncGridVisuals();
            this.renderChecklist();
            this.updateSelectionButtons();
        },

        setBusy(on) {
            state.busy = on;
            const { els } = this;
            if (els.stop) els.stop.disabled = !on;
            if (els.reload) els.reload.disabled = on;
            if (els.selectFiltered) els.selectFiltered.disabled = on;
            if (els.selectDups) els.selectDups.disabled = on;
            if (els.mode) els.mode.disabled = on;
            this.updateSelectionButtons();
        },

        status(text) {
            if (this.els.status) {
                this.els.status.textContent = text;
            }
        },

        progress(done, total) {
            if (this.els.barFill) {
                this.els.barFill.style.width = total > 0 ? `${Math.min(100, (done / total) * 100)}%` : '0';
            }
        },

        log(message, kind = '') {
            const el = this.els.log;
            if (!el) {
                return;
            }
            const line = document.createElement('div');
            line.className = kind === 'error' ? 'sbl-e' : kind === 'warn' ? 'sbl-w' : kind === 'ok' ? 'sbl-s' : '';
            line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            el.appendChild(line);
            while (el.childElementCount > 300) {
                el.removeChild(el.firstChild);
            }
            el.scrollTop = el.scrollHeight;
        }
    };

    // -------------------------------------------------------- Batch Uplisting

    function readModeConfig() {
        return {
            mode: settings.pricingMode,
            undercutSteps: settings.undercutSteps,
            customSide: settings.customPriceSide,
            customInternalAmount: parseUserPriceInput(settings.customPriceText)
        };
    }

    function describePricingMode(modeConfig) {
        if (modeConfig.mode === PRICING_MODE.UNDERCUT) {
            return `${t('modeUndercut')} (-${formatPrice((modeConfig.undercutSteps || 0) * currencyStep())})`;
        }
        if (modeConfig.mode === PRICING_MODE.MATCH_LOWEST) {
            return t('modeMatch');
        }
        if (modeConfig.mode === PRICING_MODE.INSTANT_SELL) {
            return t('modeInstant');
        }
        const side = modeConfig.customSide === 'seller' ? t('sideSeller') : t('sideBuyer');
        return `${t('modeCustom')} (${side}: ${formatPrice(modeConfig.customInternalAmount)})`;
    }

    async function runBatchUplist() {
        if (state.busy) {
            return;
        }

        const restricted = marketRestrictionReason();
        if (restricted) {
            UI.log(restricted, 'error');
            return;
        }

        const selected = UI.selectedEligibleItems();
        if (!selected.length) {
            UI.log(t('logNoEligible'), 'warn');
            return;
        }

        const globalModeConfig = readModeConfig();
        const itemConfigs = new Map();

        for (const item of selected) {
            const cfg = resolveEffectiveModeConfig(item, globalModeConfig);
            if (cfg.mode === PRICING_MODE.CUSTOM) {
                const minNeeded = cfg.customSide === 'seller'
                    ? marketMinimum()
                    : getTotalWithFees(marketMinimum(), item);
                if (!cfg.customInternalAmount || cfg.customInternalAmount < minNeeded) {
                    UI.log(
                        cfg.isOverride
                            ? t('logInvalidRowCustom', { name: item.name })
                            : t('logInvalidCustom'),
                        'error'
                    );
                    return;
                }
            }
            itemConfigs.set(item.key, cfg);
        }

        if (selected.length >= BIG_BATCH_CONFIRM_THRESHOLD && typeof W.confirm === 'function') {
            const ok = W.confirm(
                t('confirmBigBatch', {
                    count: selected.length,
                    mode: describePricingMode(globalModeConfig)
                })
            );
            if (!ok) {
                UI.log(t('logBatchCancelled'), 'warn');
                return;
            }
        }

        Net.reset();
        orderBookCache.clear();
        UI.setBusy(true);
        UI.progress(0, selected.length);

        const groups = new Map();
        for (const item of selected) {
            const gKey = itemGroupKey(item);
            if (!groups.has(gKey)) {
                groups.set(gKey, []);
            }
            groups.get(gKey).push(item);
        }

        let done = 0;
        let listed = 0;
        let failed = 0;
        let skipped = 0;
        let expectedSellerTotal = 0;
        let needsMobileConfirm = false;

        try {
            UI.log(t('logUplistingStart', { total: selected.length, groups: groups.size }));

            for (const [, group] of groups) {
                if (Net.stopped) {
                    break;
                }
                const rep = group[0];
                const groupNeedsBook = group.some((it) => itemConfigs.get(it.key).mode !== PRICING_MODE.CUSTOM);
                let book = null;

                if (groupNeedsBook) {
                    UI.status(t('statusChecking', { name: rep.name }));
                    try {
                        book = await getOrderBook(rep.appid, rep.market_hash_name);
                    } catch (err) {
                        // Even if orderbook failed, items with a Custom override in this group can still list!
                        const customItems = group.filter((it) => itemConfigs.get(it.key).mode === PRICING_MODE.CUSTOM);
                        const nonCustomCount = group.length - customItems.length;
                        if (nonCustomCount > 0) {
                            UI.log(t('logSkipped', { name: rep.name, reason: err.message }), 'warn');
                            skipped += nonCustomCount;
                            done += nonCustomCount;
                            UI.progress(done, selected.length);
                        }
                        if (!customItems.length) {
                            continue;
                        }
                    }
                }

                for (const item of group) {
                    if (Net.stopped) {
                        break;
                    }
                    const cfg = itemConfigs.get(item.key);
                    if (cfg.mode !== PRICING_MODE.CUSTOM && !book) {
                        continue;
                    }

                    const resolved = resolveListingPrice(item, book, cfg);
                    if (resolved.skipReason) {
                        UI.log(t('logSkipped', { name: item.name, reason: resolved.skipReason }), 'warn');
                        skipped++;
                        done++;
                        UI.progress(done, selected.length);
                        continue;
                    }

                    UI.status(t('statusListing', { done: done + 1, total: selected.length, name: item.name }));

                    try {
                        const res = await postSellItem(item, resolved.sellerPrice);
                        if (res.requires_confirmation) {
                            needsMobileConfirm = true;
                        }
                        listed++;
                        expectedSellerTotal += resolved.sellerPrice * (item.amount || 1);
                        item.listed = true;
                        state.sessionListedKeys.add(item.key);
                        state.selectedKeys.delete(item.key);
                        state.assetOverrides.delete(item.key);

                        UI.log(
                            t('logListedItem', {
                                name: item.name,
                                qty: item.amount > 1 ? ` x${item.amount}` : '',
                                buyer: formatPrice(resolved.buyerPrice),
                                seller: formatPrice(resolved.sellerPrice)
                            }),
                            'ok'
                        );
                        syncGridVisuals();
                    } catch (err) {
                        failed++;
                        UI.log(t('logFailedItem', { name: item.name, assetid: item.assetid, err: err.message }), 'error');
                    }

                    done++;
                    UI.progress(done, selected.length);
                }
            }

            UI.log(
                t('logFinished', {
                    listed,
                    failed,
                    skipped,
                    payout: formatPrice(expectedSellerTotal)
                }),
                listed > 0 ? 'ok' : 'warn'
            );
            if (needsMobileConfirm) {
                UI.log(t('logMobileConfirm'), 'warn');
            }
            UI.status(t('statusDone', { n: listed }));
        } catch (err) {
            if (err.message === 'stopped') {
                UI.log(t('logStoppedByUser'), 'warn');
                UI.status(t('statusStopped'));
            } else {
                UI.log(err.message, 'error');
                UI.status(t('statusFailed'));
            }
        } finally {
            UI.setBusy(false);
            Net.reset();
            UI.syncAllViews();
        }
    }

    // -------------------------------------------------------- Inventory Sync

    function activeContextSignature() {
        const inv = W.g_ActiveInventory;
        if (inv) {
            const appid = inv.appid ?? inv.m_appid ?? '';
            const ctx = inv.contextid ?? inv.m_contextid ?? '';
            return `${appid}_${ctx}`;
        }
        return window.location.hash.match(/^#(\d+_\d+)/)?.[1] || '';
    }

    async function refreshInventory(forceFullLoad = false) {
        if (!isOwnInventory() || state.loadingInv) {
            return;
        }
        const inv = W.g_ActiveInventory;
        if (!inv) {
            return;
        }

        state.loadingInv = true;
        state.lastContextSig = activeContextSignature();
        UI.status(t('statusLoading'));
        UI.renderChecklist();

        try {
            const appid = inv.appid ?? inv.m_appid;
            const ctx = inv.contextid ?? inv.m_contextid;
            let items = [];

            const fetchAllContexts = async () => {
                const ctxIds = (Array.isArray(inv.m_rgContextIds) && inv.m_rgContextIds.length)
                    ? inv.m_rgContextIds
                    : Object.keys(inv.m_rgChildInventories || {});
                const seen = new Set();
                const merged = [];
                for (const cid of ctxIds) {
                    if (!cid || String(cid) === '0') {
                        continue;
                    }
                    const part = await fetchInventoryFallback(String(W.g_steamID), appid, String(cid), state.sessionListedKeys);
                    for (const it of part) {
                        if (!seen.has(it.key)) {
                            seen.add(it.key);
                            merged.push(it);
                        }
                    }
                }
                return merged;
            };

            if (forceFullLoad && W.g_steamID && appid && ctx != null) {
                items = String(ctx) === '0'
                    ? await fetchAllContexts()
                    : await fetchInventoryFallback(String(W.g_steamID), appid, String(ctx), state.sessionListedKeys);
            } else {
                if (!inv.m_bFullyLoaded) {
                    await ensureActiveInventoryLoaded(inv);
                }
                items = collectFromActiveInventory(inv, state.sessionListedKeys);
                if (!items.length && W.g_steamID && appid && ctx != null) {
                    items = String(ctx) === '0'
                        ? await fetchAllContexts()
                        : await fetchInventoryFallback(String(W.g_steamID), appid, String(ctx), state.sessionListedKeys);
                }
            }

            state.items = items;
            state.byKey = new Map(items.map((it) => [it.key, it]));

            // Drop any selected keys that no longer exist in this context.
            for (const k of [...state.selectedKeys]) {
                const it = state.byKey.get(k);
                if (!it || !isEligible(it)) {
                    state.selectedKeys.delete(k);
                }
            }

            const marketableCount = items.filter((i) => i.marketable).length;
            const eligibleCount = items.filter(isEligible).length;
            UI.status(t('statusListable', { eligible: eligibleCount, marketable: marketableCount }));
        } catch (err) {
            UI.log(t('logInvLoadErr', { err: err.message }), 'error');
            UI.status(t('statusLoadError'));
        } finally {
            state.loadingInv = false;
            UI.syncAllViews();
        }
    }

    function bindInventoryHooks() {
        const inventoriesEl = document.getElementById('inventories');
        if (!inventoriesEl) {
            return;
        }

        // Capture-phase click handler on the Steam Inventory grid
        inventoriesEl.addEventListener(
            'click',
            (e) => {
                if (!isOwnInventory()) {
                    return;
                }
                if (e.target.closest('button, input, select')) {
                    return;
                }
                const itemEl = e.target.closest('.item');
                if (!itemEl) {
                    return;
                }

                const item = resolveItemFromElement(itemEl);
                if (!item) {
                    return;
                }

                const modifierPressed = e.ctrlKey || e.metaKey || e.shiftKey;
                if (!modifierPressed && !state.gridMultiSelect) {
                    // Normal Steam click: leave Steam's native behavior intact, just record anchor.
                    if (isEligible(item)) {
                        state.anchorKey = item.key;
                    }
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                if (!item.marketable) {
                    UI.log(t('logNotMarketable', { name: item.name }), 'warn');
                    return;
                }
                if (item.listed) {
                    UI.log(t('logAlreadyListed', { name: item.name }), 'warn');
                    return;
                }
                if (item.tradeProtected) {
                    UI.log(t('logTradeProtected', { name: item.name }), 'warn');
                    return;
                }

                if (e.shiftKey && state.anchorKey) {
                    applyRangeSelection(state.anchorKey, item.key);
                } else if (state.selectedKeys.has(item.key)) {
                    state.selectedKeys.delete(item.key);
                } else {
                    state.selectedKeys.add(item.key);
                    state.anchorKey = item.key;
                }

                UI.syncAllViews();
            },
            true
        );

        let rafPending = false;
        const observer = new MutationObserver(() => {
            if (rafPending) {
                return;
            }
            rafPending = true;
            requestAnimationFrame(() => {
                rafPending = false;
                const sig = activeContextSignature();
                if (sig && sig !== state.lastContextSig) {
                    refreshInventory(false);
                } else {
                    syncGridVisuals();
                }
            });
        });

        observer.observe(inventoriesEl, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        window.addEventListener('hashchange', () => {
            const sig = activeContextSignature();
            if (sig && sig !== state.lastContextSig) {
                setTimeout(() => refreshInventory(false), 150);
            }
        });
    }

    // ---------------------------------------------------------------- Test API

    if (W.__SBL_TEST__) {
        Object.assign(W.__SBL_TEST__, {
            PRICING_MODE,
            FILTER_MODE,
            I18N,
            currentLang,
            t,
            currencyCode,
            currencyStep,
            marketMinimum,
            parseUserPriceInput,
            toValidMarketPrice,
            getTotalWithFees,
            sellerPriceForBuyerTarget,
            buildOrderBook,
            resolveListingPrice,
            resolveEffectiveModeConfig,
            itemGroupKey,
            normalizeAsset,
            collectFromActiveInventory,
            duplicateKeysSet,
            getFilteredItems,
            applyRangeSelection,
            marketRestrictionReason,
            runBatchUplist,
            UI,
            state,
            settings,
            resetTestState(newSettings = {}) {
                Object.assign(settings, DEFAULTS, newSettings);
                state.items = [];
                state.byKey = new Map();
                state.selectedKeys = new Set();
                state.sessionListedKeys = new Set();
                state.groupOverrides = new Map();
                state.assetOverrides = new Map();
                state.anchorKey = null;
                state.gridMultiSelect = false;
                state.searchQuery = '';
                state.filterMode = FILTER_MODE.ALL;
                state.expandedGroups = new Set();
                orderBookCache.clear();
                Net.reset();
            }
        });
        return;
    }

    // ------------------------------------------------------------------- Boot

    function boot() {
        if (!/steamcommunity\.com\/(id\/[^/]+|profiles\/[^/]+|my)\/inventory/.test(window.location.href)) {
            return;
        }
        if (!isOwnInventory()) {
            return;
        }

        UI.init();
        bindInventoryHooks();
        const restricted = marketRestrictionReason();
        if (restricted) {
            UI.log(restricted, 'warn');
            UI.status(t('statusRestricted'));
        } else {
            UI.log(t('logReady'), 'ok');
        }

        // Wait briefly for g_ActiveInventory to finish initializing if Steam just loaded.
        let tries = 0;
        const waitInv = setInterval(() => {
            tries++;
            if (W.g_ActiveInventory || tries >= 25) {
                clearInterval(waitInv);
                if (W.g_ActiveInventory) {
                    refreshInventory(false);
                }
            }
        }, 250);
    }

    if (document.readyState === 'complete') {
        setTimeout(boot, 500);
    } else {
        window.addEventListener('load', () => setTimeout(boot, 500));
    }
})();
