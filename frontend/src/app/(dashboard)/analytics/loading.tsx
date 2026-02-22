import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="rounded-lg border bg-card p-6 col-span-4">
                    <Skeleton className="h-5 w-40 mb-4" />
                    <Skeleton className="h-[300px] w-full" />
                </div>
                <div className="rounded-lg border bg-card p-6 col-span-3">
                    <Skeleton className="h-5 w-40 mb-4" />
                    <Skeleton className="h-[300px] w-full" />
                </div>
            </div>
        </div>
    );
}
