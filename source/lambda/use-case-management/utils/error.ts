export default class RequestValidationError extends Error {
    constructor(readonly message: string) {
        super(message);

        this.name = 'CustomHttpError';
    }
}
