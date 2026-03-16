"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  SectionHeader,
  PageHeader,
  GlassCardContainer,
  StatusBadge,
  CopyButton,
} from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCompactNumber, hexToDecimal } from "@/lib/utils";
import { formatTimestamp } from "../utils";
import { useChannelData } from "../hooks/useChannelData";
import { ChannelParticipants } from "./ChannelParticipants";
import { ChannelLifecycle } from "./ChannelLifecycle";
import { getAssetColor } from "../utils/assetColors";
import { useNetwork } from "@/features/networks/context/NetworkContext";

export default function ChannelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentNetwork } = useNetwork();
  const initialNetworkRef = useRef(currentNetwork);

  const channelOutpoint = params.channelOutpoint
    ? decodeURIComponent(params.channelOutpoint as string)
    : "";

  // 监听网络切换，如果切换了网络则跳转回 /channels 页面
  useEffect(() => {
    if (initialNetworkRef.current !== currentNetwork) {
      router.push("/channels");
    }
  }, [currentNetwork, router]);

  const {
    channelInfo,
    channelState,
    node1Info,
    node2Info,
    participantsLoading,
    isLoading,
    error,
  } = useChannelData(channelOutpoint);

  // 错误处理
  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Channel Details" bottomSpacing="none" />
        <div className="card-zed p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Channel Not Found</h2>
          <p className="text-secondary">
            The channel with ID {channelOutpoint} could not be found or is not
            accessible.
          </p>
          <p className="text-sm text-secondary mt-2">
            Error: {error?.message || "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Channel Details" bottomSpacing="none" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // 没有数据
  if (!channelInfo || !channelState) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Channel Details" bottomSpacing="none" />
        <div className="card-zed p-8 text-center">
          <p className="text-secondary">No channel data available.</p>
        </div>
      </div>
    );
  }

  const capacityInShannon = hexToDecimal(channelInfo.capacity);
  const capacityInCkb = Number(capacityInShannon) / 100_000_000;
  const assetName = channelInfo.udt_name
    ? channelInfo.udt_name.toUpperCase()
    : "CKB";
  const assetColor = getAssetColor(channelInfo.udt_name || "ckb");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Channel Details" bottomSpacing="none" />
      <GlassCardContainer>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex min-w-0 max-w-full items-center gap-1">
              <h2 className="type-h3 text-primary truncate" title={channelInfo.channel_outpoint}>
                {channelInfo.channel_outpoint}
              </h2>
              <CopyButton text={channelInfo.channel_outpoint} />
            </div>
            <StatusBadge status={channelState.state} />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="type-body text-secondary">Asset:</span>
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 flex-shrink-0"
                  style={{ backgroundColor: assetColor }}
                />
                <span className="type-body text-primary">{assetName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="type-body text-secondary">Capacity:</span>
              <span className="type-body text-primary">
                {formatCompactNumber(capacityInCkb)} CKB
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="type-body text-primary">
              Created on: {formatTimestamp(channelInfo.created_timestamp)}
            </span>
            <span className="type-body text-primary">
              Last committed: {formatTimestamp(channelInfo.commit_timestamp)}
            </span>
          </div>
        </div>
      </GlassCardContainer>

      {/* Nodes */}
      {channelInfo && (
        <>
          <div className="mt-3">
            <SectionHeader title="Channel Participants" />
          </div>
          <ChannelParticipants
            node1Info={node1Info}
            node2Info={node2Info}
            node1Id={channelInfo.node1}
            node2Id={channelInfo.node2}
            isLoading={participantsLoading}
          />
        </>
      )}

      <div className="mt-3">
        <SectionHeader title="Channel Lifecycle" />
      </div>

      <ChannelLifecycle
        channelState={channelState}
        network={currentNetwork}
      />
      
    </div>
  );
}
