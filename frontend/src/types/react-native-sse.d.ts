declare module 'react-native-sse' {
    export interface EventSourceOptions {
        headers?: Record<string, string>;
        proxy?: string;
        https?: {
            rejectUnauthorized?: boolean;
        };
    }

    export type EventSourceListener = (event: EventSourceEvent) => void;

    export interface EventSourceEvent {
        type: string;
        data?: string | null;
        lastEventId?: string | null;
        url?: string;
    }

    export default class EventSource {
        constructor(url: string, options?: EventSourceOptions);
        addEventListener(type: string, listener: EventSourceListener): void;
        removeAllEventListeners(): void;
        close(): void;
        onopen: ((event: EventSourceEvent) => void) | null;
        onmessage: ((event: EventSourceEvent) => void) | null;
        onerror: ((event: EventSourceEvent) => void) | null;
    }
}
