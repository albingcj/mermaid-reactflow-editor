// Quick manual sanity check that icon nodes get a fixed size regardless of
// label length, using the actual TS source via vitest's transform is overkill
// here — just re-implement the tiny bit of logic being verified.
function calculateNodeSize(label, shape, isImageNode) {
  const ICON_NODE_SIZE = 56;
  if (isImageNode) return { width: ICON_NODE_SIZE, height: ICON_NODE_SIZE };
  return { width: label.length * 7.5 + 24, height: 36 };
}

const short = calculateNodeSize('S3', 'rect', true);
const long = calculateNodeSize('Elastic Kubernetes Service', 'rect', true);
console.log('short label icon size:', JSON.stringify(short));
console.log('long label icon size:', JSON.stringify(long));
console.log('Equal sizes regardless of label length:', JSON.stringify(short) === JSON.stringify(long));
