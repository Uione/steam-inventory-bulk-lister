# Steam Inventory Bulk Uplist / Steam 库存批量上架助手

[English](#english) | [简体中文](#简体中文)

---

<a id="english"></a>

## English

A lightweight, open-source **Tampermonkey / Violentmonkey** userscript for **Steam Community Inventories** that lets you multi-select items directly on the inventory grid or from a searchable checklist and bulk-uplist them onto the Steam Community Market in one go.

Built for the **2026 Steam Community Market** updates:
- Uses `/market/orderbook` (replacing the retired `/market/itemordershistogram` endpoint) and `/market/sellitem/`.
- Detects CS2 in-place listed items (`sealed_type === 1`) and 7-day trade-protected items so already-listed items are tagged `LISTED` and never double-listed.
- Uses Steam's `GetTotalWithFees` / `ToValidMarketPrice` fee and currency-increment rules (including zero-decimal currencies and rounding down through unreachable buyer-price gaps).
- Serializes requests with configurable delay + jitter and automatic HTTP `429` rate-limit backoff.

### Features

- **Grid Multi-Select:**
  - `Ctrl + Click` (or `Cmd + Click` on macOS) to toggle individual items directly in Steam's inventory grid.
  - `Shift + Click` to range-select visible items on the current inventory page (automatically skips hidden/filtered-out slots and listed items).
  - **`Grid Pick: ON/OFF`** toggle in the panel header for single-click picking without holding modifier keys.
- **Searchable Checklist Panel:**
  - Search by item name, filter by **All marketable**, **Duplicates only**, or **Selected only**.
  - Quick actions: **Select Filtered**, **Select Duplicates** (keeps 1 copy of each item), **Clear**, and **Reload**.
  - Groups identical items with a quantity selector and `▸` expand toggle to pick specific individual assets (such as specific CS2 skins).
- **4 Default Pricing Modes + Per-Item Overrides:**
  1. **Undercut lowest listing** *(default)* (by N currency steps, floored at the top buy order)
  2. **Match lowest listing**
  3. **Instant-sell** (matches the highest buy order)
  4. **Custom price** (choose **Buyer pays** or **You receive** with live fee calculation)
  - **Per-Item Overrides:** Any item (or expanded individual copy) selected in the checklist gets an inline pricing selector (`Default` / `Undercut` / `Match` / `Instant` / `Custom`), so you can bulk-undercut cheap cases while setting a custom price on a rare sticker skin in the same batch.
- **Multi-Language UI (`EN` / `简体中文` / `繁體中文`):**
  - Automatically matches your Steam or browser language (`English`, `Simplified Chinese`, `Traditional Chinese`) with an instant language selector in the panel header.
- **Safety & Rate-Limit Protection:**
  - Runs only on your own logged-in Steam inventory.
  - Prompts for confirmation before listing batches of 15+ items.
  - Includes a **Stop** button to halt gracefully after the active request.

### Installation

#### 1. Install a Userscript Manager
Install **[Tampermonkey](https://www.tampermonkey.net/)** or **[Violentmonkey](https://violentmonkey.github.io/)** in Chrome, Edge, or Firefox.

> **Important for Chrome / Edge users:** Open `chrome://extensions` (or `edge://extensions`), click **Details** on Tampermonkey/Violentmonkey, and toggle **Allow user scripts** ON so the browser allows userscripts to run on Steam.

#### 2. Install the Script
- **Direct Raw Install from GitHub:** Open [`steam-inventory-bulk-lister.user.js`](https://raw.githubusercontent.com/Uione/steam-inventory-bulk-lister/main/steam-inventory-bulk-lister.user.js) and click **Install** when Tampermonkey/Violentmonkey prompts you.
- **Manual Install:** Copy [`steam-inventory-bulk-lister.user.js`](steam-inventory-bulk-lister.user.js) into a new script in your userscript manager and save.

### Usage

1. Open your Steam Inventory (`https://steamcommunity.com/my/inventory/`).
2. Select items using `Ctrl`/`Shift + Click` on the grid, **`Grid Pick: ON`**, or the floating checklist panel in the bottom-right corner.
3. Keep the default **Undercut lowest listing** or switch the global pricing mode; optionally override individual selected rows directly inside the checklist.
4. Click **Uplist Selected** and monitor progress in the panel log.
5. Open the **Steam Mobile App -> Confirmations** to approve the listings (required by Valve).

### Development & Testing

No runtime dependencies are required. To run syntax validation and the unit/mocked-DOM test suite using Node.js (v18+):

```bash
npm test
```

### Notes & Disclaimer

- **Steam Mobile Guard:** Valve requires mobile authenticator confirmation for market listings; browser scripts cannot bypass 2FA confirmations.
- **Rate Limits:** Steam enforces strict IP rate limits on `/market/` endpoints. The default `1250ms` delay + jitter and automatic `429` backoff help avoid temporary cooldowns.
- **License:** Released under the [MIT License](LICENSE). Not affiliated with or endorsed by Valve Corporation or Steam. Test with 1–2 low-value items first.

---

<a id="简体中文"></a>

## 简体中文

一个轻量、开源的 **Tampermonkey / Violentmonkey** 油猴脚本，用于在 **Steam 社区库存页面** 中多选物品并一键批量上架到 Steam 社区市场。

针对 **2026 年 Steam 社区市场更新** 适配：
- 使用当前有效的 `/market/orderbook`（替代已失效的 `/market/itemordershistogram`）和 `/market/sellitem/` 接口。
- 自动识别 CS2 **挂售保留在库存中的物品**（`sealed_type === 1`）以及 7 天交易保护物品，在格子与列表中标记 `已上架`，避免重复挂售。
- 严格遵循 Steam 的 `GetTotalWithFees` / `ToValidMarketPrice` 手续费、货币最小单位与不可达买家价格向下取整规则（支持零小数货币）。
- 内置串行请求队列、随机抖动延迟与 HTTP `429` 自动退避重试。

### 功能特性

- **库存格子多选：**
  - 按住 `Ctrl + 左键`（macOS 为 `Cmd + 左键`）在库存格子中直接多选/取消物品。
  - 按住 `Shift + 左键` 连续范围选择当前页可见物品（自动跳过搜索隐藏项及已上架物品）。
  - 面板标题栏提供 **`格子点选: 开/关`** 切换按钮，开启后左键单击即可直接选物。
- **可搜索勾选面板：**
  - 支持按名称搜索，筛选 **全部可出售** / **仅重复物品** / **仅已选中**。
  - 快捷按钮：**全选当前筛选**、**选中重复项**（每种物品保留 1 件）、**清空**、**刷新**。
  - 同名物品自动合并分组并支持数量输入，点击 `▸` 可展开查看并单独勾选指定 `assetid` 物品（适合挑选不同磨损/贴纸的饰品）。
- **4 种默认定价模式 + 单件自定义覆盖：**
  1. **低于最低卖单 (压价)** *（默认）*（按 N 个最小货币单位压价，且不低于最高求购价）
  2. **匹配最低卖单**
  3. **匹配最高求购 (秒卖)**
  4. **自定义价格**（支持切换 **买家支付** / **实收金额** 并实时计算税后金额）
  - **单件改价：** 当物品在列表中被选中后，该行会显示独立的定价下拉框（`默认` / `压价` / `同最低` / `秒卖` / `自定义`），可同一批次内部分压价出货、部分按自定义价格挂售。
- **多语言界面（EN / 简体中文 / 繁體中文）：**
  - 自动匹配你的 Steam 或浏览器语言，也可随时在面板顶部下拉框切换。
- **安全保护：**
  - 仅在已登录且查看**本人库存**时激活。
  - 单次批量上架达到 15 件及以上时会弹出确认提示。
  - 提供 **停止** 按钮，可在当前请求完成后安全中止。

### 安装方法

#### 1. 安装脚本管理器
在 Chrome、Edge 或 Firefox 安装 **[Tampermonkey](https://www.tampermonkey.net/)** 或 **[Violentmonkey](https://violentmonkey.github.io/)**。

> **Chrome / Edge 重要提示：** 请前往 `chrome://extensions`（或 `edge://extensions`），打开 Tampermonkey / Violentmonkey 的 **详情**，将 **允许运行用户脚本（Allow user scripts）** 打开，否则浏览器会阻止脚本在 Steam 页面生效。

#### 2. 安装本脚本
- **从 GitHub 一键安装：** 直接打开 [`steam-inventory-bulk-lister.user.js`](https://raw.githubusercontent.com/Uione/steam-inventory-bulk-lister/main/steam-inventory-bulk-lister.user.js)，在弹出的脚本管理器界面点击 **安装**。
- **手动安装：** 复制 [`steam-inventory-bulk-lister.user.js`](steam-inventory-bulk-lister.user.js) 全部内容，在脚本管理器中新建脚本粘贴并保存即可。

### 使用步骤

1. 打开你的 Steam 库存页面（`https://steamcommunity.com/my/inventory/`）。
2. 使用 `Ctrl`/`Shift + 左键`、开启 **`格子点选`**，或在右下角面板中搜索勾选需要上架的物品。
3. 保持默认的 **低于最低卖单 (压价)** 或切换全局定价模式，也可针对列表中已选中的单项单独修改价格。
4. 点击 **一键上架已选**，在日志窗口查看实时进度与预计实收金额。
5. 上架提交完成后，打开 **手机 Steam 令牌 -> 确认** 完成最终确认即可（Steam 安全机制要求）。

### 开发与测试

无需额外运行时依赖，使用 Node.js (v18+) 运行语法检查与模拟测试：

```bash
npm test
```

### 注意事项与免责声明

- **手机令牌确认：** Valve 强制要求市场挂单通过手机 Steam 令牌确认，浏览器脚本无法绕过 2FA。
- **频率限制：** Steam 对 `/market/` 接口有严格的 IP 速率限制，请勿将请求间隔调得过低，以免触发临时 `429` 冷却。
- **开源协议：** 本项目基于 [MIT License](LICENSE) 开源，与 Valve / Steam 无任何隶属或合作关系。建议首次使用先用 1～2 件低价物品测试。
