import type { Lesson } from '@/lib/database.types'
import { isEditable, getEditTimeRemaining } from '@/lib/utils'

interface LessonRowProps {
  lesson: Lesson
  index: number
  isCompleted?: boolean
  isLocked?: boolean
  onClick?: () => void
  showTeacherActions?: boolean
  onEdit?: () => void
}

export function LessonRow({
  lesson,
  index,
  isCompleted = false,
  isLocked = false,
  onClick,
  showTeacherActions = false,
  onEdit,
}: LessonRowProps) {
  const editable = isEditable(lesson.created_at)

  return (
    <div
      className={`lesson-row ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}
      onClick={isLocked ? undefined : onClick}
    >
      <div className={`lesson-number ${isCompleted ? 'done' : ''}`}>
        {isCompleted ? '✓' : index + 1}
      </div>
      <div className="lesson-info">
        <div className="lesson-title">{lesson.title}</div>
        <div className="lesson-meta">
          {lesson.description ? lesson.description : 'Click to watch lesson and complete quiz'}
        </div>
      </div>

      {showTeacherActions ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span className={`edit-lock-badge ${editable ? 'edit-lock-open' : 'edit-lock-locked'}`}>
            {editable ? `⏳ ${getEditTimeRemaining(lesson.created_at)}` : '🔒 Locked'}
          </span>
          {onEdit && (
            <button
              className="btn btn-sm btn-outline"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              Edit
            </button>
          )}
        </div>
      ) : (
        <div className="lesson-status">
          {isCompleted ? '✅' : isLocked ? '🔒' : '▶️'}
        </div>
      )}
    </div>
  )
}
