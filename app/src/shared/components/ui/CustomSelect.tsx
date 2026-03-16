'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import './CustomSelect.css';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string; // 未选择时显示的占位文字
  className?: string;
  menuClassName?: string;
  optionClassName?: string;
  showDividerBeforeLastOption?: boolean;
  triggerIcon?: React.ReactNode;
  triggerLabelPrefix?: string;
  highlightSelectedTrigger?: boolean;
}

export function CustomSelect({
  options,
  value: controlledValue,
  onChange,
  defaultValue,
  placeholder,
  className = '',
  menuClassName = '',
  optionClassName = '',
  showDividerBeforeLastOption = false,
  triggerIcon,
  triggerLabelPrefix = '',
  highlightSelectedTrigger = true,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(
    controlledValue || defaultValue || ''
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const value = controlledValue !== undefined ? controlledValue : selectedValue;
  const selectedOption = options.find((opt) => opt.value === value);
  const shouldHighlightTrigger = !!selectedOption && highlightSelectedTrigger;

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (optionValue: string) => {
    if (controlledValue === undefined) {
      setSelectedValue(optionValue);
    }
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative h-10 ${className || 'w-[207px]'}`.trim()}>
      {/* 主按钮 - 始终显示 */}
      <div
        onClick={handleToggle}
        className={`
          w-full h-10 px-3 py-2.5 rounded-[40px] inline-flex justify-center items-center gap-3 cursor-pointer transition-colors
          ${shouldHighlightTrigger ? 'custom-select-trigger-selected bg-purple backdrop-blur-[2px] hover:bg-purple/95' : 'glass-card hover:bg-layer-hover/30'}
        `.trim()}
      >
        <div className="flex justify-start items-center gap-2 min-w-0 flex-1">
          {triggerIcon ? (
            <div data-size="16" className="w-4 h-4 relative overflow-hidden">
              {triggerIcon}
            </div>
          ) : selectedOption?.icon ? (
            <div data-size="16" className="w-4 h-4 relative overflow-hidden">
              {selectedOption.icon}
            </div>
          ) : null}
          <div className={`justify-start type-button1 font-medium font-['Inter'] leading-5 truncate ${
            shouldHighlightTrigger ? 'text-on-color' : 'text-primary'
          }`}>
            {selectedOption
              ? `${triggerLabelPrefix}${selectedOption.label}`
              : placeholder || 'Select...'}
          </div>
        </div>
        <div data-size="16" className={`w-4 h-4 relative overflow-hidden ${shouldHighlightTrigger ? 'custom-select-trigger-caret-selected' : ''}`}>
          <Image 
            src="/arrow.svg" 
            alt="Arrow" 
            width={16} 
            height={16} 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* 下拉菜单 - 绝对定位，完全脱离文档流 */}
      {isOpen && (
        <div
          className={`glass-card bg-popover absolute top-full mt-2 left-0 w-full z-50 rounded-xl flex flex-col ${menuClassName}`}
          style={{ backgroundColor: "var(--surface-popover)" }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFirst = index === 0;
            const isLast = index === options.length - 1;
            const showDivider = showDividerBeforeLastOption && index === options.length - 1;

            return (
              <div key={option.value} className="w-full">
                {showDivider && <div className="w-full border-t border-default" />}
                <div
                  data-property-1="Default"
                  data-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`
                    select-option w-full h-10 px-3 flex items-center justify-between cursor-pointer transition-colors
                    ${isFirst ? 'rounded-tl-xl rounded-tr-xl' : ''}
                    ${isLast ? 'rounded-bl-xl rounded-br-xl' : ''}
                    ${optionClassName}
                    ${isSelected ? 'bg-purple' : ''}
                  `}
                >
                  <div className="flex justify-start items-center gap-2">
                    {option.icon && (
                      <div data-size="16" className="w-4 h-4 relative overflow-hidden">
                        {option.icon}
                      </div>
                    )}
                    <div className={`select-option-label justify-start text-base font-medium font-['Inter'] leading-5 ${isSelected ? 'text-on-color' : 'text-primary'}`}>
                      {option.label}
                    </div>
                  </div>
                  {isSelected && (
                    <Image
                      src="/check.svg"
                      alt="Selected"
                      width={16}
                      height={16}
                      className="select-option-caret w-4 h-4 brightness-0 invert"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
