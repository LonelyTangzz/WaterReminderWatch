# 喝水提醒（小米 Watch S4 · Vela 快应用）

运行在小米 Watch S4（HyperOS / Xiaomi Vela）上的**快应用**，定时震动提醒喝水并记录每日饮水量。通过米坛社区「表盘自定义工具」把 `.bin` 刷入手表。

- **主页**：当日饮水量 / 目标 / 百分比，三档快捷加水（150 / 250 / 500ml），导航到历史与设置
- **设置页**：每日目标（500–5000，步进 250）、提醒间隔（15–240 分钟，步进 15）、提醒开关、清空今日记录
- **历史页**：今日饮水记录列表（时间 + 水量）
- **提醒**：`app.ux` 统一管理（后台心跳 + 提醒调度），通过 `system.request`（周期性 fetch）尝试维持后台活跃，搭载震动提醒；睡眠时段 22:00–08:00 自动静默
- **手机伴侣**：`phone-companion/index.html` —— 独立网页版，在手机浏览器打开即可接收喝水通知（Web Notification API），与手表版形成双保险
- **每日重置**：跨天后记录自动清零（`store.js` 按日期键判断）

> ⚠️ **后台提醒（2026-05-23 更新）**：改用 Vela 官方支持的 `system.request`（上传下载）作为后台保活接口——`app.ux` 周期性发起 fetch 请求维持后台活跃状态。此方案基于官方文档，但 **S4 实机效果待验证**。若仍被冻结，请使用手机伴侣网页版（`phone-companion/index.html`）作为兜底。详见 [CHANGELOG.md](CHANGELOG.md)。

> **技术栈演进**：本项目历经 Wear OS（Jetpack Compose）→ 通用快应用（hap-toolkit）→ **小米官方 `aiot-toolkit`（Vela JS 应用）**。前两者产物在 S4 上黑屏，根因是工具链错误——Vela 需要 `aiot-toolkit --enable-jsc` 编译出的 QuickJS 字节码（`.jsc`）。完整踩坑记录见 [CHANGELOG.md](CHANGELOG.md)。

---

## 一、环境要求

| 组件 | 版本 | 说明 |
|---|---|---|
| Node.js | ≥ 14（实测 24.15.0） | aiot-toolkit 运行时 |
| aiot-toolkit | **2.0.5** | 小米官方 Vela 快应用命令行工具（`npm i` 自动装） |
| @aiot-toolkit/jsc | 1.0.3 | jsc 字节码编译器（`--enable-jsc` 时调用原生 `win32_aiotjsc.exe`） |
| 目标设备 | 小米 Watch S4 / S4 eSIM（minPlatformVersion 1200） | |
| 手机端 | 米坛「表盘自定义工具」 | 把 `.bin` 刷到手表 |

> Node 17+ 配旧版 webpack 需要 `NODE_OPTIONS=--openssl-legacy-provider`（OpenSSL3 默认禁 md4），否则构建报 `ERR_OSSL_EVP_UNSUPPORTED`。

---

## 二、项目结构

```
WaterReminderWatch/
├── src/
│   ├── app.ux                      应用生命周期
│   ├── manifest.json               包信息 / 权限 / 路由
│   ├── config-watch.json           watch 平台配置
│   ├── common/
│   │   ├── logo.png                应用图标
│   │   └── util/
│   │       ├── store.js            @system.storage 封装 + settings/today 领域读写（含跨天重置）
│   │       └── reminder.js         前台定时器 + @system.vibrator 震动 + 睡眠免打扰
│   ├── i18n/                       国际化资源
│   └── pages/
│       ├── index/index.ux          主页
│       ├── settings/settings.ux    设置页
│       └── history/history.ux      历史页
├── phone-companion/                手机伴侣网页版（备用方案）
│   └── index.html                  独立网页，浏览器打开即可接收提醒
├── sign/release/                   release 签名（private.pem / certificate.pem，已 gitignore）
├── dist/                           构建输出（com.waterreminder.watch.release.1.0.0.rpk + 喝水提醒.bin）
├── package.json
├── .npmrc                          registry 指向 npmmirror（避免依赖拉取问题）
├── CHANGELOG.md
└── _reference_ebook/               解包后的参考样本（不随代码走）
```

---

## 三、构建

```bash
# 1. 安装依赖（含 aiot-toolkit）
npm install

# 2. 构建 release（含 jsc 字节码），Windows / Node 17+ 需带 openssl-legacy-provider
NODE_OPTIONS=--openssl-legacy-provider npx aiot release --enable-jsc --complete-feature
#   PowerShell: $env:NODE_OPTIONS='--openssl-legacy-provider'; npx aiot release --enable-jsc --complete-feature

# 3. 复制一份为 .bin 供米坛工具使用
cp "dist/com.waterreminder.watch.release.1.0.0.rpk" "dist/喝水提醒.bin"
```

> `npm run release` 已封装 `--enable-jsc --complete-feature`；但 `NODE_OPTIONS` 仍需在外部设置。

常用命令：
- `npm run release` —— 构建 release（jsc + 自动补全 features）
- `npm run build` —— 构建 debug 版（内置调试证书，便于本地）
- `npm run start` —— 源码变更自动重建

**关键点**：必须带 `--enable-jsc`。不加则产物是 `.js` 源码，S4 运行时无法加载 → 黑屏。

---

## 四、刷到手表

1. 把 `dist/喝水提醒.bin` 传到手机
2. 手机打开米坛「表盘自定义工具」→ 快应用安装
3. 选择 `.bin` 文件，按引导在手表确认安装
4. 手表应用抽屉里打开「喝水提醒」

参考：[米坛 表盘自定义工具](https://www.bandbbs.cn/)

---

## 五、快应用 API 说明

| 能力 | 用途 | S4 支持度 |
|---|---|---|
| `system.router` | 三页面导航 | ✅ |
| `system.storage` | settings + today 持久化 | ✅ |
| `system.prompt` | toast 提示 | ✅ |
| `system.vibrator` | 震动提醒（**仅 `vibrate({mode})`，无 `start`**） | ✅ |
| `system.fetch` | 后台心跳请求（保活载体） | ✅ 官方支持矩阵明确列出 |
| `system.request` | 后台保活声明（上传下载） | ✅ 官方支持矩阵明确列出 |
| `system.alarm` | 系统闹钟（后台提醒） | ❌ 空壳模块，`setAlarm` 不存在 |
| `system.audio` 后台保活 | 静音音频常驻 | ❌ 后台仍被冻结（已废弃，不再声明） |

## 六、手机伴侣（备用方案）

若手表后台提醒仍不可用，可在手机浏览器打开 `phone-companion/index.html`：

- 独立网页，无需安装任何 App
- 使用浏览器 Notification API 发送系统通知
- 设置（目标/间隔/开关）保存在 localStorage，跨天自动重置
- 同样支持 22:00–08:00 睡眠免打扰
- 保持页面打开即可（切到后台时部分浏览器可能暂停定时器，切回自动恢复）

> 推荐用法：手机浏览器打开后「添加到主屏幕」，当作轻量 PWA 使用。

---

## 六、项目规范

详见 [TODO.md](TODO.md) 与 [CHANGELOG.md](CHANGELOG.md)：

1. **操作留痕**：每次结构变更在 CHANGELOG 追加一条
2. **方法/模块注解**：JS / UX 使用 JSDoc 或块注释
3. **Guide 同步**：环境 / 依赖 / 结构变动时同步改本文件

---

## 七、已知限制与后续方向

- **后台提醒**：S4 Vela 锁死第三方快应用后台，纯快应用做不到「关掉也定时提醒」。当前为前台提醒。后续探索方向：逆向米坛社区可后台的 S4 快应用、或系统闹钟兜底
- **历史滚动**：当前历史页用 `div` 居中显示最近 8 条；记录多时需要可滚动容器（`<list>` 组件待验证，注意避开会导致渲染异常的相邻 `if` 指令写法）
- **UX 渲染坑**：Vela 对相邻 `if="{{a}}" / if="{{!a}}"` 配对渲染异常会导致整页黑屏，本项目一律用三元表达式绑定规避
