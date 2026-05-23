/**
 * 历史数据存储（独立模块，避免修改稳定的 store.js）。
 *
 * 从 store.js 导入 getToday/setItem/getItem，向上提供 getHistory/archiveToday/exportData。
 */
import { getToday, getItem, setItem, todayKey } from './store.js'

var HISTORY_KEY = 'wr_history_v1'
var MAX_DAYS = 30

/**
 * 读取历史记录（最近N天，降序）。
 * @returns {Promise<Array>}
 */
export function getHistory() {
  return getItem(HISTORY_KEY).then(function (raw) {
    if (!raw) return []
    try {
      var obj = JSON.parse(raw)
      var days = []
      for (var k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          days.push({ dateKey: k, totalMl: obj[k].totalMl || 0, entries: obj[k].entries || [] })
        }
      }
      days.sort(function (a, b) { return a.dateKey < b.dateKey ? 1 : -1 })
      return days.slice(0, MAX_DAYS)
    } catch (e) { return [] }
  })
}

/**
 * 归档今日数据到历史。
 */
export function archiveToday() {
  var tk = todayKey()
  return getToday().then(function (today) {
    return getHistory().then(function (history) {
      var found = -1
      for (var i = 0; i < history.length; i++) {
        if (history[i].dateKey === tk) { found = i; break }
      }
      if (found >= 0) {
        history[found].totalMl = today.totalMl
        history[found].entries = today.entries
      } else if (today.totalMl > 0) {
        history.unshift({ dateKey: tk, totalMl: today.totalMl, entries: today.entries })
      }
      var trimmed = history.slice(0, MAX_DAYS)
      var obj = {}
      for (var j = 0; j < trimmed.length; j++) {
        obj[trimmed[j].dateKey] = { totalMl: trimmed[j].totalMl, entries: trimmed[j].entries }
      }
      return setItem(HISTORY_KEY, JSON.stringify(obj))
    })
  })
}

/** 导出 CSV 文本。 */
export function exportData() {
  return getHistory().then(function (history) {
    if (!history || !history.length) return ''
    var lines = ['date,total_ml,count']
    for (var i = 0; i < history.length; i++) {
      var d = history[i]
      lines.push(d.dateKey + ',' + d.totalMl + ',' + d.entries.length)
    }
    return lines.join('\n')
  })
}
