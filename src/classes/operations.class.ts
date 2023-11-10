import { Where } from "./where.class";

export class Operations {
    static and(...args: Where[]): Where[] {
        return [...args];
    }

    static or(...args: Where[]): Where[] {
        return [...args];
    }
}