import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLongPress } from '@/hooks/useLongPress';
import { motion, AnimatePresence } from 'framer-motion';

interface TruncatedTextProps {
  text: string;
  className?: string;
  as?: React.ElementType;
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({ text, className = "", as: Component = "span" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const longPressEvents = useLongPress({
    onLongPress: openModal,
    onClick: openModal,
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-transparent"
          onClick={closeModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="bg-background text-foreground p-6 rounded-xl shadow-xl max-w-sm w-full border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-light text-sm leading-relaxed text-center break-words">{text}</h3>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <Component
        className={`truncate cursor-pointer ${className}`}
        title={text}
        {...longPressEvents}
      >
        {text}
      </Component>

      {mounted && typeof document !== 'undefined'
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
};
