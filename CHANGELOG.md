# CHANGELOG

## 2026-05-22 — 完整前台版 + 迁回主目录 + 清理旧链路

**完整前台版（三页）落地，用户实机验收满意：**

- [feat] 主页 [src/pages/index/index.ux](src/pages/index/index.ux)：饮水量/目标/百分比 + 三档加水 + 历史/设置导航
- [feat] 设置页 [src/pages/settings/settings.ux](src/pages/settings/settings.ux)：目标 +/-（500–5000）、间隔 +/-（15–240）、提醒开关、清空今日、睡眠说明
- [feat] 历史页 [src/pages/history/history.ux](src/pages/history/history.ux)：今日总量/次数 + 记录列表（for 渲染最近 8 条）
- [feat] [src/common/util/reminder.js](src/common/util/reminder.js)：睡眠免打扰 22:00–08:00（`isQuietTime` / `maybeFireReminder`），定时触发自动静默
- [fix] **黑屏坑**：Vela 对相邻 `if="{{a}}" / if="{{!a}}"` 配对渲染异常 → 整页黑屏（实测设置/历史页打开即黑）。改用三元表达式绑定（`{{cond ? a : b}}`）规避；`for` 列表渲染正常
- [note] 每日重置由 [store.js](src/common/util/store.js) 跨天逻辑内建（`getToday` 按 dateKey 判断），0 点后自动清零

**工程迁移与清理：**

- [chore] 把 aiot 工程从临时 `_aiot/hellovela/` 提升为主项目（src / package.json / .npmrc / sign / node_modules）
- [chore] 删除全部实验杂项：`_v5/_v6/_v8/_verify2-4/_cert_*/_hello/_hello_unpacked/_chk/_verify_jsc/_verify_aiot/_vv`
- [chore] 删除旧 hap-toolkit 链路：`babel.config.js`、`scripts/patch-toolkit.js`、`scripts/repack-rename-jsc.js`、旧 `package.json`（hap-toolkit-xiaomi）、旧 `build/`、`dist/`、`node_modules/`
- [chore] [package.json](package.json) 改名 `water-reminder-watch`，`release` 脚本封装 `--enable-jsc --complete-feature`
- [chore] [.gitignore](.gitignore) 增加 `.temp_*/`；参考样本 `腕间电子书 s4.bin` 移入 [_reference_ebook/](_reference_ebook/)
- [docs] 重写 [README.md](README.md)：aiot 工具链 / 构建命令 / 三页 / 后台限制 / API 支持度
- [build] 主目录 `aiot release --enable-jsc` 验证通过：`dist/喝水提醒.bin`

## 2026-05-22 — 后台提醒结论：Watch S4 快应用后台被平台彻底锁死

**实测三条后台路全部走不通**（均在真机 Watch S4 eSIM 验证）：

1. **前台 `setInterval`**：退到桌面即被冻结挂起；回到 app 时积压的 tick 一次性补偿触发（用户实测"进程序了全会弹出来"）
2. **`system.alarm` 系统闹钟**：`@system.alarm` 模块存在但为空壳，`for-in` 枚举 `keys=[]`，`setAlarm` 为 `undefined`，调用即失败
3. **静音音频保活**：`@system.audio` 可用（`keys=[nativeAudioInst,play,pause,stop,getPlayState]`），静音 WAV 能 `onplay`；但
   - 仅声明 `config.background.features:["system.audio"]` → 后台仍冻结
   - 追加 `audio.notificationVisible=true` + title/artist 尝试提升前台服务 → 通知栏不出现、后台依旧冻结

**结论**：S4 的 Vela 不向第三方快应用开放后台常驻 / 定时唤醒能力。喝水提醒"关掉也定时震动"在纯快应用形态下不可行，属平台级硬限制。

**保留可用能力**：前台（app 打开时）`setInterval` + `@system.vibrator` 震动正常；`@system.storage` 记录正常。

**待定方向**（询问用户后定）：① app 定位为"喝水记录 + 打开时提醒"，后台交手表自带闹钟兜底；② 逆向米坛社区 S4 快应用看有无后台手段（成本高、不确定）；③ 先做完整前台版（记录/设置/历史）。

## 2026-05-22 — 业务迁移到 aiot + 震动根因 + 后台方案定调

**实机里程碑**：官方 `aiot-toolkit` 产的 HelloVela.bin 在 Watch S4 eSIM 上**成功显示**，黑屏彻底解决。随后把喝水提醒业务迁到 aiot 工程（临时落在 [_aiot/hellovela/](_aiot/hellovela/)，待整体迁回主目录）。

**已完成**：

- [feat] 主页 [_aiot/hellovela/src/pages/index/index.ux](_aiot/hellovela/src/pages/index/index.ux)：饮水量 / 目标 / 百分比 + 三档加水 + 测试震动 + 测试提醒 + 提醒开关；UI 放大适配 S4 圆表
- [feat] [_aiot/hellovela/src/common/util/reminder.js](_aiot/hellovela/src/common/util/reminder.js)：震动提醒
- [feat] 复用旧 [store.js](_aiot/hellovela/src/common/util/store.js) 做 settings/today 持久化（`@system.storage` 实测可用）
- [fix] **震动根因**：Watch S4 的 `@system.vibrator` **只有 `vibrate({mode})`，`start({duration,interval,count})` 为 `undefined`**（屏幕诊断实测 `start=undefined`）。最初用 start 故"点了没反应"。改为固定 `vibrate({mode:'long'})`，连震靠定时器叠加

**后台能力调研结论**：

- Vela 官方 `config.background.features` 仅支持 `system.audio` / `system.request` / `system.geolocation`，**不含 timer/vibrator**——前台 `setInterval` 退后台即被冻结（与实测"进后台不提醒"一致）
- 两条可行路：① 静音音频保活（耗电）② **`system.alarm` 系统闹钟**（系统级、省电、app 关了也响）
- **决策**：采用 ② 系统闹钟。`alarm.setAlarm({hour,minute,message,vibrate,days})`，`days` 0-6=周一至周日；限制：只能整点、每次注册弹确认框、文档未列删除/查询 API

**下一步**：设置页（目标/时段/间隔/免打扰）+ system.alarm 批量注册整点闹钟 + 历史页；之后整体迁回主目录、清理 hap-toolkit 旧链路。

## 2026-05-22 — 黑屏真凶：工具链选错，应改用官方 aiot-toolkit + jsc 字节码

**结论**：整整一天的黑屏不是代码 / CSS / ES5 / 签名问题，而是**用错了工具链**。

- 我们一直用 `hap-toolkit-xiaomi`（快应用联盟的小米分支），它产出的是 `.js` 源码 + 简单 `hash.json` 完整性校验
- 而小米 **Vela 手表（S4 / Watch / 手环）的运行时只认官方 `aiot-toolkit` 产物**：`.jsc`（QuickJS 字节码，由原生 `win32_aiotjsc.exe` 编译）+ `RPK Sig Block 42` 真正的 PKCS 数字签名
- 反编译参考样本 [_reference_ebook/](_reference_ebook/) 时 manifest 里写的 `toolkit:1.1.4` 正是 `aiot-toolkit` 旧版——早该顺着这条线查

**验证链路**（全部通过）：

- `npm i aiot-toolkit`（2.0.5，npm 公开包）+ 脚手架 `npx create-aiot ux --name hellovela --template vela-demo`
- `aiot release --enable-jsc` 关键开关产 jsc 字节码；日志可见 `Generate jsc bytecode ✅` 调用原生 `@aiot-toolkit/jsc/.../win32_aiotjsc.exe`
- 签名查找顺序：release 模式 `sign/release/*.pem` → `sign/*.pem`；复用我们已有的自签证书即可
- 构建需 `NODE_OPTIONS=--openssl-legacy-provider`（Node 24 + 旧 webpack）
- 产物 [_aiot/hellovela/dist/HelloVela.bin](_aiot/hellovela/dist/HelloVela.bin) 结构 `app.jsc` + `pages/*/*.jsc` 与参考样本逐一对应

**正确工具链备忘**：

| 项 | 值 |
|---|---|
| 创建 | `npx create-aiot ux --name <项目> --template vela-demo` |
| 依赖 | `aiot-toolkit@^2.0.5` + `@aiot-toolkit/jsc@^1.0.3` |
| 构建 | `NODE_OPTIONS=--openssl-legacy-provider aiot release --enable-jsc` |
| 签名 | 项目根 `sign/release/{private,certificate}.pem` |
| registry | 慢时加 `.npmrc` → `registry=https://registry.npmmirror.com/` |

**待办**：等 HelloVela.bin 实机验证显示成功后，将喝水提醒业务（[src/](src/) 的 pages / store / reminder）迁移到 aiot 项目结构，废弃 hap-toolkit-xiaomi 链路。

## 2026-04-25 — 黑屏定位（续 2）：补丁脚本目标路径错位，箭头函数从未被消除

**症状**：把 [_hello/](_hello/) 改了三种 CSS（`100%` / `flex:1` / 显式像素绝对定位）后实测都是纯黑。

**根因**：

1. 反编译参考样本 [_reference_ebook/pages/index/index.jsc](_reference_ebook/pages/index/index.jsc) 发现首字节 `01 c4 01 16 ...` 是 **QuickJS 字节码**——确认了 Vela 用 QuickJS（不是 V8）作为 JS 引擎
2. QuickJS 对 ES6 箭头函数 / `let` / `const` / 模板字符串等的支持随版本而异，老版（Watch S4 在用的）会直接解析失败
3. 之前写的 [scripts/patch-toolkit.js](scripts/patch-toolkit.js) 注入路径是 `node_modules/@hap-toolkit/packager/...`，但工具链早已切到 [`@hap-toolkit-xiaomi/packager`](node_modules/@hap-toolkit-xiaomi/packager/lib/webpack.post.js)，**补丁实际上一次都没生效**
4. 结果：编译产物 [_hello/build/app.js](_hello/build/app.js) 与 [_hello/build/pages/index/index.js](_hello/build/pages/index/index.js) 中仍残留大量 `e=>{}` 与 `(()=>{...})()` IIFE 箭头包装；Vela QuickJS 加载时解析失败 → 页面挂掉 → 仅剩 `display.backgroundColor:"#000000"` 兜底 → 用户看到的"能开但纯黑"

**修复**：

- [fix] [scripts/patch-toolkit.js](scripts/patch-toolkit.js) `TARGETS` 增加 `@hap-toolkit-xiaomi/packager` 路径（本地 + 全局两套 npm 命名空间）
- [fix] [scripts/patch-toolkit.js](scripts/patch-toolkit.js) `PATCH` 字段移除 `templateLiteral` 与 `optionalChaining`——webpack 5.24.0 的 `output.environment` schema 还没收录这两项，注入会触发 `ValidationError` 终止构建
- [build] `npm install` 触发 `postinstall` 钩子重打补丁，重建 [_hello/dist/Hello.bin](_hello/dist/Hello.bin)；`grep -c '=>' build/app.js build/pages/index/index.js` 双零确认箭头函数全清

**遗留观察**：

- 反编译参考样本时见到字符串表中是显式像素 (`480px`/`160px`) + `position: absolute`，但 CSS 改像素后仍黑，已排除布局原因
- 参考样本根目录无 `app.js` 文件，只有 `pages/*/index.jsc`；toolkit-xiaomi 必产 `app.js`。若 ES5 修复后还黑，下一步要试**手工解包 .rpk 删 app.js + 重签名**，验证 app.js 是否多余

## 2026-04-25 — 黑屏定位：`<script>` 段缺失会被编译器塞 `null` 入口

**症状**：用 [_hello/](_hello/) 极简红/绿/黄/蓝四色测试包装机后**能开但纯黑**。能开 ⇒ 签名 / 打包链 / V8 兼容 / manifest features 全部 OK；纯黑 ⇒ 渲染层挂了，剩下 [src/manifest.json](src/manifest.json) `display.backgroundColor` 兜底。

**根因**：[_hello/src/pages/index/index.ux](_hello/src/pages/index/index.ux) 只有 `<template>` + `<style>`，没有 `<script>` 段。`hap-toolkit-xiaomi@1.9.5` 编译时把页面入口写成了字面量 `null`：

```js
// 旧产物 _hello/build/pages/index/index.js
null({},r,$app_require$), r.default.template=l, r.default.style=a
```

页面加载即抛 `TypeError: null is not a function`，宿主吞错 ⇒ 黑屏。

**修复**：

- [fix] [_hello/src/pages/index/index.ux](_hello/src/pages/index/index.ux) 补 `<script>export default {}</script>`，新产物入口变为模块 191（完整 page VM 初始化器）
- [build] 重新生成 [_hello/dist/Hello.bin](_hello/dist/Hello.bin)
- [chore] Node 24 + webpack 5 老版本需 `NODE_OPTIONS=--openssl-legacy-provider` 才能跑构建（OpenSSL3 默认禁 md4）

**验证**：主项目 `src/pages/{Index,History,Settings}.ux` 三页都已有 `<script>`，不受影响。

## 2026-04-25 — 工具链切换至 hap-toolkit-xiaomi

**背景**：通用 `hap-toolkit@2.0.9` 即使打 ES5 补丁后仍存在边界 case，改用小米官方 `hap-toolkit-xiaomi@1.9.5`，对 Vela / Watch S4 兼容性更稳。

- [chore] [package.json](package.json)：`hap-toolkit@2.0.9` → `hap-toolkit-xiaomi@^1.9.5`
- [chore] [babel.config.js](babel.config.js) 保留 `@babel/preset-env` targets `ie:11`，源码侧仍降到 ES5
- [chore] [scripts/patch-toolkit.js](scripts/patch-toolkit.js) 与 `postinstall` 钩子保留（注释中 toolkit 版本号待新链路稳定后清理）
- [feat] 新增 [_hello/](_hello/) 极简探针包：红底 + 三色块 A/B/C，用于隔离"基础设施 vs 业务代码"故障

**待办**：用 `hap-toolkit-xiaomi` 重打 [dist/喝水提醒.bin](dist/喝水提醒.bin)（当前产物仍为 09:47 旧链构建）。

## 2026-04-25 — 强制 ES5 输出（手表点开后闪退/重启的最终修复）

**新症状**：上一次修复后还是闪退，**点击多次会触发整表重启**。重启 = Vela V8 原生级崩溃，几乎可以确定是语法问题。

**根因**：

- 我们源码已用 `var` + `function` 写法，但 hap-toolkit 2.0.9 内部用 webpack 5 打包，**webpack runtime 自身的 IIFE 包装器还是 `(()=>{...})()`**，只剩这 1 个箭头函数也足以让 V8 解析失败。
- hap-toolkit 没暴露 `output.environment` 配置接口，必须打补丁。

**修复**：

- [chore] [scripts/patch-toolkit.js](scripts/patch-toolkit.js)：在 `node_modules/@hap-toolkit/packager/lib/webpack.post.js` 注入 `output.environment.{arrowFunction,const,destructuring,forOf,bigIntLiteral,dynamicImport,module,optionalChaining,templateLiteral} = false`，强制 webpack 5 输出 ES5 runtime
- [chore] [package.json](package.json) 加 `postinstall` 钩子，每次 `npm install` 后自动重新打补丁
- [chore] [babel.config.js](babel.config.js)：用 `@babel/preset-env` 目标 `ie:11`，确保用户代码也降到 ES5
- [chore] [src/manifest.json](src/manifest.json) `minPlatformVersion` 从 1200 降到 1039，触发 hap-toolkit 自身的 ES5 模式
- [build] 重新生成 `.bin`：用 grep 确认 `=>`/`class`/`let`/`const`/`` ` `` 全部为 0

## 2026-04-25 — 修复 Watch S4 闪退（首次安装无法打开）

**症状**：在 Watch S4 上点击图标，应用闪一下立刻退回桌面。

**根因排查**：

1. **Manifest 声明了平台不存在的 features**（`system.notification` / `system.alarm` / `system.vibrator`）—— 平台无法满足权限请求时直接拒绝加载应用
2. **`store.js` 大量使用 `async/await`**，编译产物未做 ES5 降级，部分 Vela 机型 V8 版本不支持，模块加载即抛错
3. **hap-toolkit 静态分析陷阱**：注释里写 `@system.alarm` 也会被误识，自动写回 manifest features

**修复**：

- [fix] [src/manifest.json](src/manifest.json) 只保留确认可用的 `system.router/storage/prompt`
- [fix] 重写 [src/common/util/store.js](src/common/util/store.js)：去掉所有 `async/await`，改为 Promise.then 链；用 `var` + 函数表达式，最大兼容性
- [fix] [src/common/util/reminder.js](src/common/util/reminder.js) 移除 `system.alarm` 引用与所有相关注释字符串；保留 `scheduleNextAlarm` 接口为空实现，未来可平滑接回
- [chore] 新增 [src/config-watch.json](src/config-watch.json) 解决 toolkit 警告
- [build] 重新生成 [dist/喝水提醒.bin](dist/喝水提醒.bin)

## 2026-04-24 — 技术栈迁移：Wear OS → 小米快应用

**背景**：目标设备最终确定为 **Xiaomi Watch S4（HyperOS）**，非 Wear OS，无法安装 Android APK。整体迁移到快应用方案，原 Wear OS 源代码已删除。

- [chore] 删除 Wear OS 全部工程文件：`app/`、`gradle/`、`build/`、`.gradle/`、`.kotlin/`、所有 `.gradle.kts` / `gradle.properties` / `local.properties` / `gradlew*` / `proguard-rules.pro` / `_build.bat` / `dev-launch.bat`
- [feat] 引入 hap-toolkit 2.0.9（npm 全局 + 本地 devDep）
- [feat] 新增快应用工程骨架：[package.json](package.json)、[src/manifest.json](src/manifest.json)、[src/app.ux](src/app.ux)
- [feat] 工具层：[src/common/util/store.js](src/common/util/store.js)（`@system.storage` 封装 + settings/today 领域读写）、[src/common/util/reminder.js](src/common/util/reminder.js)（前台 setInterval + 后台 `@system.alarm` 降级）
- [feat] 三个页面：[pages/Index](src/pages/Index/Index.ux)（进度 + 快捷加水 + 导航）、[pages/History](src/pages/History/History.ux)（今日记录列表）、[pages/Settings](src/pages/Settings/Settings.ux)（目标/间隔/开关/重置）
- [feat] 国际化资源：[src/i18n/defaults.json](src/i18n/defaults.json) / [src/i18n/zh-CN.json](src/i18n/zh-CN.json)
- [feat] 图标生成脚本：[scripts/gen-logo.js](scripts/gen-logo.js)（零依赖，Node 原生 zlib 合成 128×128 RGBA PNG 水滴）
- [chore] 签名：`sign/release/certificate.pem` + `private.pem`（openssl 自签名，10 年有效）
- [build] 成功构建：`dist/com.waterreminder.watch.release.1.0.0.rpk` + 同内容 `dist/喝水提醒.bin`
- [docs] 全新 [README.md](README.md)：覆盖环境 / 构建 / 上传米坛工具 / 快应用 API 支持度等
- [docs] 保留 [_reference_ebook/](_reference_ebook/) 作为开发参考（解包后的腕间电子书样本）

---

本项目操作留痕。每次改动追加一条记录，格式：

```text
## YYYY-MM-DD — <简要主题>
- [类型] 改动说明（涉及文件）
```

类型约定：`feat` 新增 / `fix` 修复 / `refactor` 重构 / `docs` 文档 / `chore` 构建/依赖 / `style` 代码风格。

---

## 2026-04-22 — 项目骨架初始化

- [chore] 补全 Gradle 配置：根 [build.gradle.kts](build.gradle.kts)、[settings.gradle.kts](settings.gradle.kts)、[gradle.properties](gradle.properties)、[gradle/wrapper/gradle-wrapper.properties](gradle/wrapper/gradle-wrapper.properties)
- [chore] 新增 app 模块构建脚本 [app/build.gradle.kts](app/build.gradle.kts)、[app/proguard-rules.pro](app/proguard-rules.pro)
- [feat] AndroidManifest 声明 Wear standalone、通知 / 精确闹钟 / 开机权限，注册 Application、Activity、`ReminderReceiver`、`BootReceiver` ([app/src/main/AndroidManifest.xml](app/src/main/AndroidManifest.xml))
- [feat] 资源：文案、主题色、水滴矢量图、Adaptive Launcher Icon ([app/src/main/res/](app/src/main/res/))
- [feat] 数据层：`WaterIntake` / `DailyProgress` / `CupSize`、`WaterPreferences` (DataStore)、`WaterRepository` ([app/src/main/java/com/example/waterreminderwatch/data/](app/src/main/java/com/example/waterreminderwatch/data/))
- [feat] 提醒层：`NotificationHelper` 通知渠道与提醒通知、`ReminderScheduler` AlarmManager 精确调度、`ReminderReceiver` 处理提醒触发与快捷记录、`BootReceiver` 开机恢复 ([app/src/main/java/com/example/waterreminderwatch/reminder/](app/src/main/java/com/example/waterreminderwatch/reminder/))
- [feat] 表示层：`WaterApp` Application 单例、`MainActivity` 入口、`WaterTheme` Wear Compose 主题、`WaterViewModel`、`HomeScreen` / `HistoryScreen` / `SettingsScreen`、`WaterWearApp` 导航 ([app/src/main/java/com/example/waterreminderwatch/presentation/](app/src/main/java/com/example/waterreminderwatch/presentation/))

## 2026-04-22 — 文档与注解规约落实

- [docs] 新增项目 Guide [README.md](README.md)：环境 / 启动 / 模块结构 / 常用命令 / 规范 / 扩展方向
- [docs] 新增变更日志 [CHANGELOG.md](CHANGELOG.md)
- [docs] 为所有 Kotlin 源文件补充 KDoc 注解（类、公开方法、关键参数与副作用）
