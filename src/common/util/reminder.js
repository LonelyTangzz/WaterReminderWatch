/**
 * 提醒工具。
 *
 * 震动 + 花样提醒语 + 睡眠免打扰。
 * 提醒由 app.ux 统一调度（回调链保活），本模块提供原子能力。
 *
 * 震动：Watch S4 只支持 `vibrator.vibrate({mode})`（start 为 undefined）。
 */
import vibrator from '@system.vibrator'
import prompt from '@system.prompt'

var fgTimerId = null

/**
 * 花样喝水提醒语库。
 * 每次提醒随机抽取一条，避免审美疲劳。
 * 按风格分类：可爱 / 科普 / 毒舌 / 励志 / 日常
 */
var REMINDER_MESSAGES = [
  // ── 可爱风 ──
  '💧 嘀嗒～你的身体在喊渴啦！',
  '🫧 咕噜咕噜，是时候补充水分啦～',
  '🐳 小鲸鱼提醒你：该喝水了！',
  '🌸 喝水时间到！做一朵水润的小花～',
  '🍀 叮！你的幸运水滴已送达～',
  '💙 水分子们想你了，快来一杯！',

  // ── 科普风 ──
  '🧠 大脑 75% 是水，不补会变笨哦～',
  '🩸 血液缺水会变稠，心脏很累的！',
  '🔬 缺水 2% 就会头晕乏力，快喝！',
  '💪 肌肉缺水 = 力量减 10%，你忍心？',
  '🫁 每次呼吸都在失水，该补仓了！',
  '🧬 细胞在喊 SOS：缺水缺水缺水！',

  // ── 毒舌/幽默风 ──
  '😤 再不喝水，你的肾要罢工了！',
  '🦴 你已经是一块人形饼干干了…喝水！',
  '👴 不喝水老得快，皱纹在路上了！',
  '😑 系统检测到宿主水分不足，强制执行…',
  '🥀 你正在变成一株枯萎的植物…',
  '📢 本条消息由你的肾脏赞助播出',

  // ── 励志/暖心风 ──
  '✨ 喝完这杯，离健康又近一步！',
  '🏆 今日喝水成就 +1，继续加油！',
  '🌟 每一滴水都在滋养更好的你～',
  '🎯 小目标：活着。大前提：喝水。',
  '💎 水是最便宜的保健品，快薅！',
  '🌈 喝完水的人运气不会太差～',

  // ── 日常/实用风 ──
  '🥤 站起来接杯水，顺便活动活动～',
  '⏰ 定时喝水，比女朋友还关心你',
  '📱 放下手机，拿起水杯，就现在！',
  '🚰 吨吨吨～ 一口气补充 250ml！',
  '🧊 加点冰块，快乐加倍～',
  '🍵 白水喝腻了？泡杯茶也算！'
]

var _msgIndex = -1

/**
 * 获取下一条提醒语（随机不连续）。
 * @returns {string}
 */
export function pickReminderMessage() {
  var idx
  do {
    idx = Math.floor(Math.random() * REMINDER_MESSAGES.length)
  } while (idx === _msgIndex && REMINDER_MESSAGES.length > 1)
  _msgIndex = idx
  return REMINDER_MESSAGES[idx]
}

/** 睡眠免打扰时段（含起始时，不含结束时）：22:00 → 次日 08:00。 */
var QUIET_START = 22
var QUIET_END = 8

/**
 * 当前是否处于睡眠免打扰时段。跨午夜区间：h>=22 或 h<8。
 * @returns {boolean}
 */
export function isQuietTime() {
  var h = new Date().getHours()
  if (QUIET_START < QUIET_END) {
    return h >= QUIET_START && h < QUIET_END
  }
  return h >= QUIET_START || h < QUIET_END
}

/**
 * 定时触发用：睡眠时段内静默跳过，否则正常提醒。
 */
export function maybeFireReminder() {
  if (isQuietTime()) {
    console.log('[reminder] quiet time, skip')
    return
  }
  fireReminder()
}

/**
 * 触发一次提醒：连震 3 下 + 随机花样 toast。
 * 手动调用无视睡眠时段。
 *
 * 注意：S4 不支持 system.notification（会导致应用无法加载），
 * 因此仅用 toast + 震动组合。未读信息通知属平台限制，无法实现。
 */
export function fireReminder() {
  // 独特震动：两组三联短震
  vibratePattern()
  var msg = pickReminderMessage()
  try {
    prompt.showToast({ message: msg, duration: 0 })
  } catch (e) {
    console.warn('[reminder] toast fail', e)
  }
}

/** 两组三联短震(sh-sh-sh p sh-sh-sh)，与普通通知区分。 */
export function vibratePattern() {
  var v = function (mode) {
    try { if (vibrator && vibrator.vibrate) vibrator.vibrate({ mode: mode || 'long' }) } catch (e) {}
  }
  v('short')
  setTimeout(function () { v('short') }, 200)
  setTimeout(function () { v('short') }, 400)
  setTimeout(function () { v('short') }, 900)
  setTimeout(function () { v('short') }, 1100)
  setTimeout(function () { v('short') }, 1300)
}

/**
 * 震动一次。Watch S4 只支持 `vibrator.vibrate({mode})`，mode='long' 长震。
 */
export function vibrate() {
  try {
    if (vibrator && typeof vibrator.vibrate === 'function') {
      vibrator.vibrate({ mode: 'long' })
    }
  } catch (e) {
    console.warn('[reminder] vibrate() error', e)
  }
}

/**
 * 连续震动 n 下，每下间隔约 900ms。
 * @param {number} n 次数
 */
export function vibrateTimes(n) {
  vibrate()
  if (n > 1) {
    setTimeout(function () { vibrateTimes(n - 1) }, 900)
  }
}
