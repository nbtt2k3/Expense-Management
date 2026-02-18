export default function Loading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <div className="h-8 w-32 bg-muted rounded" />
                    <div className="h-4 w-48 bg-muted rounded" />
                </div>
                <div className="h-10 w-32 bg-muted rounded" />
            </div>

            {/* Search bar skeleton */}
            <div className="h-12 bg-muted rounded-lg" />

            {/* Table skeleton */}
            <div className="rounded-md border bg-card">
                <div className="p-4 space-y-4">
                    <div className="flex gap-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-4 flex-1 bg-muted rounded" />
                        ))}
                    </div>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="flex gap-4 py-2">
                            {[1, 2, 3, 4, 5].map(j => (
                                <div key={j} className="h-4 flex-1 bg-muted rounded" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
