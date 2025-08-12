import * as htmlToImage from 'html-to-image';
import { Node } from 'reactflow';

export async function exportReactFlowImage({
  wrapper,
  nodes,
  reactFlowInstance,
  setExporting,
  onError,
  fileName = 'reactflow-diagram.png',
  pixelRatio = 8,
}: {
  wrapper: HTMLElement;
  nodes: Node[];
  reactFlowInstance: any;
  setExporting: (v: boolean) => void;
  onError?: (err: any) => void;
  fileName?: string;
  pixelRatio?: number;
}) {
  setExporting(true);
  const originalTransform = reactFlowInstance.toObject();
  const originalWidth = wrapper.style.width;
  const originalHeight = wrapper.style.height;
  try {
    if (!nodes || nodes.length === 0) throw new Error('No nodes to export');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      const x = node.position.x;
      const y = node.position.y;
      const width = (node.width || 150);
      const height = (node.height || 50);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });
    const padding = 20;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    const exportWidth = maxX - minX;
    const exportHeight = maxY - minY;
    wrapper.style.width = exportWidth + 'px';
    wrapper.style.height = exportHeight + 'px';
    reactFlowInstance.setViewport({ x: minX, y: minY, zoom: 1 });
    await new Promise(res => setTimeout(res, 300));
    const dataUrl = await htmlToImage.toPng(wrapper, {
      cacheBust: true,
      pixelRatio,
      backgroundColor: '#fff',
      style: {
        transform: 'none',
        zoom: '1',
      },
      width: exportWidth,
      height: exportHeight,
    });
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    if (onError) onError(err);
    else alert('Failed to export image: ' + err);
  } finally {
    if (originalTransform && originalTransform.viewport) {
      reactFlowInstance.setViewport(originalTransform.viewport);
    }
    if (wrapper) {
      wrapper.style.width = originalWidth;
      wrapper.style.height = originalHeight;
    }
    setExporting(false);
  }
}
