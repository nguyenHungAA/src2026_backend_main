export const createResponse = () => {
    const state = {
        body: undefined,
        cookies: [],
        clearedCookies: [],
        headers: {},
        statusCode: 200,
    };

    const res = {
        locals: { requestId: 'release-test' },
        statusCode: 200,
        status(code) {
            state.statusCode = code;
            this.statusCode = code;
            return this;
        },
        json(body) {
            state.body = body;
            return this;
        },
        send(body) {
            state.body = body;
            return this;
        },
        setHeader(name, value) {
            state.headers[name.toLowerCase()] = String(value);
            return this;
        },
        cookie(name, value, options) {
            state.cookies.push({ name, value, options });
            return this;
        },
        clearCookie(name, options) {
            state.clearedCookies.push({ name, options });
            return this;
        },
    };

    return { res, state };
};

export const createRequest = ({
    body = {},
    headers = {},
    ip = '203.0.113.10',
    method = 'POST',
    path = '/release-test',
    query = {},
    user,
} = {}) => ({
    body,
    headers,
    ip,
    method,
    path,
    query,
    user,
    header(name) {
        return headers[name.toLowerCase()] ?? headers[name];
    },
});

export const nextSpy = () => {
    const state = { called: false };
    return {
        next() { state.called = true; },
        state,
    };
};

export const flushTasks = () => new Promise((resolve) => setImmediate(resolve));
