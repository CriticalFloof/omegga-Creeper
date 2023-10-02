export class Deferred<T> extends Promise<T> {
    constructor(def = (res, rej) => {}) {
        //Can't subclass a promise without the constructor including an executor callback parameter. why?
        let resolve: (value?: T | PromiseLike<T>) => void;
        let reject: (reason?: any) => void;
        super((res, rej) => {
            def(res, rej); // You also have to call the parameter.
            resolve = res;
            reject = rej;
        });

        this.resolve = resolve;
        this.reject = reject;
    }

    public resolve: (value?: unknown) => void;

    public reject: (reason?: any) => void;
}
