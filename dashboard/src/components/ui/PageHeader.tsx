import RefreshButton from "./RefreshButton"

interface PageHeaderProps {
  title:       string
  description?: string
  action?:     React.ReactNode
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-stone-900">{title}</h1>
        {description && <p className="text-[13px] text-stone-500 mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <RefreshButton />
        {action}
      </div>
    </div>
  )
}
