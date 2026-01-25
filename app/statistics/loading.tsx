export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Header Skeleton */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="w-32 h-6 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="w-48 h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters Skeleton */}
        <div className="mb-6 flex items-center gap-4">
          <div className="w-24 h-8 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="w-32 h-8 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-4"
            >
              <div className="w-40 h-6 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
              <div className="h-72 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="mb-8">
          <div className="w-48 h-6 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
          <div className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl overflow-hidden">
            <div className="h-12 bg-gray-100 dark:bg-slate-800 animate-pulse" />
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="h-16 border-t border-gray-100 dark:border-border bg-gray-50 dark:bg-slate-900/50 animate-pulse"
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
