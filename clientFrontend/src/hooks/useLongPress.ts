import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
}

export const useLongPress = ({ onLongPress, onClick, delay = 600 }: UseLongPressOptions) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const isPressed = useRef(false);
  const startPos = useRef<{ x: number, y: number } | null>(null);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isPressed.current = true;
      setLongPressTriggered(false);
      
      if ('touches' in e) {
        startPos.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else {
        startPos.current = {
          x: (e as React.MouseEvent).clientX,
          y: (e as React.MouseEvent).clientY,
        };
      }

      timerRef.current = setTimeout(() => {
        setLongPressTriggered(true);
        onLongPress();
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (e: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (shouldTriggerClick && isPressed.current && !longPressTriggered && onClick) {
        let isMoveEvent = false;
        if ('changedTouches' in e && startPos.current) {
          const dx = Math.abs(e.changedTouches[0].clientX - startPos.current.x);
          const dy = Math.abs(e.changedTouches[0].clientY - startPos.current.y);
          if (dx > 10 || dy > 10) {
            isMoveEvent = true;
          }
        }
        
        if (!isMoveEvent) {
          onClick();
        }
      }
      setLongPressTriggered(false);
      isPressed.current = false;
      startPos.current = null;
    },
    [onClick, longPressTriggered]
  );

  const cancel = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    clear(e, false);
  }, [clear]);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: cancel,
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    onTouchMove: cancel,
  };
};
