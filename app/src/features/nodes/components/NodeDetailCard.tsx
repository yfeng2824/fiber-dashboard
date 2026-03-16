'use client';

import React from "react";
import { GlassCardContainer } from "@/shared/components/ui/GlassCardContainer";
import { StatusBadge, StatusType } from "@/shared/components/ui/StatusBadge";
import Image from "next/image";
import { CopyButton } from "@/shared/components/ui/CopyButton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export interface NodeDetailCardProps {
  /** 节点名称 */
  name: string;
  /** 节点状态 */
  status?: StatusType;
  /** 哈希值 */
  hash: string;
  /** 地理位置 */
  location?: string;
  /** 最后出现时间 */
  lastSeen?: string;
  /** 自定义类名 */
  className?: string;
  /** 是否为未公告节点 */
  isUnannounced?: boolean;
  /** 加载中状态 */
  isLoading?: boolean;
}

export const NodeDetailCard: React.FC<NodeDetailCardProps> = ({
  name,
  status = "Active",
  hash,
  location,
  lastSeen,
  className = "",
  isUnannounced = false,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <GlassCardContainer className={className}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-[520px] max-w-full" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 w-56" />
          <div className="flex items-center gap-6 flex-wrap">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      </GlassCardContainer>
    );
  }

  return (
    <GlassCardContainer className={className}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex min-w-0 max-w-full items-center gap-1">
            <h2 className="type-h3 text-primary truncate" title={hash}>
              {hash}
            </h2>
            <CopyButton text={hash} ariaLabel="Copy node ID" />
          </div>
          {isUnannounced ? (
            <div className="min-h-6 px-2 py-0.5 rounded-full border bg-layer-hover border-default inline-flex justify-center items-center gap-1 whitespace-nowrap">
              <span className="type-caption text-tertiary">Unknown</span>
            </div>
          ) : (
            <StatusBadge status={status} />
          )}
        </div>

        {isUnannounced ? (
          <p className="type-body text-secondary">
            This node is unannounced, so only limited details are available.
          </p>
        ) : (
          <>
            <p className="type-body text-secondary break-words">Name: {name || "Unnamed"}</p>
            <div className="flex items-center gap-6 flex-wrap">
              {location ? (
                <div className="flex items-center gap-1">
                  <Image
                    src="/location.svg"
                    alt="Location"
                    width={16}
                    height={16}
                    className="w-4 h-4"
                  />
                  <p className="type-body text-primary">{location}</p>
                </div>
              ) : null}
              {lastSeen ? (
                <p className="type-body text-primary">Last seen on: {lastSeen}</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </GlassCardContainer>
  );
};
