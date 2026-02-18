export default function Loading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-28 bg-muted rounded" />
            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border bg-card p-6">
                    <div className="h-5 w-40 bg-muted rounded mb-4" />
                    <div className="h-[300px] bg-muted rounded" />
                </div>
                <div className="rounded-lg border bg-card p-6">
                    <div className="h-5 w-40 bg-muted rounded mb-4" />
                    <div className="h-[300px] bg-muted rounded" />
                </div>
            </div>
        </div>
    );
}
