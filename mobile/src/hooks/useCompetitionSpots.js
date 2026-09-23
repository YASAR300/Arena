import { useState, useEffect } from 'react';
import socket from '../api/socket';

/**
 * Custom hook: useCompetitionSpots
 * Subscribes to Socket.IO real-time spots_updated events for the active competition
 */
export const useCompetitionSpots = (competitionId, initialSpots = {}) => {
  const [spots, setSpots] = useState({
    totalSpots: initialSpots.totalSpots || 0,
    spotsBooked: initialSpots.spotsBooked || 0,
    spotsLeft: initialSpots.spotsLeft || 0,
  });

  // Keep state synced with props if initialSpots changes
  useEffect(() => {
    if (initialSpots.totalSpots !== undefined) {
      setSpots({
        totalSpots: initialSpots.totalSpots,
        spotsBooked: initialSpots.spotsBooked,
        spotsLeft: initialSpots.spotsLeft !== undefined 
          ? initialSpots.spotsLeft 
          : Math.max(0, initialSpots.totalSpots - initialSpots.spotsBooked),
      });
    }
  }, [initialSpots.totalSpots, initialSpots.spotsBooked, initialSpots.spotsLeft]);

  useEffect(() => {
    if (!competitionId) return;

    // Join room for this competition
    socket.emit('join_competition', competitionId);

    const handleSpotsUpdated = (data) => {
      if (data && (data.competitionId === competitionId || !data.competitionId)) {
        setSpots({
          totalSpots: data.totalSpots,
          spotsBooked: data.spotsBooked,
          spotsLeft: data.spotsLeft !== undefined 
            ? data.spotsLeft 
            : Math.max(0, data.totalSpots - data.spotsBooked),
        });
      }
    };

    socket.on('spots_updated', handleSpotsUpdated);

    return () => {
      socket.emit('leave_competition', competitionId);
      socket.off('spots_updated', handleSpotsUpdated);
    };
  }, [competitionId]);

  return spots;
};

export default useCompetitionSpots;
