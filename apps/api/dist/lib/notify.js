"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publish = publish;
exports.subscribe = subscribe;
exports.topicForAcademy = topicForAcademy;
exports.topicForUser = topicForUser;
exports.topicForFranqueadora = topicForFranqueadora;
const subscribers = new Map();
function publish(topic, payload) {
    const set = subscribers.get(topic);
    if (!set)
        return;
    for (const handler of set) {
        try {
            handler(payload);
        }
        catch { }
    }
}
function subscribe(topic, handler) {
    if (!subscribers.has(topic))
        subscribers.set(topic, new Set());
    subscribers.get(topic).add(handler);
    return () => {
        try {
            subscribers.get(topic)?.delete(handler);
        }
        catch { }
    };
}
function topicForAcademy(academyId) {
    return `academy:${academyId}`;
}
function topicForUser(userId) {
    return `user:${userId}`;
}
function topicForFranqueadora(franqueadoraId) {
    return `franqueadora:${franqueadoraId}`;
}
//# sourceMappingURL=notify.js.map