// React owns each control after mounting; lab renderers only update props.
type Props = { label: string; disabled?: boolean; pressed?: boolean; onClick: () => void; id?: string; className?: string; title?: string; 'aria-label'?: string; [key: `data-${string}`]: string };
declare const React: any;
declare const ReactDOM: any;
declare const antd: any;

function readTheme() {
  const style = getComputedStyle(document.documentElement);
  const value = (name: string) => style.getPropertyValue(name).trim();
  return {
    algorithm: document.documentElement.dataset.bsTheme === 'dark' ? antd.theme.darkAlgorithm : antd.theme.defaultAlgorithm,
    token: {
      fontFamily: value('--font-ui'), colorPrimary: value('--accent'), colorTextLightSolid: value('--accent-contrast'),
      colorText: value('--ink'), colorTextSecondary: value('--ink-muted'), colorBgContainer: value('--surface'),
      colorBgElevated: value('--surface'), colorBorder: value('--border-strong'), colorBgLayout: value('--canvas'),
      borderRadius: parseFloat(value('--radius-md')) * parseFloat(style.fontSize),
      motion: !matchMedia('(prefers-reduced-motion: reduce)').matches,
    },
    components: { Button: { defaultBg: value('--surface'), defaultColor: value('--ink'), defaultBorderColor: value('--border-strong'), primaryShadow: 'none', defaultShadow: 'none' } },
  };
}

const refresh = new Set<() => void>();
new MutationObserver(() => refresh.forEach(render => render())).observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => refresh.forEach(render => render()));

export function mountButton(original: HTMLButtonElement, onClick: () => void) {
  let props: Props = { label: original.textContent ?? '', id: original.id || undefined, className: original.className || undefined,
    disabled: original.disabled, pressed: original.hasAttribute('aria-pressed') ? original.getAttribute('aria-pressed') === 'true' : undefined, onClick };
  for (const attribute of original.attributes) if (attribute.name.startsWith('data-')) props[attribute.name as `data-${string}`] = attribute.value;
  for (const name of ['title', 'aria-label'] as const) if (original.hasAttribute(name)) props[name] = original.getAttribute(name)!;
  const available = typeof React !== 'undefined' && typeof ReactDOM !== 'undefined' && typeof antd !== 'undefined';
  const host = document.createElement('span');
  host.className = 'lab-control';
  const root = available ? ReactDOM.createRoot(host) : null;
  if (root) original.replaceWith(host);
  else original.addEventListener('click', onClick);
  const render = () => {
    if (!root) {
      original.textContent = props.label;
      original.disabled = Boolean(props.disabled);
      original.className = props.className ?? '';
      if (props.pressed !== undefined) original.setAttribute('aria-pressed', String(props.pressed));
      return;
    }
    const { label, pressed, ...attributes } = props;
    attributes.className = attributes.className?.split(' ').filter(name => !['kit-btn', 'primary', 'mini'].includes(name)).join(' ');
    root.render(React.createElement(antd.ConfigProvider, { button: { autoInsertSpace: false }, theme: readTheme() },
      React.createElement(antd.Button, { ...attributes, 'aria-pressed': pressed, type: pressed ? 'primary' : 'default' }, label)));
  };
  refresh.add(render);
  render();
  return { update(next: Partial<Props>) { props = { ...props, ...next }; render(); } };
}

export function seg(host: HTMLElement, items: { label: string; title?: string }[], onPick: (index: number) => void) {
  host.classList.add('lab-seg');
  host.replaceChildren();
  const controls = items.map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    if (item.title) button.title = item.title;
    button.setAttribute('aria-pressed', 'false');
    host.append(button);
    return mountButton(button, () => onPick(index));
  });
  return {
    set(index: number) { controls.forEach((control, i) => control.update({ pressed: i === index })); },
    disable(disabled: boolean) { controls.forEach(control => control.update({ disabled })); },
  };
}

export function mountSelect(original: HTMLSelectElement, onChange: () => void) {
  let value = original.value;
  const options = [...original.options].map(option => ({ value: option.value, label: option.textContent }));
  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined' || typeof antd === 'undefined') {
    original.addEventListener('change', onChange);
    return { get value() { return original.value; } };
  }
  const host = document.createElement('span');
  host.className = 'lab-select';
  const label = original.closest('label')?.querySelector('.ctrl-label > span')?.textContent ?? original.id;
  original.replaceWith(host);
  const root = ReactDOM.createRoot(host);
  const render = () => root.render(React.createElement(antd.ConfigProvider, { theme: readTheme() },
    React.createElement(antd.Select, { id: original.id, 'aria-label': label, options, value,
      onChange(next: string) { value = next; render(); onChange(); }, style: { width: '100%' } })));
  refresh.add(render);
  render();
  return { get value() { return value; } };
}
