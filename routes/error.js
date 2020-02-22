exports.route = { 
    /**
     * @api {GET} /error 抛出标准错误
     * @apiGroup 抛出错误
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 200 OK（只要服务器正常运行，永远返回 200 OK）
     * {
     *   success:false,
     *   code:400,
     *   reason:"这里的提示语应该适合直接展示给用户"
     *   error:"EXAMPLE_ERROR"
     * }
     */
    async get() { 
        // 标准错误
        throw {
            error:'EXAMPLE_ERROR', // 错误类型的枚举值，预留给前端逻辑判断使用
            status: 400, // 这个状态码会成为 code，使用 http 标准错误码
            reason: '这里的提示语应该适合直接展示给用户'
        }
    },

    /**
     * @api {POST} /error 直接抛出错误码
     * @apiGroup 抛出错误
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 200 OK （只要服务器正常运行，永远返回 200 OK）
     * {
     *   success:false,
     *   code:403,
     *   reason:"权限不允许"
     *   error:"FORBIDDEN"
     * }
     */
    async post() {
        // 直接抛出错误码 400、401、403、404、405、408、500、502 
        throw 403
    },

    /**
     * @api {PUT} /error 便捷的抛出 400 错误
     * @apiGroup 抛出错误
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 200 OK（只要服务器正常运行，永远返回 200 OK）
     * {
     *   success:false,
     *   code:400,
     *   reason:"直接展示给用户友好的提示语"
     *   error:"BAD_REQUEST"
     * }
     */
    async put() { 
        // 便捷的抛出 400 错误
        throw '直接展示给用户友好的提示语'
    },

    /**
     * @api {DELETE} /error 一不小心搞砸了
     * @apiGroup 抛出错误
     * @apiDescription 
     * 正常情况下不应该抛出类型为 Error 的异常
     * 如果抛出 Error，会被响应为 500 服务器内部错误
     * 显然这样的错误提示对于用户来说不是很友好
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 200 OK（只要服务器正常运行，永远返回 200 OK）
     * {
     *   success:false,
     *   code:500,
     *   reason:"服务器内部错误（TypeError: zzj.fuck is not a function）"
     *   error:"INTERNAL_SERVER_ERROR"
     * }
     */
    async delete() {
        let zzj = {}
        zzj.fuck('zzf')
    }
}