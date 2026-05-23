/**
 * 本地存储工具。
 *
 * 封装 `@system.storage` 的回调式 API 为 Promise 风格，并提供
 * 领域对象级别的读写：`settings`（用户设置）、`today`（当日累计与记录）。
 *
 * 存储布局：
 *   settings = { goalMl, intervalMinutes, reminderEnabled }
 *   today    = { dateKey: "yyyy-MM-dd", totalMl, entries: [{t: timestamp, ml: number}] }
 *
 * 跨天自动重置：读 `today` 时，若存储中的 dateKey 与当前系统日期不符，返回一个空快照
 *（不落盘，等下一次 addIntake 时由 put 操作真正重置）。
 *
 * **兼容性约束**：避免使用 `async/await`（Vela 部分机型 V8 版本不支持），
 * 全部用 Promise 链表达异步。
 */
import storage from '@system.storage'

var SETTINGS_KEY = 'wr_settings_v1'
var TODAY_KEY = 'wr_today_v1'

/** 默认设置：每日 2000ml / 每 60 分钟提醒 / 提醒开启 / 三档杯量 / 中文。 */
export var DEFAULT_SETTINGS = {
  goalMl: 2000,
  intervalMinutes: 60,
  reminderEnabled: true,
  cup1Ml: 150,
  cup2Ml: 250,
  cup3Ml: 500,
  locale: 'zh-CN'
}

/**
 * 读取一项存储；不存在或失败均回退为空字符串。
 *
 * @param {string} key 存储键
 * @returns {Promise<string>}
 */
export function getItem(key) {
  return new Promise(function (resolve) {
    storage.get({
      key: key,
      success: function (data) { resolve(data || '') },
      fail: function () { resolve('') }
    })
  })
}

/**
 * 写入一项存储。
 * @param {string} key
 * @param {string} value 建议传入 JSON.stringify 后的字符串
 * @returns {Promise<void>}
 */
export function setItem(key, value) {
  return new Promise(function (resolve, reject) {
    storage.set({
      key: key,
      value: value,
      success: function () { resolve() },
      fail: function (err, code) {
        reject(new Error('storage.set fail code=' + code + ' msg=' + err))
      }
    })
  })
}

/**
 * 解析 "yyyy-MM-dd" 格式的今日键。始终用本地时区。
 * @returns {string}
 */
export function todayKey() {
  var d = new Date()
  var mm = pad2(d.getMonth() + 1)
  var dd = pad2(d.getDate())
  return d.getFullYear() + '-' + mm + '-' + dd
}

/**
 * 模块级设置缓存。
 * 每次 setSettings 写入时同步更新，getSettingsCached 直接返回。
 * 解决跨组件（settings.ux → app.ux）状态同步问题。
 */
var _settingsCache = null

/**
 * 同步获取缓存的设置（不读存储）。
 * 初始为 null，首次 getSettings/setSettings 后填充。
 * @returns {object|null}
 */
export function getSettingsCached() {
  return _settingsCache
}

/**
 * 读取并规范化用户设置。缺字段自动用默认值补齐，解析失败同样回退到默认。
 * @returns {Promise<{goalMl:number,intervalMinutes:number,reminderEnabled:boolean}>}
 */
export function getSettings() {
  return getItem(SETTINGS_KEY).then(function (raw) {
    if (!raw) {
      _settingsCache = shallowCopy(DEFAULT_SETTINGS)
      return _settingsCache
    }
    try {
      var parsed = JSON.parse(raw)
      _settingsCache = mergeSettings(parsed)
      return _settingsCache
    } catch (e) {
      _settingsCache = shallowCopy(DEFAULT_SETTINGS)
      return _settingsCache
    }
  })
}

/** 覆盖式写入用户设置；返回规范化后的新设置。同步更新缓存。 */
export function setSettings(settings) {
  var normalized = {
    goalMl: clamp(settings.goalMl, 500, 5000),
    intervalMinutes: clamp(settings.intervalMinutes, 15, 240),
    reminderEnabled: !!settings.reminderEnabled,
    cup1Ml: clamp(settings.cup1Ml || 150, 50, 1000),
    cup2Ml: clamp(settings.cup2Ml || 250, 50, 1000),
    cup3Ml: clamp(settings.cup3Ml || 500, 50, 1000),
    locale: settings.locale === 'en' ? 'en' : 'zh-CN'
  }
  _settingsCache = normalized
  return setItem(SETTINGS_KEY, JSON.stringify(normalized)).then(function () {
    return normalized
  })
}

/**
 * 读取今日状态；若存储里是旧日期，返回空快照（不落盘）。
 * @returns {Promise<{dateKey:string,totalMl:number,entries:Array}>}
 */
export function getToday() {
  var key = todayKey()
  return getItem(TODAY_KEY).then(function (raw) {
    if (!raw) return { dateKey: key, totalMl: 0, entries: [] }
    try {
      var parsed = JSON.parse(raw)
      if (parsed.dateKey !== key) return { dateKey: key, totalMl: 0, entries: [] }
      return {
        dateKey: parsed.dateKey,
        totalMl: parsed.totalMl || 0,
        entries: Array.isArray(parsed.entries) ? parsed.entries : []
      }
    } catch (e) {
      return { dateKey: key, totalMl: 0, entries: [] }
    }
  })
}

/**
 * 追加一条饮水记录。自动处理跨天（覆盖写入当前日期的空快照 + 新记录）。
 * @param {number} ml
 * @returns {Promise<object>} 新的 today 状态
 */
export function addIntake(ml) {
  if (!ml || ml <= 0) return getToday()
  return getToday().then(function (state) {
    state.totalMl += ml
    state.entries.push({ t: Date.now(), ml: ml })
    return setItem(TODAY_KEY, JSON.stringify(state)).then(function () { return state })
  })
}

/** 重置今日数据（清零 + 清空记录），保留今天为 dateKey。 */
export function resetToday() {
  var fresh = { dateKey: todayKey(), totalMl: 0, entries: [] }
  return setItem(TODAY_KEY, JSON.stringify(fresh)).then(function () { return fresh })
}

/* ---------- 内部工具（避免对外暴露） ---------- */

function pad2(n) {
  return (n < 10 ? '0' : '') + n
}

function clamp(v, min, max) {
  v = Number(v) || 0
  if (v < min) return min
  if (v > max) return max
  return v
}

function shallowCopy(obj) {
  var out = {}
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]
  return out
}

/** 用默认值填充 parsed 中缺失的字段。 */
function mergeSettings(parsed) {
  var out = shallowCopy(DEFAULT_SETTINGS)
  if (parsed && typeof parsed === 'object') {
    if (typeof parsed.goalMl === 'number') out.goalMl = parsed.goalMl
    if (typeof parsed.intervalMinutes === 'number') out.intervalMinutes = parsed.intervalMinutes
    if (typeof parsed.reminderEnabled === 'boolean') out.reminderEnabled = parsed.reminderEnabled
    if (typeof parsed.cup1Ml === 'number') out.cup1Ml = parsed.cup1Ml
    if (typeof parsed.cup2Ml === 'number') out.cup2Ml = parsed.cup2Ml
    if (typeof parsed.cup3Ml === 'number') out.cup3Ml = parsed.cup3Ml
    if (typeof parsed.locale === 'string') out.locale = parsed.locale
  }
  return out
}
