/** How a lesson is given to a class, chosen in the panel before "Giao cho lớp" (class_lessons + class_lesson_students). */
export interface GiveSettings {
  /** ISO timestamp, or null for no deadline. */
  dueAt: string | null
  /** true: the whole class; false: only `studentIds`. */
  forAll: boolean
  studentIds: string[]
  showResults: boolean
  shuffle: boolean
}
