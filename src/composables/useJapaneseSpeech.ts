import { computed, onBeforeUnmount, ref } from 'vue'
import { useEventListener, useSupported } from '@vueuse/core'

export type PlaybackState =
  'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'stopped' | 'error'
// SpeechSynthesis is a single device resource; ownership is transient, never learning progress.
let activeStop: (() => void) | undefined

export function useJapaneseSpeech() {
  const speed = ref(0.9),
    state = ref<PlaybackState>('idle'),
    progress = ref(0),
    hasBoundary = ref(false)
  const isSupported = useSupported(
    () =>
      typeof window !== 'undefined' &&
      !!window.speechSynthesis &&
      typeof SpeechSynthesisUtterance !== 'undefined',
  )
  const isActive = computed(() => ['loading', 'playing', 'paused'].includes(state.value))
  const indeterminate = computed(() => isActive.value && !hasBoundary.value)
  let sequence = 0,
    alive = true

  function stop() {
    sequence++
    if (activeStop === stop) {
      activeStop = undefined
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* Provider may be unavailable. */
      }
    }
    progress.value = 0
    hasBoundary.value = false
    state.value = 'stopped'
  }
  function play(script: string) {
    if (!isSupported.value || !script.trim() || !alive || document.hidden) return
    activeStop?.()
    stop()
    const token = ++sequence
    const current = () => alive && token === sequence && activeStop === stop
    activeStop = stop
    state.value = 'loading'
    try {
      const engine = window.speechSynthesis,
        utterance = new SpeechSynthesisUtterance(script)
      utterance.lang = 'ja-JP'
      utterance.rate = speed.value
      utterance.pitch = 1
      utterance.volume = 1
      const voices = engine.getVoices()
      utterance.voice =
        voices.find((v) => v.lang === 'ja-JP') ??
        voices.find((v) => v.lang.startsWith('ja')) ??
        null
      utterance.onstart = () => {
        if (current()) state.value = 'playing'
      }
      utterance.onpause = () => {
        if (current()) state.value = 'paused'
      }
      utterance.onresume = () => {
        if (current()) state.value = 'playing'
      }
      utterance.onboundary = (event) => {
        if (!current() || !Number.isFinite(event.charIndex) || event.charIndex < 0) return
        hasBoundary.value = true
        progress.value = Math.max(
          progress.value,
          Math.min(99, Math.floor((event.charIndex / script.length) * 100)),
        )
      }
      utterance.onend = () => {
        if (!current()) return
        progress.value = 100
        state.value = 'ended'
        activeStop = undefined
      }
      utterance.onerror = () => {
        if (!current()) return
        stop()
        state.value = 'error'
      }
      engine.cancel()
      if (engine.paused) engine.resume()
      engine.speak(utterance)
    } catch {
      if (current()) {
        stop()
        state.value = 'error'
      }
    }
  }
  function pause() {
    if (activeStop !== stop || state.value !== 'playing') return
    try {
      window.speechSynthesis.pause()
      state.value = 'paused'
    } catch {
      stop()
      state.value = 'error'
    }
  }
  function resume() {
    if (activeStop !== stop || state.value !== 'paused') return
    try {
      window.speechSynthesis.resume()
      state.value = 'playing'
    } catch {
      stop()
      state.value = 'error'
    }
  }
  function toggle(script: string) {
    if (state.value === 'playing') pause()
    else if (state.value === 'paused') resume()
    else if (state.value !== 'loading') play(script)
  }
  useEventListener(document, 'visibilitychange', () => {
    if (document.hidden && activeStop === stop) stop()
  })
  onBeforeUnmount(() => {
    stop()
    alive = false
  })
  return {
    speech: { isSupported },
    speed,
    state,
    progress,
    indeterminate,
    isActive,
    play,
    pause,
    resume,
    toggle,
    stop,
  }
}
