import { useState, useEffect, useRef } from 'react';

/**
 * useServerCountdown Hook
 * Accurately tracks countdown until targetTimestamp ticking every second.
 * Accounts for device time vs server time skew.
 */
export const useServerCountdown = (targetTimestamp, serverTimestamp, onExpire) => {
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Compute initial delta between server and client clock
  const timeOffset = useRef(
    serverTimestamp ? new Date(serverTimestamp).getTime() - Date.now() : 0
  );

  const calculateTimeRemaining = () => {
    if (!targetTimestamp) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalMs: 0 };
    }

    const now = Date.now() + timeOffset.current;
    const target = new Date(targetTimestamp).getTime();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalMs: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      isExpired: false,
      totalMs: diff,
    };
  };

  const [timeState, setTimeState] = useState(calculateTimeRemaining);

  useEffect(() => {
    // Initial evaluation
    const initial = calculateTimeRemaining();
    setTimeState(initial);

    if (initial.isExpired) {
      if (onExpireRef.current) onExpireRef.current();
      return;
    }

    const intervalId = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeState(remaining);

      if (remaining.isExpired) {
        clearInterval(intervalId);
        if (onExpireRef.current) onExpireRef.current();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [targetTimestamp, serverTimestamp]);

  const pad = (num) => String(num).padStart(2, '0');

  const formattedString = `${pad(timeState.days)}d : ${pad(timeState.hours)}h : ${pad(timeState.minutes)}m : ${pad(timeState.seconds)}s`;

  return {
    ...timeState,
    formattedString,
  };
};

export default useServerCountdown;
