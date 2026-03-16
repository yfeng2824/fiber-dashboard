"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { RustNodeInfo } from "@/lib/types";
import {
  Table,
  Pagination,
  ColumnDef,
  SortState,
  GlassCardContainer,
  CustomSelect,
  SelectOption,
  CopyButton,
  GlassButton,
} from "@/shared/components/ui";
import NodeNetworkMap, { NodeMapData, NodeConnectionData } from "@/shared/components/chart/NodeNetworkMap";

// 节点数据类型
interface NodeData extends Record<string, unknown> {
  nodeId: string;
  nodeName: string;
  channels: number;
  region: string; // 对应服务端的 country_or_region
  capacity: number;
  autoAccept: number;
  lastSeen: string;
}

// 带统计信息的节点类型
interface NodeWithStats extends RustNodeInfo {
  totalChannels: number;
  totalCapacity: number;
  formattedLocation: string;
  formattedLastSeen: string;
}



export const Nodes = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { apiClient, currentNetwork } = useNetwork();
  const searchParams = useSearchParams();
  
  // 检查是否为 Mock 模式
  const isMockMode = searchParams.get('test') === '1';
  
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>(''); // 排序字段，默认为空表示不排序
  const [sortState, setSortState] = useState<SortState>('none'); // 排序方向，默认为 none
  const [selectedRegion, setSelectedRegion] = useState<string>(''); // 选中的 region
  const [isRotating, setIsRotating] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const infoPopoverRef = useRef<HTMLDivElement>(null);
  const [infoPopoverPosition, setInfoPopoverPosition] = useState<{ top: number; left: number } | null>(null);


  // 获取所有 region 选项
  const { data: regionsData } = useQuery({
    queryKey: ['regions', currentNetwork],
    queryFn: async () => {
      return apiClient.getAllRegions();
    },
    staleTime: 600000, // 10分钟缓存
  });

  // 计算服务端分页参数（从 1 开始的前端页码转换为从 0 开始的后端页码）
  const backendPage = currentPage - 1;
  
  // 映射前端 sortKey 到服务端 sort_by 参数
  const getSortBy = (key: string): string | undefined => {
    if (!key) return undefined; // 如果没有排序字段，返回 undefined
    
    switch (key) {
      case 'channels':
        return 'channel_count';
      case 'region':
        return 'region';
      case 'lastSeen':
        return 'last_seen';
      default:
        return undefined;
    }
  };
  
  // 映射 sortState 到服务端 order 参数
  const getOrder = (state: SortState): string | undefined => {
    if (state === 'none') return undefined; // 如果没有排序，返回 undefined
    return state === 'ascending' ? 'asc' : 'desc';
  };

  // 使用分页接口获取节点数据（每次只请求当前页）
  const { data: nodesResponse, isLoading: nodesLoading, dataUpdatedAt: nodesUpdatedAt } = useQuery({
    queryKey: ['nodes', currentNetwork, backendPage, sortKey, sortState, selectedRegion],
    queryFn: async () => {
      const sortBy = getSortBy(sortKey);
      const order = getOrder(sortState);
      
      // 如果有选中的 region，使用 region 筛选接口
      if (selectedRegion) {
        return apiClient.getNodesByRegion(selectedRegion, backendPage, sortBy, order);
      }
      
      // 否则使用普通列表接口
      return apiClient.getActiveNodesByPage(backendPage, sortBy, order);
    },
    refetchInterval: 300000, // 5分钟轮询
  });

  // 为地图视图获取全量节点和通道数据
  const { data: allNodesData, isLoading: allNodesLoading } = useQuery({
    queryKey: ['allNodesForMap', currentNetwork],
    queryFn: async () => {
      const startTime = performance.now();
      console.log('[MapData timing] Start fetching full node and channel data');
      
      const [nodes, channels] = await Promise.all([
        apiClient.fetchAllActiveNodes(),
        apiClient.fetchAllActiveChannels(),
      ]);
      
      const endTime = performance.now();
      console.log(`[MapData timing] Node count: ${nodes.length}, Channel count: ${channels.length}, Duration: ${((endTime - startTime) / 1000).toFixed(2)}s`);
      
      return { nodes, channels };
    },
    refetchInterval: 300000, // 5分钟轮询
  });

  const nodes = nodesResponse?.nodes || [];
  const totalCount = nodesResponse?.total_count ?? 0;
  const isLoading = nodesLoading;

  // 计算最后更新时间
  const lastUpdated = useMemo(() => {
    const latestUpdateTime = nodesUpdatedAt;
    if (latestUpdateTime === 0) return "";
    
    const updateDate = new Date(latestUpdateTime);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - updateDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return "Last updated: Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Last updated: ${minutes} min${minutes > 1 ? 's' : ''} ago`;
    } else {
      const formattedTime = updateDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `Last updated: ${formattedTime}`;
    }
  }, [nodesUpdatedAt]);

  // 当排序、搜索或 region 条件改变时，自动重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [sortKey, sortState, selectedRegion]);

  // 处理节点数据，添加展示字段
  const processedNodes = useMemo((): NodeWithStats[] => {
    return nodes.map(node => {
      const location = node.city && node.country_or_region 
        ? `${node.city}, ${node.country_or_region}` 
        : node.country_or_region || "Unknown";

      const announceDate = new Date(node.announce_timestamp);
      const formattedDate = announceDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return {
        ...node,
        totalChannels: node.channel_count ?? 0,
        totalCapacity: 0,
        formattedLocation: location,
        formattedLastSeen: formattedDate,
      };
    });
  }, [nodes]);

  // 获取所有唯一的国家/地区选项
  const regionCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    if (!allNodesData?.nodes) return counts;

    allNodesData.nodes.forEach((node) => {
      const region = node.country_or_region;
      if (!region) return;
      counts.set(region, (counts.get(region) || 0) + 1);
    });
    return counts;
  }, [allNodesData?.nodes]);

  const locationOptions: SelectOption[] = useMemo(() => {
    if (!regionsData) return [];

    const globalNodeCount = allNodesData?.nodes?.length;
    const allLocationsLabel =
      typeof globalNodeCount === "number"
        ? `All locations (${globalNodeCount})`
        : "All locations";

    const regionOptions = regionsData.map((region) => ({
      label: `${region} (${regionCountMap.get(region) || 0})`,
      value: region,
    }));

    return [
      ...regionOptions,
      { label: allLocationsLabel, value: "" },
    ];
  }, [allNodesData?.nodes?.length, regionsData, regionCountMap]);

  // 直接使用服务端返回的数据（已经按服务端排序）
  const tableData: NodeData[] = useMemo(() => {
    return processedNodes.map(node => ({
      nodeId: node.node_id,
      nodeName: node.node_name,
      channels: node.totalChannels,
      region: node.formattedLocation,
      capacity: node.totalCapacity,
      autoAccept: node.auto_accept_min_ckb_funding_amount / 100000000,
      lastSeen: node.formattedLastSeen,
    }));
  }, [processedNodes]);

  // 计算总页数（使用 total_count 和 page_size）
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 转换为地图数据格式 - 使用全量节点数据
  const mapData: NodeMapData[] = useMemo(() => {
    const startTime = performance.now();
    console.log('[MapData timing] Start calculating mapData');
    
    if (!allNodesData?.nodes) {
      console.log('[MapData timing] No data, returning empty array');
      return [];
    }

    const total = allNodesData.nodes.length;
    const nodesWithLoc = allNodesData.nodes.filter(node => node.loc);
    console.log('[MapData] Filtered nodes without loc:', total - nodesWithLoc.length, 'Total:', total);

    const mapped = nodesWithLoc.map(node => {
      const [lat, lng] = (node.loc || "").split(",").map(coord => parseFloat(coord.trim()));
      return {
        nodeId: node.node_id,
        nodeName: node.node_name,
        city: node.city || "Unknown",
        country: node.country_or_region || "Unknown",
        latitude: lat || 0,
        longitude: lng || 0,
        capacity: 0,
      };
    });

    const nodesWithCoords = mapped.filter(node => node.latitude !== 0 && node.longitude !== 0);
    console.log('[MapData] Filtered nodes with zero coordinates:', mapped.length - nodesWithCoords.length, 'Mapped count:', mapped.length);

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`[MapData timing] mapData calculation completed, duration: ${duration}s, Final node count: ${nodesWithCoords.length}`);

    return nodesWithCoords;
  }, [allNodesData]);

  // 连接数据 - 使用全量通道数据构建连接关系
  const connectionData: NodeConnectionData[] = useMemo(() => {
    if (!allNodesData?.channels || !allNodesData?.nodes) return [];

    const nodeIdSet = new Set(allNodesData.nodes.map(node => node.node_id));
    const totalChannels = allNodesData.channels.length;

    const filteredChannels = allNodesData.channels.filter(channel => {
      // 确保两个节点都存在
      return nodeIdSet.has(channel.node1) && nodeIdSet.has(channel.node2);
    });

    console.log('[ConnectionData] Filtered channels with missing nodes:', totalChannels - filteredChannels.length, 'Total channels:', totalChannels);

    return filteredChannels.map(channel => ({
      fromNodeId: channel.node1,
      toNodeId: channel.node2,
    }));
  }, [allNodesData]);

  // 列定义（只有服务端支持的字段才标记 sortable）
  const columns: ColumnDef<NodeData>[] = [
    {
      key: 'nodeId',
      label: 'Node ID',
      width: 'w-32 lg:flex-1 lg:min-w-32',
      sortable: false,
      render: (value, row) => {
        const nodeId = value as string;
        // 显示前10位...后6位，总共约20个字符
        const displayId = nodeId.length > 20 
          ? `${nodeId.slice(0, 30)}...${nodeId.slice(-20)}`
          : nodeId;
        
        return (
          <div className="flex items-center gap-2 group min-w-0">
            <button
              onClick={() => router.push(`/node/${row.nodeId}`)}
              className="text-primary hover:underline font-mono text-xs block cursor-pointer transition-colors truncate min-w-0 flex-1"
              onMouseEnter={(e) => e.currentTarget.style.color = '#674BDC'}
              onMouseLeave={(e) => e.currentTarget.style.color = ''}
              title={nodeId}
            >
              {displayId}
            </button>
            <CopyButton text={row.nodeId} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
          </div>
        );
      },
    },
    {
      key: "nodeName",
      label: "Node name",
      width: "w-48 md:w-60",
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2 group min-w-0">
          <button
            onClick={() => router.push(`/node/${row.nodeId}`)}
            className="truncate hover:underline text-sm min-w-0 flex-1 cursor-pointer transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.color = '#674BDC'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
            title={String(value)}
          >
            {(value as string) || "-"}
          </button>
          <CopyButton text={value as string} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
        </div>
      ),
    },
    {
      key: "channels",
      label: "Channels",
      width: "w-32",
      sortable: true, // 服务端已支持按 channel_count 排序
    },
    {
      key: "region",
      label: "Location",
      width: "w-36",
      sortable: true, // 对应服务端 sort_by=region (country_or_region)
    },
    // {
    //   key: "autoAccept",
    //   label: "Auto Accept (CKB)",
    //   width: "w-48",
    //   sortable: false,
    //   showInfo: true,
    //   infoTooltip: "The minimum CKB a peer must fund when opening a channel to this node",
    //   render: (value) => formatCompactNumber(value as number),
    // },
    {
      key: "lastSeen",
      label: "Last seen on",
      width: "w-48",
      sortable: true, // 对应服务端 sort_by=last_seen_hour
    },
  ];
  const handleRefresh = () => {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 300);
    // 清除相关查询缓存，触发重新请求
    queryClient.invalidateQueries({ queryKey: ['nodes', currentNetwork] });
  };

  const handleSort = (key: string, state: SortState) => {
    setSortKey(key);
    setSortState(state);
    setCurrentPage(1); // 排序时重置到第一页
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
  };

  useEffect(() => {
    if (!isInfoOpen) return;

    const updateInfoPopoverPosition = () => {
      if (!infoButtonRef.current || typeof window === "undefined") return;

      const rect = infoButtonRef.current.getBoundingClientRect();
      const viewportPadding = 12;
      const maxWidth = Math.min(538, window.innerWidth - viewportPadding * 2);

      let left = rect.left;
      if (left + maxWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - viewportPadding - maxWidth;
      }
      if (left < viewportPadding) {
        left = viewportPadding;
      }

      setInfoPopoverPosition({
        top: rect.bottom + 8,
        left,
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        infoButtonRef.current?.contains(target) ||
        infoPopoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsInfoOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsInfoOpen(false);
      }
    };

    updateInfoPopoverPosition();
    window.addEventListener("resize", updateInfoPopoverPosition);
    window.addEventListener("scroll", updateInfoPopoverPosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", updateInfoPopoverPosition);
      window.removeEventListener("scroll", updateInfoPopoverPosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isInfoOpen]);



  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <span className="type-h2 text-primary">Nodes Overview</span>
          <div className="flex items-center gap-2 md:gap-4">
            {lastUpdated && (
              <span className="type-caption text-secondary">{lastUpdated}</span>
            )}
            <GlassButton
              icon="/refresh.svg"
              alt="refresh"
              onClick={handleRefresh}
              className={isRotating ? "animate-spin" : ""}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <span className="type-body text-tertiary">
            Only announced nodes are shown on this page.
          </span>
          <button
            ref={infoButtonRef}
            type="button"
            className="-m-1 inline-flex h-6 w-6 items-center justify-center cursor-pointer"
            aria-label="Node modes info"
            aria-expanded={isInfoOpen}
            aria-haspopup="dialog"
            onClick={() => setIsInfoOpen((prev) => !prev)}
          >
            <Image src="/info.svg" alt="info" width={16} height={16} />
          </button>
          {isInfoOpen &&
            infoPopoverPosition &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                ref={infoPopoverRef}
                role="dialog"
                className="fixed z-50 max-w-[calc(100vw-24px)] break-words rounded-lg border border-white bg-popover p-3 shadow-[0_4px_6px_0_rgba(0,0,0,0.08)]"
                style={{
                  top: infoPopoverPosition.top,
                  left: infoPopoverPosition.left,
                  width: `min(538px, calc(100vw - 24px))`,
                }}
              >
                <div className="flex flex-col gap-3">
                  <p className="text-primary text-base font-semibold leading-6">
                    Nodes can operate in two modes:
                  </p>
                  <div className="flex flex-col gap-2 type-body">
                    <p className="text-secondary">
                      <span className="font-bold text-purple">Announced nodes</span>{" "}
                      broadcast their node information to the network graph and can appear on this page.
                    </p>
                    <p className="text-secondary">
                      <span className="font-bold text-purple">Unannounced nodes</span>{" "}
                      participate in the network but do not publish their address, so they won&apos;t be listed here.
                    </p>
                  </div>
                  <div className="w-full border-t border-default" />
                  <div className="type-body text-secondary">
                    <p>Nodes are unannounced by default. To become announced, enable</p>
                    <p className="mt-0.5">
                      <span className="type-code rounded-[2px] bg-popover-hover px-0.5 py-[1px]">
                        announce_listening_addr
                      </span>{" "}
                      and add your public address to{" "}
                      <span className="type-code rounded-[2px] bg-popover-hover px-0.5 py-[1px]">
                        announced_addrs
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>,
              document.body
            )}
        </div>
      </div>
      
      {/* Network Map */}
      <GlassCardContainer className="overflow-hidden">
        {allNodesLoading ? (
          <div className="flex items-center justify-center h-[400px] md:h-[600px]">
            <div className="text-muted-foreground">Loading nodes data...</div>
          </div>
        ) : (
          <NodeNetworkMap
            nodes={mapData}
            connections={connectionData}
            height="600px"
            mobileHeight="400px"
            title="Global Nodes Distribution"
            mock={isMockMode}
          />
        )}
      </GlassCardContainer>

      <div className="flex items-center">
        <CustomSelect
          options={locationOptions}
          value={selectedRegion}
          onChange={handleRegionChange}
          placeholder="All locations"
          className="w-[220px]"
          triggerIcon={
            <Image
              src={selectedRegion ? "/filter-1.svg" : "/filter.svg"}
              alt="Filter"
              width={16}
              height={16}
              className="w-4 h-4"
            />
          }
          triggerLabelPrefix={selectedRegion ? "Location: " : ""}
          menuClassName="rounded-lg py-0.5"
          optionClassName="bg-layer"
          showDividerBeforeLastOption
          highlightSelectedTrigger={!!selectedRegion}
        />
      </div>


      <GlassCardContainer className="overflow-x-auto relative min-h-[528px]">
        <Table<NodeData>
          columns={columns}
          data={tableData}
          onSort={handleSort}
          className="min-h-[528px]"
          loading={isLoading}
          loadingText="Loading nodes list..."
          onRowClick={(row) => router.push(`/node/${row.nodeId}`)}
        />

        {!isLoading && tableData.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="mt-4"
          />
        )}

        {!isLoading && tableData.length === 0 && (
          <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-lg font-medium mb-2">No nodes found</div>
              <div className="text-sm">Only announced nodes are shown on this page.</div>
            </div>
          </div>
        )}
      </GlassCardContainer>
    </div>
  );
};
