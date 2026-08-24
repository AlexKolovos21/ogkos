import { resolveParentEmbedderOrigin } from "@/lib/preview-embedder-origin";

interface RouteTreeNode {
  fullPath?: string;
  children?: RouteTreeNode[] | Record<string, RouteTreeNode>;
}

export function collectRoutePathsFromTree(routeTree: unknown): string[] {
  const paths = new Set<string>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const { fullPath, children } = node as RouteTreeNode;
    if (typeof fullPath === "string" && fullPath.length > 0) paths.add(fullPath);
    if (Array.isArray(children)) {
      children.forEach(visit);
    } else if (children && typeof children === "object") {
      Object.values(children).forEach(visit);
    }
  };
  visit(routeTree);
  return Array.from(paths).sort();
}

interface PreviewHostBridgeOptions {
  navigate: (path: string) => void;
  getRoutePaths: () => string[];
}

type HostMessage =
  | { type: "ogkos-preview-navigate"; path: string }
  | { type: "ogkos-preview-request-routes" };

function isHostMessage(data: unknown): data is HostMessage {
  if (!data || typeof data !== "object") return false;
  const type = (data as { type?: unknown }).type;
  return type === "ogkos-preview-navigate" || type === "ogkos-preview-request-routes";
}

function getAncestorOrigin(): string | null {
  try {
    return window.location.ancestorOrigins?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Bridges this app to a host page that embeds it in an iframe (e.g. a
 * sandbox preview). No-op when the app isn't actually embedded, or when the
 * parent frame's origin can't be validated against the allowed embedder
 * origins in preview-embedder-origin.ts.
 */
export function installPreviewHostBridge({ navigate, getRoutePaths }: PreviewHostBridgeOptions): () => void {
  if (typeof window === "undefined" || window.parent === window) {
    return () => {};
  }

  const parentOrigin = resolveParentEmbedderOrigin(
    false,
    document.referrer,
    getAncestorOrigin(),
    window.location.hostname,
  );
  if (!parentOrigin) return () => {};

  const postToHost = (message: HostMessage | { type: "ogkos-preview-routes"; paths: string[] }) => {
    window.parent.postMessage(message, parentOrigin);
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.source !== window.parent || event.origin !== parentOrigin) return;
    if (!isHostMessage(event.data)) return;
    if (event.data.type === "ogkos-preview-navigate") {
      navigate(event.data.path);
    } else {
      postToHost({ type: "ogkos-preview-routes", paths: getRoutePaths() });
    }
  };

  window.addEventListener("message", handleMessage);
  postToHost({ type: "ogkos-preview-routes", paths: getRoutePaths() });

  return () => window.removeEventListener("message", handleMessage);
}
