import { create } from 'zustand'

interface DraggingStore {
  draggingType: string | null
  setDraggingType: (type: string | null) => void
}

export const useDraggingStore = create<DraggingStore>()((set) => ({
  draggingType: null,
  setDraggingType: (type) => set({ draggingType: type }),
}))
