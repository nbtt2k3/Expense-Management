export default function Loading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex justify-between items-center">
                <div className="h-8 w-28 bg-muted rounded" />
                <div className="h-10 w-28 bg-muted rounded" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
                        <div className="flex justify-between">
                            <div className="h-4 w-24 bg-muted rounded" />
                            <div className="h-4 w-20 bg-muted rounded" />
                        </div>
                        <div className="h-8 w-16 bg-muted rounded" />
                        <div className="h-2 w-full bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
