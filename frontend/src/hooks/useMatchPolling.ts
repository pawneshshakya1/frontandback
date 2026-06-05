import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

export const useMatchPolling = (matchId: string, intervalMs: number = 5000) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const isActive = useRef(false);

    const fetchMatch = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await api.get(`/matches/${matchId}`);
            if (isActive.current) {
                setData(res.data.data);
            }
        } catch (err) {
            if (isActive.current) {
                setError(err);
            }
        } finally {
            if (!silent && isActive.current) setLoading(false);
        }
    }, [matchId]);

    useFocusEffect(
        useCallback(() => {
            isActive.current = true;
            fetchMatch();

            const interval = setInterval(() => {
                fetchMatch(true);
            }, intervalMs);

            return () => {
                isActive.current = false;
                clearInterval(interval);
            };
        }, [fetchMatch, intervalMs])
    );

    return { data, loading, error, refetch: fetchMatch };
};
