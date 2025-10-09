type Handler = (payload: any) => void;
export declare function publish(topic: string, payload: any): void;
export declare function subscribe(topic: string, handler: Handler): () => void;
export declare function topicForAcademy(academyId: string): string;
export declare function topicForUser(userId: string): string;
export declare function topicForFranqueadora(franqueadoraId: string): string;
export {};
//# sourceMappingURL=notify.d.ts.map