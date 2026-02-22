import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Search bar skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
                <Skeleton className="h-10 w-full sm:w-72" />
            </div>

            {/* Table skeleton */}
            <div className="rounded-md border bg-card shadow-sm p-4">
                <div className="space-y-4">
                    <div className="flex gap-4 pb-4 border-b">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-4 flex-1" />
                        ))}
                    </div>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex gap-4 py-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-5 w-[80px] rounded-full" />
                            <Skeleton className="h-4 w-[80px]" />
                            <Skeleton className="h-8 w-8 ml-auto" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
