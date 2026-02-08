export default function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h1 className="text-lg font-bold tracking-tight text-molt-text">{title}</h1>
      <div className="h-px flex-1 bg-molt-border" />
      <span className="text-xs text-molt-accent">
        <svg viewBox="0 0 16 16" fill="currentColor" className="inline h-3.5 w-3.5 mr-1">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.5a.75.75 0 0 0-1.5 0v3.25L5.5 10a.75.75 0 0 0 1.06 1.06L8 9.6l1.44 1.46A.75.75 0 0 0 10.5 10L8.75 8.75V5.5z" />
        </svg>
        LIVE
      </span>
    </div>
  );
}
