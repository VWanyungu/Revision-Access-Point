import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContext {
  currentSchool: { id: string; name: string } | null;
  currentCourse: { id: string; name: string } | null;
  setCurrentSchool: (school: { id: string; name: string } | null) => void;
  setCurrentCourse: (course: { id: string; name: string } | null) => void;
  clearContext: () => void;
}

const NavigationContext = createContext<NavigationContext | undefined>(undefined);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [currentSchool, setCurrentSchool] = useState<{ id: string; name: string } | null>(null);
  const [currentCourse, setCurrentCourse] = useState<{ id: string; name: string } | null>(null);

  const clearContext = () => {
    setCurrentSchool(null);
    setCurrentCourse(null);
  };

  return (
    <NavigationContext.Provider value={{
      currentSchool,
      currentCourse,
      setCurrentSchool,
      setCurrentCourse,
      clearContext,
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
