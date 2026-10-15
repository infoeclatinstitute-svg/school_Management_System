import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isNativeApp } from '@/utils/platform';
import { schoolStore } from '@/lib/schoolData';
import { checkForOTAUpdates } from '@/lib/otaUpdater';

export function PullToRefresh() {
  const queryClient = useQueryClient();
  const isNative = isNativeApp();
  const isTouchDevice = isNative || (typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        schoolStore.syncWithCloud(true),
        checkForOTAUpdates(true),
        queryClient.invalidateQueries(),
      ]);
      window.dispatchEvent(new CustomEvent('gc-data-synced'));
      window.dispatchEvent(new Event('storage'));
      await new Promise((res) => setTimeout(res, 600));
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!isTouchDevice) return;
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        setStartY(e.touches[0].clientY);
      } else {
        setStartY(0);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY === 0 || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(diff * 0.45, 90));
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > 60 && !isRefreshing) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
      setStartY(0);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isTouchDevice, startY, pullDistance, isRefreshing, handleRefresh]);

  if (!isTouchDevice || (pullDistance === 0 && !isRefreshing)) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: Math.max(12, pullDistance - 20),
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.95)',
        color: '#60a5fa',
        padding: '0.5rem 1rem',
        borderRadius: '999px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.8rem',
        fontWeight: 700,
        pointerEvents: 'none',
        transition: isRefreshing ? 'top 0.2s ease' : 'none',
      }}
    >
      <span style={{ display: 'inline-block', animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }}>
        🔄
      </span>
      <span>{isRefreshing ? 'Refreshing Cloud Data...' : pullDistance > 60 ? 'Release to Refresh' : 'Pull down to Refresh'}</span>
    </div>
  );
}
