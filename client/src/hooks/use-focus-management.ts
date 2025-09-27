/**
 * Enhanced focus management for accessibility
 */
import { useEffect, useRef } from 'react';

/**
 * Hook to manage focus within a component
 * Automatically returns focus to the previous element when the component unmounts
 */
export function useFocusReturn() {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    // Store the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    return () => {
      // Return focus to the previous element when unmounting
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, []);
  
  return previousFocusRef;
}

/**
 * Hook to manage focus trapping within a component
 * Prevents focus from leaving the component when active
 */
export function useFocusTrapEnhanced(
  isActive: boolean,
  containerRef: React.RefObject<HTMLElement>,
  initialFocusRef?: React.RefObject<HTMLElement>
) {
  const previousFocusRef = useFocusReturn();
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    // Get all focusable elements within the container
    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Set initial focus
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else {
      firstElement.focus();
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Tab key
      if (e.key !== 'Tab') return;
      
      // Trap focus in a loop
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };
    
    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, containerRef, initialFocusRef]);
  
  return previousFocusRef;
}

/**
 * Hook to manage focus within a list of items
 * Allows arrow key navigation between items
 */
export function useListNavigation<T extends HTMLElement = HTMLElement>(
  itemsCount: number,
  options: {
    orientation?: 'vertical' | 'horizontal';
    loop?: boolean;
    onSelect?: (index: number) => void;
  } = {}
) {
  const { orientation = 'vertical', loop = true, onSelect } = options;
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  
  // Update refs array when items count changes
  useEffect(() => {
    itemRefs.current = Array(itemsCount).fill(null);
  }, [itemsCount]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    let newIndex = activeIndex;
    
    switch (e.key) {
      case orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight':
        newIndex = activeIndex + 1;
        if (newIndex >= itemsCount) {
          newIndex = loop ? 0 : itemsCount - 1;
        }
        e.preventDefault();
        break;
        
      case orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft':
        newIndex = activeIndex - 1;
        if (newIndex < 0) {
          newIndex = loop ? itemsCount - 1 : 0;
        }
        e.preventDefault();
        break;
        
      case 'Home':
        newIndex = 0;
        e.preventDefault();
        break;
        
      case 'End':
        newIndex = itemsCount - 1;
        e.preventDefault();
        break;
        
      case 'Enter':
      case ' ':
        onSelect?.(activeIndex);
        e.preventDefault();
        break;
        
      default:
        return;
    }
    
    setActiveIndex(newIndex);
    itemRefs.current[newIndex]?.focus();
  };
  
  return {
    activeIndex,
    setActiveIndex,
    getItemProps: (index: number) => ({
      ref: (el: T | null) => {
        itemRefs.current[index] = el;
      },
      tabIndex: index === activeIndex ? 0 : -1,
      'aria-selected': index === activeIndex,
      onKeyDown: handleKeyDown,
      onClick: () => {
        setActiveIndex(index);
        onSelect?.(index);
      }
    })
  };
}

/**
 * Import useState for the useListNavigation hook
 */
import { useState } from 'react';
