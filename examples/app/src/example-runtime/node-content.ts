import type { SvgNodeContentFactory } from '@nodebraid/renderer-svg';

import { acceptExampleData } from './example-data-codec';

/** All imported types use the same application data format; only note changes the visual shape. */
export const createExampleNodeContent: SvgNodeContentFactory = ({ type, size, data, document }) => {
  const value = acceptExampleData(data);
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  root.setAttribute('data-example-node-content', type);
  const shape = document.createElementNS('http://www.w3.org/2000/svg', type === 'note' ? 'ellipse' : 'rect');
  if (type === 'note') {
    shape.setAttribute('cx', String(size.width / 2));
    shape.setAttribute('cy', String(size.height / 2));
    shape.setAttribute('rx', String(size.width / 2));
    shape.setAttribute('ry', String(size.height / 2));
  } else {
    shape.setAttribute('width', String(size.width));
    shape.setAttribute('height', String(size.height));
    shape.setAttribute('rx', '12');
  }
  root.append(shape);
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', String(size.width / 2));
  label.setAttribute('y', String(size.height / 2));
  label.setAttribute('class', 'example-node-label');
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('dominant-baseline', 'middle');
  label.setAttribute('data-example-node-label', '');
  label.textContent = value === null ? type : value.label;
  root.append(label);
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = value === null ? type : `${value.label}\n${value.tags.join(', ')}`;
  root.append(title);
  return root;
};
