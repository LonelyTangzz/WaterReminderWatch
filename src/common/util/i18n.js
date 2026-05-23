/**
 * 简易 i18n 工具（纯同步，不依赖 storage）。
 * 默认 zh-CN，可通过 setLocale('en') 切换。
 */
var _locale = 'zh-CN'

var DICT = {
  'zh-CN': { history: '历史', settings: '设置' },
  'en': { history: 'History', settings: 'Settings' }
}

export function t(key) {
  var d = DICT[_locale] || DICT['zh-CN']
  return d[key] || key
}

export function setLocale(loc) {
  _locale = loc === 'en' ? 'en' : 'zh-CN'
}
