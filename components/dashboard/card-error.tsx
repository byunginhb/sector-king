export function CardError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
