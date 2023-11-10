import { Where } from "./where.class";
export declare class Operations {
    static and(...args: Where[]): Where[];
    static or(...args: Where[]): Where[];
}
