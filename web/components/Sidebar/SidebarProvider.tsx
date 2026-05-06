import React, { useCallback, useMemo, useState } from 'react';

import { useIsMobile } from '~/hooks/useIsMobile';

import { SidebarContext } from './context';

export type SidebarProviderProps = React.PropsWithChildren;

const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = useCallback(
    () => (isMobile ? setIsMobileOpen((prev) => !prev) : setIsOpen((prev) => !prev)),
    [isMobile],
  );

  const setOpen = useCallback(
    (open: boolean) => (isMobile ? setIsMobileOpen(open) : setIsOpen(open)),
    [isMobile],
  );

  const contextValue = useMemo(
    () => ({ isOpen, isMobileOpen, isMobile, toggleSidebar, setOpen }),
    [isOpen, isMobileOpen, isMobile, toggleSidebar, setOpen],
  );

  return <SidebarContext.Provider value={contextValue}>{children}</SidebarContext.Provider>;
};

export default SidebarProvider;
