"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { GlassCardContainer, CopyButton, StatusBadge } from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatTimestamp } from "../utils";
import type { NodeInfoResponse } from "@/lib/types";

interface ChannelParticipantsProps {
  node1Info?: NodeInfoResponse | null;
  node2Info?: NodeInfoResponse | null;
  node1Id?: string;
  node2Id?: string;
  isLoading?: boolean;
}

function formatNodeId(nodeId: string): string {
  if (nodeId.length <= 33) return nodeId;
  return `${nodeId.slice(0, 18)}...${nodeId.slice(-15)}`;
}

function ParticipantCardHeader({
  nodeLabel,
  nodeId,
}: {
  nodeLabel: string;
  nodeId?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-start justify-between gap-3 w-full">
      <div className="type-label text-secondary">{nodeLabel}</div>
      {nodeId ? (
        <button
          type="button"
          onClick={() => router.push(`/node/${encodeURIComponent(nodeId)}`)}
          className="type-caption text-purple cursor-pointer hover:underline"
        >
          View details
        </button>
      ) : null}
    </div>
  );
}

function AnnouncedNodeCard({
  nodeLabel,
  nodeInfo,
}: {
  nodeLabel: string;
  nodeInfo: NodeInfoResponse;
}) {
  const displayName = nodeInfo.node_name && nodeInfo.node_name.trim() ? nodeInfo.node_name : "Unnamed";
  const location =
    nodeInfo.city && nodeInfo.country_or_region
      ? `${nodeInfo.city}, ${nodeInfo.country_or_region}`
      : nodeInfo.country_or_region || "Unknown";

  return (
    <GlassCardContainer className="h-full">
      <div className="flex flex-col gap-3">
        <ParticipantCardHeader nodeLabel={nodeLabel} nodeId={nodeInfo.node_id} />

        <div className="flex items-center gap-2 min-w-0">
          <p className="type-h3 text-primary truncate" title={nodeInfo.node_id}>
            {formatNodeId(nodeInfo.node_id)}
          </p>
          <CopyButton text={nodeInfo.node_id} />
          <StatusBadge status="Active" />
        </div>

        <p className="type-body text-secondary break-words">Name: {displayName}</p>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1">
            <Image src="/location.svg" alt="Location" width={16} height={16} className="w-4 h-4" />
            <p className="type-body text-primary">{location}</p>
          </div>
          <p className="type-body text-primary">
            Last seen: {formatTimestamp(nodeInfo.announce_timestamp)}
          </p>
        </div>
      </div>
    </GlassCardContainer>
  );
}

function UnannouncedNodeCard({
  nodeLabel,
  nodeId,
}: {
  nodeLabel: string;
  nodeId?: string;
}) {
  return (
    <GlassCardContainer className="h-full">
      <div className="flex flex-col gap-3">
        <ParticipantCardHeader nodeLabel={nodeLabel} nodeId={nodeId} />

        <div className="flex items-center gap-2 min-w-0">
          <p className="type-h3 text-primary truncate" title={nodeId || "Unannounced node"}>
            {nodeId ? formatNodeId(nodeId) : "Unannounced node"}
          </p>
          {nodeId ? <CopyButton text={nodeId} /> : null}
          <div className="min-h-6 px-2 py-0.5 rounded-full border bg-layer-hover border-default inline-flex justify-center items-center gap-1 whitespace-nowrap">
            <span className="type-caption text-tertiary">Unknown</span>
          </div>
        </div>

        <p className="type-body text-tertiary">
          This node is unannounced, so only limited details are available.
        </p>
      </div>
    </GlassCardContainer>
  );
}

export function ChannelParticipants({
  node1Info,
  node2Info,
  node1Id,
  node2Id,
  isLoading = false,
}: ChannelParticipantsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCardContainer className="h-full">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between w-full">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-64" />
            <div className="flex items-center gap-6">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
        </GlassCardContainer>

        <GlassCardContainer className="h-full">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between w-full">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-64" />
            <div className="flex items-center gap-6">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
        </GlassCardContainer>
      </div>
    );
  }

  const renderNodeCard = (
    nodeInfo: NodeInfoResponse | null | undefined,
    nodeId: string | undefined,
    label: string
  ) => {
    if (nodeInfo) {
      return <AnnouncedNodeCard nodeLabel={label} nodeInfo={nodeInfo} />;
    }

    return <UnannouncedNodeCard nodeLabel={label} nodeId={nodeId} />;
  };

  const node1HasInfo = !!node1Info;
  const node2HasInfo = !!node2Info;
  const swapOrder = !node1HasInfo && node2HasInfo;

  const leftCard = swapOrder
    ? renderNodeCard(node2Info, node2Id, "NODE #1")
    : renderNodeCard(node1Info, node1Id, "NODE #1");

  const rightCard = swapOrder
    ? renderNodeCard(node1Info, node1Id, "NODE #2")
    : renderNodeCard(node2Info, node2Id, "NODE #2");

  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{leftCard}{rightCard}</div>;
}
