import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon:        LucideIcon
  title:       string
  description?: string
  action?:     React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center mb-4">
        <Icon size={20} strokeWidth={1.5} className="text-stone-300" />
      </div>
      <p className="text-[14px] font-medium text-stone-700 mb-1">{title}</p>
      {description && (
        <p className="text-[13px] text-stone-400 max-w-xs leading-relaxed mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
