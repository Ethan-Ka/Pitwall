import { create } from 'zustand'

interface FocusEditorStore {
  editingWidgetId: string | null
  setEditingWidgetId: (widgetId: string | null) => void
}

export const useFocusEditorStore = create<FocusEditorStore>()((set) => ({
  editingWidgetId: null,
  setEditingWidgetId: (widgetId) => set({ editingWidgetId: widgetId }),
}))
