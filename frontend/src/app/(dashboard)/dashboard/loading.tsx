import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="space-y-6">
            {/* Cards skeleton */}
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-4" />
                        </div>
                        <Skeleton className="h-8 w-28" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                ))}
            </div>

            {/* Chart + list skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-lg border bg-card p-6">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <Skeleton className="h-[350px] w-full" />
                </div>
                <div className="col-span-3 rounded-lg border bg-card p-6 space-y-4">
                    <Skeleton className="h-5 w-40" />
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                            <div className="space-y-2 flex-grow pr-4">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <Skeleton className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
