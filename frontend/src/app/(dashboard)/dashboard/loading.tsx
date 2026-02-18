export default function Loading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-40 bg-muted rounded" />
            </div>

            {/* Cards skeleton */}
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
                        <div className="flex justify-between">
                            <div className="h-4 w-24 bg-muted rounded" />
                            <div className="h-4 w-4 bg-muted rounded" />
                        </div>
                        <div className="h-8 w-28 bg-muted rounded" />
                        <div className="h-3 w-16 bg-muted rounded" />
                    </div>
                ))}
            </div>

            {/* Chart + list skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-lg border bg-card p-6">
                    <div className="h-5 w-32 bg-muted rounded mb-4" />
                    <div className="h-[350px] bg-muted rounded" />
                </div>
                <div className="col-span-3 rounded-lg border bg-card p-6 space-y-4">
                    <div className="h-5 w-40 bg-muted rounded" />
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                            <div className="space-y-2">
                                <div className="h-4 w-28 bg-muted rounded" />
                                <div className="h-3 w-16 bg-muted rounded" />
                            </div>
                            <div className="h-4 w-16 bg-muted rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
