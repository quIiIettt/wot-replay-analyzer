import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type OptionItem = {
  value: string;
  label: ReactNode;
  disabled: boolean;
};

type CustomSelectProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'map';
  value?: string;
  defaultValue?: string;
  name?: string;
  disabled?: boolean;
  placeholder?: string;
  onValueChange?: (value: string) => void;
};

function collectOptions(children: ReactNode): OptionItem[] {
  const options: OptionItem[] = [];

  const walk = (nodes: ReactNode) => {
    Children.forEach(nodes, (node) => {
      if (!node) return;

      if (isValidElement(node) && node.type === Fragment) {
        walk((node.props as { children?: ReactNode }).children);
        return;
      }

      if (isValidElement(node) && node.type === 'option') {
        const props = node.props as { value?: string; children?: ReactNode; disabled?: boolean };
        const optionValue = props.value ?? (typeof props.children === 'string' ? props.children : '');
        options.push({
          value: String(optionValue),
          label: props.children,
          disabled: Boolean(props.disabled),
        });
      }
    });
  };

  walk(children);
  return options;
}

export default function CustomSelect({
  children,
  className = '',
  variant = 'default',
  value,
  defaultValue,
  name,
  disabled = false,
  placeholder = 'Select option',
  onValueChange,
}: CustomSelectProps) {
  const options = useMemo(() => collectOptions(children), [children]);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? options[0]?.value ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selectedValue = isControlled ? String(value ?? '') : internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isControlled && !options.some((option) => option.value === internalValue)) {
      setInternalValue(options[0]?.value ?? '');
    }
  }, [internalValue, isControlled, options]);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportPadding = 8;
      const topOffset = 6;
      const top = rect.bottom + topOffset;
      const width = rect.width;
      const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - viewportPadding - width);
      const availableHeight = Math.max(140, window.innerHeight - top - viewportPadding);
      const maxHeight = Math.min(232, availableHeight);

      setMenuStyle({
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${maxHeight}px`,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const onTouchStart = (event: TouchEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  const enabledOptions = options.filter((option) => !option.disabled);

  const commitValue = (nextValue: string) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
    setIsOpen(false);
  };

  const openWithIndex = (index: number) => {
    setHighlightedIndex(Math.max(0, Math.min(index, options.length - 1)));
    setIsOpen(true);
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled || options.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        const currentIndex = options.findIndex((option) => option.value === selectedOption?.value);
        openWithIndex(currentIndex >= 0 ? currentIndex : 0);
        return;
      }
      setHighlightedIndex((index) => Math.min(index + 1, options.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        const currentIndex = options.findIndex((option) => option.value === selectedOption?.value);
        openWithIndex(currentIndex >= 0 ? currentIndex : 0);
        return;
      }
      setHighlightedIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isOpen) {
        const currentIndex = options.findIndex((option) => option.value === selectedOption?.value);
        openWithIndex(currentIndex >= 0 ? currentIndex : 0);
        return;
      }
      const option = options[highlightedIndex];
      if (option && !option.disabled) {
        commitValue(option.value);
      }
    }
  };

  const menu =
    isOpen && isMounted
      ? createPortal(
          <div className="custom-select-portal-layer">
            <div ref={menuRef} id={listboxId} role="listbox" style={menuStyle} className={`custom-select-menu custom-select-menu--${variant}`}>
              {options.length === 0 && <div className="custom-select-empty">No options</div>}
              {options.map((option, index) => {
                const isSelected = selectedOption?.value === option.value;
                const isHighlighted = highlightedIndex === index;
                return (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={`custom-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => {
                      if (!option.disabled) {
                        commitValue(option.value);
                      }
                    }}
                  >
                    <span className="custom-select-option-label">{option.label}</span>
                    {isSelected && <span className="custom-select-check">OK</span>}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} data-open={isOpen ? 'true' : 'false'} className={`custom-select-shell custom-select-shell--${variant} ${className}`.trim()}>
      {name && <input type="hidden" name={name} value={selectedOption?.value ?? ''} />}

      <button
        ref={triggerRef}
        type="button"
        className={`custom-select custom-select--${variant}`}
        onClick={() => {
          if (disabled || options.length === 0) return;
          const currentIndex = options.findIndex((option) => option.value === selectedOption?.value);
          setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
          setIsOpen((open) => !open);
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
      >
        <span className={`custom-select-value ${!selectedOption ? 'custom-select-value--placeholder' : ''}`}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="custom-select-icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M4.25 6.25L8 10l3.75-3.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {menu}

      <span className="sr-only" aria-live="polite">
        {enabledOptions.length > 0 ? `${enabledOptions.length} options available.` : 'No selectable options.'}
      </span>
    </div>
  );
}
