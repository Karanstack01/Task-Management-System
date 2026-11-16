import React from "react";
import { PageLayoutSkeleton } from "@/components/common/skeleton-loaders";

export default function RootLoading() {
  return (
    <div className="w-full min-h-[85vh] animate-fadeIn">
      <PageLayoutSkeleton viewType="kanban" />
    </div>
  );
}
