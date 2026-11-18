"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Task, TaskStatus } from "@/types/database.types";
import { TaskCard } from "./task-card";
import { Plus, MoreVertical, CheckCircle2, ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeStatus } from "@/lib/data/task-state-machine";

export interface TaskKanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onNewTask?: (status?: TaskStatus) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  className?: string;
}

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  badgeClass: string;
  dotColor: string;
  description: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: "PENDING",
    title: "Not Started",
    badgeClass: "bg-neutral-100 text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-300",
    dotColor: "bg-neutral-400",
    description: "Tasks in backlog waiting to begin",
  },
  {
    id: "IN_PROGRESS",
    title: "Pending",
    badgeClass: "bg-[#FEE4E2] text-[#B42318] dark:bg-[#B42318]/25 dark:text-[#FDA29B]",
    dotColor: "bg-[#F04438]",
    description: "Active work in progress",
  },
  {
    id: "DONE",
    title: "Completed",
    badgeClass: "bg-[#D1FADF] text-[#027A48] dark:bg-[#027A48]/25 dark:text-[#6CE9A6]",
    dotColor: "bg-[#12B76A]",
    description: "Verified & completed deliverables",
  },
  {
    id: "AWAITING_VERIFICATION",
    title: "Under Review",
    badgeClass: "bg-[#FEF0C7] text-[#B54708] dark:bg-[#B54708]/25 dark:text-[#FDB022]",
    dotColor: "bg-[#F79009]",
    description: "Awaiting manager / boss signoff",
  },
];

export function TaskKanbanBoard({
  tasks,
  onTaskClick,
  onNewTask,
  onStatusChange,
  className,
}: TaskKanbanBoardProps) {
  const [mounted, setMounted] = useState(false);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragCardSize, setDragCardSize] = useState<{ width: number; height: number } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [justDroppedTaskId, setJustDroppedTaskId] = useState<string | null>(null);

  const pointerStateRef = useRef<{
    task: Task | null;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    cardWidth: number;
    cardHeight: number;
    isDragging: boolean;
  }>({
    task: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    cardWidth: 0,
    cardHeight: 0,
    isDragging: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Group tasks by (normalized) lifecycle status. Legacy OVERDUE rows land in IN_PROGRESS;
  // overdue-ness itself is shown on the card. CANCELLED tasks are off-board (see footer).
  const getTasksForColumn = (status: TaskStatus) =>
    tasks.filter((t) => normalizeStatus(t.status) === status);
  const cancelledCount = tasks.filter((t) => t.status === "CANCELLED").length;
  const isReadOnly = !onStatusChange;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, task: Task) => {
    if (e.button !== 0) return; // Only primary mouse button or single touch

    const cardElement = e.currentTarget as HTMLElement;
    const rect = cardElement.getBoundingClientRect();

    pointerStateRef.current = {
      task,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      cardWidth: rect.width,
      cardHeight: rect.height,
      isDragging: false,
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      const state = pointerStateRef.current;
      if (!state.task) return;

      const dist = Math.hypot(moveEv.clientX - state.startX, moveEv.clientY - state.startY);

      if (!state.isDragging && dist > 5 && !isReadOnly) {
        state.isDragging = true;
        setDraggingTask(state.task);
        setDragCardSize({ width: state.cardWidth, height: state.cardHeight });
        setDragOffset({ x: state.offsetX, y: state.offsetY });
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }

      if (state.isDragging) {
        setDragPos({ x: moveEv.clientX, y: moveEv.clientY });

        // Detect column under cursor
        const target = document.elementFromPoint(moveEv.clientX, moveEv.clientY);
        const columnEl = target?.closest("[data-kanban-column]") as HTMLElement | null;
        const colId = (columnEl?.getAttribute("data-kanban-column") as TaskStatus) || null;
        setDragOverColumn(colId);
      }
    };

    const handlePointerUp = (upEv: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      const state = pointerStateRef.current;
      if (!state.task) return;

      if (state.isDragging) {
        // Detect target drop column
        const target = document.elementFromPoint(upEv.clientX, upEv.clientY);
        const columnEl = target?.closest("[data-kanban-column]") as HTMLElement | null;
        const targetStatus = (columnEl?.getAttribute("data-kanban-column") as TaskStatus) || null;

        if (targetStatus && targetStatus !== normalizeStatus(state.task.status) && onStatusChange) {
          onStatusChange(state.task.id, targetStatus);
          const movedId = state.task.id;
          setJustDroppedTaskId(movedId);
          setTimeout(() => {
            setJustDroppedTaskId((prev) => (prev === movedId ? null : prev));
          }, 1800);
        }
      } else {
        // Pure click: cleanly open task details without any drag glitch
        onTaskClick?.(state.task);
      }

      // Reset drag state
      pointerStateRef.current = {
        task: null,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
        cardWidth: 0,
        cardHeight: 0,
        isDragging: false,
      };
      setDraggingTask(null);
      setDragPos(null);
      setDragOffset(null);
      setDragCardSize(null);
      setDragOverColumn(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 pb-6 overflow-x-auto select-none",
          className
        )}
      >
        {COLUMNS.map((col) => {
          const columnTasks = getTasksForColumn(col.id);
          const isColumnTargeted = dragOverColumn === col.id && !!draggingTask;

          return (
            <div
              key={col.id}
              data-kanban-column={col.id}
              className={cn(
                "glass-column flex flex-col min-w-[280px] p-3 sm:p-3.5 transition-all duration-300 relative",
                isColumnTargeted && [
                  "ring-2 ring-brand/70 dark:ring-brand/80",
                  "bg-gradient-to-b from-brand/[0.06] via-brand/[0.02] to-transparent",
                  "shadow-[0_14px_36px_-6px_rgba(35,87,214,0.22)]",
                  "scale-[1.01] -translate-y-0.5"
                ]
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1.5 py-1 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold text-[#111111] dark:text-white tracking-[-0.01em]">
                    {col.title}
                  </h3>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10.5px] font-medium select-none shadow-2xs border border-black/[0.04] dark:border-white/[0.08] transition-all duration-200",
                      col.badgeClass,
                      isColumnTargeted && "scale-110 ring-2 ring-brand/40"
                    )}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                <button
                  type="button"
                  className="p-1 rounded-md text-[#666666] hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title={`${col.title} options`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks Container */}
              <div className="flex-1 space-y-3.5 min-h-[300px]">
                {/* Dynamic Animated Drop Target Indicator at top of populated column */}
                {isColumnTargeted && columnTasks.length > 0 && (
                  <div className="rounded-xl border-2 border-dashed border-brand dark:border-brand bg-gradient-to-r from-brand/10 via-blue-600/15 to-brand/10 p-3.5 flex items-center justify-between text-xs font-bold text-brand dark:text-blue-300 animate-kanban-dropzone animate-in fade-in slide-in-from-top-2 duration-200 select-none shadow-[0_4px_16px_rgba(35,87,214,0.15)] relative overflow-hidden">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-brand/20 dark:bg-brand/30 flex items-center justify-center shrink-0">
                        <ArrowDownToLine className="w-4 h-4 animate-bounce" />
                      </div>
                      <div className="flex flex-col">
                        <span className="leading-tight">Drop to move to {col.title}</span>
                        <span className="text-[10px] font-normal opacity-80">
                          {draggingTask ? `Reassigning #${draggingTask.task_no}` : "Release mouse to drop"}
                        </span>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-brand animate-ping" />
                  </div>
                )}

                {columnTasks.length === 0 ? (
                  isColumnTargeted ? (
                    <div className="h-32 rounded-2xl border-2 border-dashed border-brand dark:border-brand bg-brand/10 dark:bg-brand/15 flex flex-col items-center justify-center gap-2 text-center p-4 animate-kanban-dropzone animate-in fade-in zoom-in-95 duration-200 select-none">
                      <div className="w-10 h-10 rounded-full bg-brand/20 dark:bg-brand/30 flex items-center justify-center text-brand dark:text-blue-300">
                        <ArrowDownToLine className="w-5 h-5 animate-bounce" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand dark:text-blue-300">
                          Drop task into {col.title}
                        </p>
                        <p className="text-[11px] text-[#666666] dark:text-[#A3A3A3] mt-0.5">
                          Will transition to {col.title}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.1] text-center text-xs text-[#666666] dark:text-[#A3A3A3]">
                      <span>No tasks in {col.title}</span>
                    </div>
                  )
                ) : (
                  columnTasks.map((task) => {
                    const isCardLifted = draggingTask?.id === task.id;
                    const isJustDropped = justDroppedTaskId === task.id;

                    // When lifted, render a clean placeholder slot in the origin column
                    if (isCardLifted) {
                      return (
                        <div
                          key={task.id}
                          style={{ height: dragCardSize?.height || 160 }}
                          className="w-full rounded-2xl border-2 border-dashed border-brand/40 dark:border-brand/40 bg-brand/[0.03] dark:bg-brand/[0.06] flex items-center justify-center text-xs font-semibold text-brand/70 dark:text-blue-300/70 animate-pulse transition-all duration-200 select-none"
                        >
                          <span>Moving #{task.task_no}...</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={task.id}
                        onPointerDown={(e) => handlePointerDown(e, task)}
                        className={cn(
                          "relative rounded-2xl select-none touch-none",
                          !draggingTask && "cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-lg transition-all duration-200 ease-out",
                          draggingTask && "opacity-85 transition-opacity duration-300",
                          isJustDropped && "animate-kanban-land ring-2 ring-brand dark:ring-brand"
                        )}
                      >
                        {/* Celebratory Just Landed Badge */}
                        {isJustDropped && (
                          <div className="absolute -top-2.5 right-3 z-30 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#12B76A] text-white text-[10px] font-black shadow-lg animate-in fade-in zoom-in-75 duration-200 pointer-events-none">
                            <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                            <span>Moved</span>
                          </div>
                        )}

                        <TaskCard task={task} />
                      </div>
                    );
                  })
                )}
              </div>

              {/* New Task Action - Minimalist Brand Book Frosted Action */}
              <div className="mt-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNewTask?.(col.id)}
                  className="w-full h-8 flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-medium text-[#666666] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-dashed border-black/[0.08] dark:border-white/[0.1] transition-all cursor-pointer select-none active:scale-[0.98] group"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2] transition-transform group-hover:rotate-90 duration-200" />
                  <span>New Task</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(cancelledCount > 0 || isReadOnly) && (
        <p className="-mt-3 px-1 text-[11px] text-[#666666] dark:text-neutral-500">
          {isReadOnly && "Read-only board. "}
          {cancelledCount > 0 &&
            `${cancelledCount} cancelled task${cancelledCount === 1 ? " is" : "s are"} hidden from the board — switch to list view to see ${cancelledCount === 1 ? "it" : "them"}.`}
        </p>
      )}

      {/* Lifted Floating Card: Moves with cursor in real-time with Apple-style highlight & lift */}
      {mounted && draggingTask && dragPos && dragOffset && dragCardSize &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: dragPos.x - dragOffset.x,
              top: dragPos.y - dragOffset.y,
              width: dragCardSize.width,
              height: dragCardSize.height,
              zIndex: 99999,
              pointerEvents: "none",
              transform: "scale(1.025) rotate(1deg)",
              transition: "transform 0.1s ease-out",
            }}
            className="apple-card ring-2 ring-brand dark:ring-brand shadow-[0_24px_50px_-10px_rgba(35,87,214,0.35),0_12px_24px_-8px_rgba(0,0,0,0.25)] rounded-2xl select-none"
          >
            <TaskCard task={draggingTask} />
          </div>,
          document.body
        )
      }
    </>
  );
}

export default TaskKanbanBoard;

