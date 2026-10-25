import { defineStore } from 'pinia'
import { ref } from 'vue'

/** How the writing view is arranged right now. Not saved: the app opens with everything visible. */
export const useViewStore = defineStore('view', () => {
  const focusMode = ref(false)
  const navigatorHidden = ref(false)
  return { focusMode, navigatorHidden }
})
