'use client';

import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { SidebarToggle } from '@/components/custom/sidebar-toggle';

import { useSidebar } from '../ui/sidebar';
import { Logo } from "./logo";

export function ChatHeader({ selectedModelId }: { selectedModelId: string }) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      {(!open || windowWidth < 768) && (
        <div className="flex-row gap-3 flex items-center">
          <Logo size={32}/>
          <SidebarToggle />
        </div>
      )}
    </header>
  );
}
