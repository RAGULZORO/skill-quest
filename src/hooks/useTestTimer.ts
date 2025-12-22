import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTestTimerProps {
  initialTimeInSeconds: number;
  onTimeUp?: () => void;
  autoStart?: boolean;
}

interface UseTestTimerReturn {
  timeRemaining: number;
  formattedTime: string;
  isRunning: boolean;
  isTimeUp: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  percentageRemaining: number;
}

export const useTestTimer = ({
  initialTimeInSeconds,
  onTimeUp,
  autoStart = false,
}: UseTestTimerProps): UseTestTimerReturn => {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeInSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsTimeUp(true);
          onTimeUpRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining]);

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const start = useCallback(() => {
    if (timeRemaining > 0) {
      setIsRunning(true);
    }
  }, [timeRemaining]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setTimeRemaining(initialTimeInSeconds);
    setIsRunning(false);
    setIsTimeUp(false);
  }, [initialTimeInSeconds]);

  const percentageRemaining = (timeRemaining / initialTimeInSeconds) * 100;

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isRunning,
    isTimeUp,
    start,
    pause,
    reset,
    percentageRemaining,
  };
};
