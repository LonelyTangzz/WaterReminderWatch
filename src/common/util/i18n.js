/**
 * 简易 i18n 工具（纯同步，不依赖 storage）。
 * 默认 zh-CN，可通过 setLocale('en') 切换。
 */
var _locale = 'zh-CN'

var DICT = {
  'zh-CN': {
    history: '历史', settings: '设置', title: '设置',
    goal: '目标', interval: '间隔', smallCup: '小杯', mediumCup: '中杯', largeCup: '大杯',
    reminder: '提醒', reminderOn: '已开启', reminderOff: '已关闭',
    quietHint: '睡眠 22:00–08:00 不提醒', clearToday: '清空今日', back: '返回',
    today: '今日', times: '次', noRecord: '今天还没有记录',
    clearDone: '今日记录已清空', saveFail: '保存失败',
    reminderOnMsg: '提醒已开启', reminderOffMsg: '提醒已关闭'
  },
  'en': {
    history: 'History', settings: 'Settings', title: 'Settings',
    goal: 'Goal', interval: 'Interval', smallCup: 'Small', mediumCup: 'Med', largeCup: 'Large',
    reminder: 'Reminder', reminderOn: 'ON', reminderOff: 'OFF',
    quietHint: 'Quiet 22:00–08:00', clearToday: 'Clear', back: 'Back',
    today: 'Today', times: 'times', noRecord: 'No records',
    clearDone: 'Cleared', saveFail: 'Failed',
    reminderOnMsg: 'Reminder ON', reminderOffMsg: 'Reminder OFF'
  }
}

export function t(key) {
  var d = DICT[_locale] || DICT['zh-CN']
  return d[key] || key
}

export function setLocale(loc) {
  _locale = loc === 'en' ? 'en' : 'zh-CN'
}
