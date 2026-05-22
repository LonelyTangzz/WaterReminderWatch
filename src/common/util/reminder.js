/**
 * 提醒工具（前台版）。
 *
 * 平台限制：Watch S4 的 Vela 不向第三方快应用开放后台常驻 / 定时唤醒
 *（system.alarm 为空壳、音频保活无效，详见 CHANGELOG 2026-05-22）。
 * 因此提醒只在应用打开（前台）时通过 setInterval 触发，到点震动 + toast。
 * 后台定时提醒需借助手表系统自带闹钟兜底。
 *
 * 震动：Watch S4 只支持 `vibrator.vibrate({mode})`（start 为 undefined）。
 */
import vibrator from '@system.vibrator'
import prompt from '@system.prompt'
import audio from '@system.audio'

var fgTimerId = null

/**
 * 启动静音音频后台保活。按官方文档，后台逻辑应放在 app.ux 中调用
 *（页面会随退后台销毁，app 实例常驻）。持续播放静音 WAV +
 * notificationVisible 提升为前台服务级播放，尝试让应用退后台后不被冻结。
 */
export function startKeepAlive() {
  try {
    audio.src = '/common/silent.wav'
    audio.loop = true
    audio.streamType = 'music'
    audio.notificationVisible = true
    audio.title = '喝水提醒运行中'
    audio.play()
  } catch (e) {
    console.warn('[reminder] keepalive fail', e)
  }
}

/** 停止后台保活音频。 */
export function stopKeepAlive() {
  try {
    audio.stop()
  } catch (e) {
    console.warn('[reminder] stopKeepAlive error', e)
  }
}

/**
 * 启动前台定时提醒。重复调用会先清掉上一次的定时器。
 * @param {number} intervalMinutes 提醒间隔（分钟，最小 1）
 * @param {Function} [onTrigger] 触发回调；不传则默认 fireReminder
 */
export function startForeground(intervalMinutes, onTrigger) {
  stopForeground()
  var minutes = intervalMinutes < 1 ? 1 : intervalMinutes
  var ms = minutes * 60 * 1000
  fgTimerId = setInterval(function () {
    try {
      if (onTrigger) onTrigger()
      else fireReminder()
    } catch (e) {
      console.warn('[reminder] onTrigger error', e)
    }
  }, ms)
}

/** 停止前台定时提醒。 */
export function stopForeground() {
  if (fgTimerId) {
    clearInterval(fgTimerId)
    fgTimerId = null
  }
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

/** 触发一次提醒：连震 3 下 + toast。手动调用无视睡眠时段。 */
export function fireReminder() {
  vibrateTimes(3)
  try {
    prompt.showToast({ message: '该喝水啦，补充一杯吧 💧', duration: 0 })
  } catch (e) {
    console.warn('[reminder] toast fail', e)
  }
}

/**
 * 震动一次。Watch S4 只支持 `vibrator.vibrate({mode})`，mode='long' 长震。
 * 不抛错，失败仅打日志。
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
 * 连续震动 n 下，每下间隔约 900ms（vibrate 无 count 参数，靠定时器叠加）。
 * @param {number} n 次数
 */
export function vibrateTimes(n) {
  vibrate()
  if (n > 1) {
    setTimeout(function () { vibrateTimes(n - 1) }, 900)
  }
}
