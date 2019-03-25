import { EvaluationEvent } from "./evaluation";

export function getEvents(url: string, onEvent: (e: EvaluationEvent) => void) {
    var socket = new WebSocket(url);
    
    socket.onmessage = e => onEvent(JSON.parse(e.data));
    socket.onopen = () => socket.send("READY");
}
