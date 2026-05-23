/**
 * 简易 i18n 工具。
 *
 * 从 store.js 读取 locale 设置（默认 zh-CN），
 * 返回对应语言字符串。不依赖 Vela 内置 $t()。
 *
 * 用法：
 *   import { t } from './i18n.js'
 *   t('addWater')  // → '加水' or 'Add Water'
 */
import { getSettings } from './store.js'

var STRINGS = {
  'zh-CN': {
    addWater: '加水',
    history: '历史',
    settings: '设置',
    today: '今日',
    ml: 'ml',
    times: '次',
    noRecord: '今天还没有记录',
    back: '返回',
    goal: '目标',
    interval: '间隔',
    smallCup: '小杯',
    mediumCup: '中杯',
    largeCup: '大杯',
    reminder: '提醒',
    reminderOn: '已开启',
    reminderOff: '已关闭',
    quietHint: '睡眠 22:00–08:00 不提醒',
    clearToday: '清空今日',
    clearDone: '今日记录已清空',
    saveFail: '保存失败',
    title: '设置'
  },
  'en': {
    addWater: 'Add Water',
    history: 'History',
    settings: 'Settings',
    today: 'Today',
    ml: 'ml',
    times: 'times',
    noRecord: 'No records yet',
    back: 'Back',
    goal: 'Goal',
    interval: 'Interval',
    smallCup: 'Small',
    mediumCup: 'Medium',
    largeCup: 'Large',
    reminder: 'Reminder',
    reminderOn: 'ON',
    reminderOff: 'OFF',
    quietHint: 'Quiet 22:00–08:00',
    clearToday: 'Clear Today',
    clearDone: 'Today cleared',
    saveFail: 'Save failed',
    title: 'Settings'
  }
}

var _locale = 'zh-CN'
var _loaded = false

/** 初始化 locale（从 storage 读取，仅首次调用时异步）。 */
function init() {
  if (_loaded) return
  _loaded = true
  getSettings().then(function (s) {
    if (s.locale === 'en') _locale = 'en'
  }).catch(function () {})
}

/**
 * 获取翻译字符串。
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
  init()
  var dict = STRINGS[_locale] || STRINGS['zh-CN']
  return dict[key] || key
}

/** 获取当前 locale。 */
export function getLocale() { return _locale }

/**
 * 设置 locale 并持久化。
 * @param {string} loc 'zh-CN' | 'en'
 */
export function setLocale(loc) {
  _locale = loc === 'en' ? 'en' : 'zh-CN'
  // 通过 store 持久化（在 settings.ux 的 save 中处理）
}
