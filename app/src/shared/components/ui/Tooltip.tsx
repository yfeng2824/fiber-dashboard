"use client";

import React, { ReactNode, useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export interface TooltipProps {
  /** Tooltip 显示的内容 */
  content: ReactNode;
  /** 触发 Tooltip 的子元素 */
  children: ReactNode;
  /** 是否显示 Tooltip */
  show: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否显示小三角指示器 */
  showArrow?: boolean;
  /** Tooltip 容器的自定义类名 */
  tooltipClassName?: string;
  /** Tooltip 位置：top（上方）或 bottom（下方），默认 top */
  placement?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  show,
  className = "",
  showArrow = true,
  tooltipClassName = "",
  placement = "top",
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
    arrowLeft: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (!show || !triggerRef.current || !tooltipRef.current || typeof window === "undefined") {
      return;
    }

    const VIEWPORT_PADDING = 16;
    const GAP = 8;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const preferredPlacement = placement;

    const canPlaceTop =
      triggerRect.top - GAP - tooltipRect.height >= VIEWPORT_PADDING;
    const canPlaceBottom =
      triggerRect.bottom + GAP + tooltipRect.height <=
      window.innerHeight - VIEWPORT_PADDING;

    let resolvedPlacement: "top" | "bottom" = preferredPlacement;
    if (preferredPlacement === "top" && !canPlaceTop && canPlaceBottom) {
      resolvedPlacement = "bottom";
    } else if (
      preferredPlacement === "bottom" &&
      !canPlaceBottom &&
      canPlaceTop
    ) {
      resolvedPlacement = "top";
    }

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const minCenterX = VIEWPORT_PADDING + tooltipRect.width / 2;
    const maxCenterX =
      window.innerWidth - VIEWPORT_PADDING - tooltipRect.width / 2;

    const clampedLeft =
      minCenterX > maxCenterX
        ? window.innerWidth / 2
        : Math.min(maxCenterX, Math.max(minCenterX, triggerCenterX));

    const idealTop =
      resolvedPlacement === "top"
        ? triggerRect.top - GAP - tooltipRect.height
        : triggerRect.bottom + GAP;

    const clampedTop = Math.min(
      window.innerHeight - VIEWPORT_PADDING - tooltipRect.height,
      Math.max(VIEWPORT_PADDING, idealTop)
    );

    const tooltipLeftEdge = clampedLeft - tooltipRect.width / 2;
    const ARROW_EDGE_PADDING = 12;
    const clampedArrowLeft = Math.min(
      tooltipRect.width - ARROW_EDGE_PADDING,
      Math.max(ARROW_EDGE_PADDING, triggerCenterX - tooltipLeftEdge)
    );

    setPosition({
      top: clampedTop,
      left: clampedLeft,
      placement: resolvedPlacement,
      arrowLeft: clampedArrowLeft,
    });
  }, [placement, show]);

  useEffect(() => {
    if (!show) {
      setPosition(null);
      return;
    }

    const rafId = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [show, content, updatePosition]);

  const isTop = (position?.placement || placement) === "top";
  const arrowClass = isTop
    ? "top-full border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-[#0f0f10]"
    : "bottom-full border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-[#0f0f10]";

  return (
    <div ref={triggerRef} className={`inline-block ${className}`}>
      {children}
      {show &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`fixed px-3 py-2 bg-inverse rounded-lg whitespace-nowrap pointer-events-none ${tooltipClassName}`}
            style={{
              zIndex: 999999,
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              transform: "translateX(-50%)",
              visibility: position ? "visible" : "hidden",
            }}
          >
            <div className="text-body text-on-color">{content}</div>
            {showArrow && (
              <div
                className={`absolute w-0 h-0 ${arrowClass}`}
                style={{
                  left: position?.arrowLeft ?? "50%",
                  transform: "translateX(-50%)",
                }}
              ></div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
